import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "../../scripts/migrate";
import { syntheticIds as id } from "../../fixtures/synthetic";
import { ClaimService, PassageService, ReviewService, SourceService, contentHash } from "@/domain/services";
import { resetTestData, testPool } from "../helpers";

let pool: Pool;

beforeAll(async () => {
  await migrate("up");
  pool = testPool();
});
beforeEach(async () => resetTestData(pool));
afterAll(async () => pool.end());

describe("Phase 1 domain foundation", () => {
  it("represents work, edition versions, and physical witnesses separately", async () => {
    const versions = await new SourceService(pool).listVersions("synthetic-primary");
    expect(versions.map((version) => version.version_number)).toEqual([1, 2]);
    expect(versions[1].supersedes_source_edition_id).toBe(versions[0].id);
    expect(versions[0].content_hash).not.toBe(versions[1].content_hash);

    const result = await pool.query<{ work_count: number; edition_count: number; witness_count: number }>(
      `SELECT count(DISTINCT w.id)::int AS work_count,
        count(DISTINCT se.id)::int AS edition_count,
        count(DISTINCT wi.id)::int AS witness_count
       FROM works w JOIN source_editions se ON se.work_id=w.id
       JOIN witnesses wi ON wi.work_id=w.id WHERE w.id=$1`, [id.work]);
    expect(result.rows[0]).toEqual({ work_count: 1, edition_count: 2, witness_count: 2 });
  });

  it("stores each chronology role as an independent assertion", async () => {
    const result = await pool.query<{ role: string; earliest_year: number; latest_year: number }>(
      "SELECT role, earliest_year, latest_year FROM temporal_assertions WHERE target_id=$1 ORDER BY role", [id.event]);
    expect(result.rows).toHaveLength(6);
    expect(result.rows.map((row) => row.role)).toEqual(expect.arrayContaining([
      "event_claimed_date", "composition_date", "witness_date", "edition_date",
      "observation_date", "phenomenon_date"
    ]));
    expect(new Set(result.rows.map((row) => `${row.earliest_year}:${row.latest_year}`)).size).toBe(6);
  });

  it("versions changed source content without overwriting the prior version", async () => {
    const service = new SourceService(pool);
    const next = await service.createVersion({
      priorEditionId: id.sourceV2,
      title: "SYNTHETIC Edition v3",
      contentHash: contentHash("synthetic version three"),
      actor: "test-reviewer"
    });
    expect(next.version_number).toBe(3);
    const versions = await service.listVersions("synthetic-primary");
    expect(versions).toHaveLength(3);
    expect(versions[0].content_hash).toBe("1".repeat(64));
    expect(versions[1].content_hash).toBe("2".repeat(64));
  });

  it("blocks claim publication until an exact locator and approved source rights exist", async () => {
    const sources = new SourceService(pool);
    const passages = new PassageService(pool);
    const claims = new ClaimService(pool);
    const reviews = new ReviewService(pool);
    const work = await sources.createWork({ title: "SYNTHETIC Rights Work", workType: "synthetic", actor: "tester" });
    const source = await sources.createEdition({
      workId: work.id,
      versionGroupKey: "synthetic-rights-test",
      title: "SYNTHETIC unresolved edition",
      editionType: "fixture",
      evidenceRole: "reference_metadata",
      contentHash: contentHash("rights fixture"),
      actor: "tester"
    });
    const passage = await passages.create({
      sourceEditionId: source.id,
      locatorType: "synthetic_section",
      locatorValue: "SYN-RIGHTS-1",
      safeSummary: "Synthetic summary only.",
      actor: "tester"
    });
    const claim = await claims.createDraft({
      passageId: passage.id,
      claimClass: "scholarly_interpretation",
      statement: "SYNTHETIC rights-gate claim.",
      createdBy: "tester"
    });
    await reviews.transition({ objectType: "source_edition", objectId: source.id, to: "draft", reviewer: "reviewer" });
    for (const [objectType, objectId] of [["source_edition", source.id], ["passage", passage.id], ["claim", claim.id]] as const) {
      await reviews.transition({ objectType, objectId, to: "in_review", reviewer: "reviewer" });
      await reviews.transition({ objectType, objectId, to: "approved", reviewer: "reviewer" });
    }
    await expect(reviews.transition({ objectType: "claim", objectId: claim.id, to: "published", reviewer: "reviewer" }))
      .rejects.toThrow(/SOURCE_RIGHTS_UNRESOLVED/);

    await sources.reviewRights({
      sourceEditionId: source.id,
      lane: "yellow",
      publicationAllowed: true,
      fullTextPublicationAllowed: false,
      reviewer: "rights-reviewer",
      note: "Synthetic metadata and summary only."
    });
    await reviews.transition({ objectType: "claim", objectId: claim.id, to: "published", reviewer: "reviewer" });
    const published = await pool.query<{ review_status: string }>("SELECT review_status FROM claims WHERE id=$1", [claim.id]);
    expect(published.rows[0].review_status).toBe("published");

    await expect(pool.query(
      `INSERT INTO claims (claim_class, statement, review_status)
       VALUES ('textual_report','SYNTHETIC locatorless claim','published')`))
      .rejects.toThrow(/CLAIM_LOCATOR_REQUIRED/);
  });

  it("preserves native entity roles, transcript metadata, evidence role, and dependency counts", async () => {
    const roles = await pool.query<{ role_key: string; native_label: string; tradition: string }>(
      "SELECT role_key, native_label, tradition FROM entity_role_assertions WHERE entity_id=$1 ORDER BY role_key", [id.entity]);
    expect(roles.rows).toEqual([
      { role_key: "lawgiver", native_label: "SYN-ROLE-B", tradition: "Synthetic Tradition B" },
      { role_key: "sage", native_label: "SYN-ROLE-A", tradition: "Synthetic Tradition A" }
    ]);

    const segment = await pool.query<{
      start_ms: string; end_ms: string; transcript_provenance: string; rights_lane: string;
      speaker_confidence: string; text_confidence: string;
    }>(`SELECT start_ms::text, end_ms::text, transcript_provenance, rights_lane,
       speaker_confidence::text, text_confidence::text FROM media_segments WHERE id=$1`, [id.mediaSegment]);
    expect(segment.rows[0]).toEqual({
      start_ms: "60000", end_ms: "72000", transcript_provenance: "user_provided",
      rights_lane: "yellow", speaker_confidence: "0.950", text_confidence: "0.900"
    });

    const modernClaim = await pool.query<{ evidence_role: string }>("SELECT evidence_role FROM claims WHERE id=$1", [id.mediaClaim]);
    expect(modernClaim.rows[0].evidence_role).toBe("modern_discourse");
    await expect(pool.query(
      `INSERT INTO claims (passage_id, claim_class, evidence_role, statement)
       VALUES ($1,'scholarly_interpretation','primary_tradition','SYNTHETIC mismatched role')`, [id.mediaPassage]))
      .rejects.toThrow(/EVIDENCE_ROLE_MISMATCH/);
    const counts = await new SourceService(pool).independenceCounts([id.sourceV2, id.mediaSource]);
    expect(counts).toEqual({ editions: 2, works: 2, sourceFamilies: 1 });
  });

  it("keeps audit history append-only and creates exactly ten empty case shells", async () => {
    const cases = await pool.query<{ count: number; attachments: number }>(
      `SELECT count(*)::int AS count,
        (SELECT count(*)::int FROM case_file_objects) AS attachments FROM case_files`);
    expect(cases.rows[0]).toEqual({ count: 10, attachments: 0 });
    await pool.query(
      `INSERT INTO audit_events (object_type, object_id, action, actor)
       VALUES ('work',$1,'test_event','tester')`, [id.work]);
    await expect(pool.query("UPDATE audit_events SET action='tampered' WHERE object_id=$1", [id.work]))
      .rejects.toThrow(/AUDIT_APPEND_ONLY/);
  });
});
