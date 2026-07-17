import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import type { RightsLane, SourceEditionRecord, SourceEvidenceRole, WorkRecord } from "@/domain/types";
import { evidenceRoleSchema, nonEmpty, rightsLaneSchema, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

export function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export class SourceService {
  constructor(private readonly pool: Pool) {}

  async createWork(input: {
    title: string;
    workType: string;
    tradition?: string;
    culture?: string;
    originalLanguage?: string;
    description?: string;
    actor?: string;
  }): Promise<WorkRecord> {
    const title = nonEmpty.parse(input.title);
    const workType = nonEmpty.parse(input.workType);
    return transaction(this.pool, async (client) => {
      const [work] = await rows<WorkRecord>(client,
        `INSERT INTO works (title, work_type, tradition, culture, original_language, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, work_type, tradition, culture`,
        [title, workType, input.tradition ?? null, input.culture ?? null, input.originalLanguage ?? null, input.description ?? null]
      );
      await appendAudit(client, { objectType: "work", objectId: work.id, action: "created", actor: input.actor, after: work });
      return work;
    });
  }

  async createEdition(input: {
    workId?: string;
    versionGroupKey: string;
    title: string;
    editionType: string;
    evidenceRole: SourceEvidenceRole;
    contentHash: string;
    stableIdentifier?: string;
    language?: string;
    rightsLane?: RightsLane;
    independenceClusterKey?: string;
    adapterKey?: string;
    adapterVersion?: string;
    parserVersion?: string;
    actor?: string;
  }): Promise<SourceEditionRecord> {
    if (input.workId) uuidSchema.parse(input.workId);
    const values = {
      versionGroupKey: nonEmpty.parse(input.versionGroupKey),
      title: nonEmpty.parse(input.title),
      editionType: nonEmpty.parse(input.editionType),
      evidenceRole: evidenceRoleSchema.parse(input.evidenceRole),
      rightsLane: rightsLaneSchema.parse(input.rightsLane ?? "yellow")
    };
    return transaction(this.pool, async (client) => {
      const [edition] = await rows<SourceEditionRecord>(client,
        `INSERT INTO source_editions (
           work_id, version_group_key, title, edition_type, evidence_role, content_hash,
           stable_identifier, language, rights_lane, independence_cluster_key,
           adapter_key, adapter_version, parser_version
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id, work_id, version_group_key, version_number, supersedes_source_edition_id,
           title, evidence_role, rights_lane, publication_allowed, full_text_publication_allowed,
           content_hash, independence_cluster_key, review_status`,
        [input.workId ?? null, values.versionGroupKey, values.title, values.editionType, values.evidenceRole,
          input.contentHash, input.stableIdentifier ?? null, input.language ?? null, values.rightsLane,
          input.independenceClusterKey ?? null, input.adapterKey ?? null, input.adapterVersion ?? null,
          input.parserVersion ?? null]
      );
      await appendAudit(client, { objectType: "source_edition", objectId: edition.id, action: "created", actor: input.actor, after: edition });
      return edition;
    });
  }

  async createVersion(input: {
    priorEditionId: string;
    contentHash: string;
    title?: string;
    actor?: string;
  }): Promise<SourceEditionRecord> {
    uuidSchema.parse(input.priorEditionId);
    return transaction(this.pool, async (client) => {
      const [prior] = await rows<SourceEditionRecord & Record<string, unknown>>(client,
        "SELECT * FROM source_editions WHERE id = $1 FOR UPDATE", [input.priorEditionId]);
      if (!prior) throw new Error("Source edition not found");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [prior.version_group_key]);
      const [current] = await rows<{ max: number }>(client,
        "SELECT max(version_number)::int AS max FROM source_editions WHERE version_group_key = $1",
        [prior.version_group_key]);
      const nextVersion = current.max + 1;
      const [edition] = await rows<SourceEditionRecord>(client,
        `INSERT INTO source_editions (
          work_id, version_group_key, version_number, supersedes_source_edition_id, title, edition_type,
          evidence_role, language, editor_names, translator_names, publisher, publication_date,
          stable_identifier, canonical_url, license_name, license_url, rights_lane, rights_note,
          attribution_text, content_hash, independence_cluster_key, adapter_key, adapter_version,
          parser_version, review_status
        ) SELECT work_id, version_group_key, $2, id, $3, edition_type, evidence_role, language,
          editor_names, translator_names, publisher, publication_date, stable_identifier, canonical_url,
          license_name, license_url, rights_lane, rights_note, attribution_text, $4,
          independence_cluster_key, adapter_key, adapter_version, parser_version, 'inbox'
        FROM source_editions WHERE id = $1
        RETURNING id, work_id, version_group_key, version_number, supersedes_source_edition_id,
          title, evidence_role, rights_lane, publication_allowed, full_text_publication_allowed,
          content_hash, independence_cluster_key, review_status`,
        [input.priorEditionId, nextVersion, input.title ?? prior.title, input.contentHash]
      );
      await client.query("UPDATE source_editions SET review_status = 'superseded', updated_at = now() WHERE id = $1", [prior.id]);
      await appendAudit(client, { objectType: "source_edition", objectId: prior.id, action: "superseded", actor: input.actor, before: prior, after: { replacedBy: edition.id } });
      await appendAudit(client, { objectType: "source_edition", objectId: edition.id, action: "version_created", actor: input.actor, after: edition });
      return edition;
    });
  }

  async reviewRights(input: {
    sourceEditionId: string;
    lane: RightsLane;
    publicationAllowed: boolean;
    fullTextPublicationAllowed: boolean;
    reviewer: string;
    note?: string;
    licenseName?: string;
    licenseUrl?: string;
    attributionText?: string;
  }): Promise<SourceEditionRecord> {
    uuidSchema.parse(input.sourceEditionId);
    rightsLaneSchema.parse(input.lane);
    nonEmpty.parse(input.reviewer);
    if (input.lane === "red" && input.publicationAllowed) throw new Error("Red-lane sources cannot be approved for publication");
    if (input.fullTextPublicationAllowed && !input.publicationAllowed) throw new Error("Full-text permission requires publication permission");
    return transaction(this.pool, async (client) => {
      const [before] = await rows<SourceEditionRecord>(client, "SELECT * FROM source_editions WHERE id = $1 FOR UPDATE", [input.sourceEditionId]);
      if (!before) throw new Error("Source edition not found");
      const [after] = await rows<SourceEditionRecord>(client,
        `UPDATE source_editions SET rights_lane=$2, publication_allowed=$3,
           full_text_publication_allowed=$4, rights_reviewed_at=now(), rights_reviewed_by=$5,
           rights_note=$6, license_name=COALESCE($7, license_name), license_url=COALESCE($8, license_url),
           attribution_text=COALESCE($9, attribution_text), updated_at=now()
         WHERE id=$1
         RETURNING id, work_id, version_group_key, version_number, supersedes_source_edition_id,
           title, evidence_role, rights_lane, publication_allowed, full_text_publication_allowed,
           content_hash, independence_cluster_key, review_status`,
        [input.sourceEditionId, input.lane, input.publicationAllowed, input.fullTextPublicationAllowed,
          input.reviewer, input.note ?? null, input.licenseName ?? null, input.licenseUrl ?? null,
          input.attributionText ?? null]
      );
      await appendAudit(client, { objectType: "source_edition", objectId: after.id, action: "rights_reviewed", actor: input.reviewer, before, after });
      return after;
    });
  }

  async listVersions(versionGroupKey: string): Promise<SourceEditionRecord[]> {
    return rows<SourceEditionRecord>(this.pool,
      `SELECT id, work_id, version_group_key, version_number, supersedes_source_edition_id,
        title, evidence_role, rights_lane, publication_allowed, full_text_publication_allowed,
        content_hash, independence_cluster_key, review_status
       FROM source_editions WHERE version_group_key = $1 ORDER BY version_number`,
      [nonEmpty.parse(versionGroupKey)]);
  }

  async relate(input: {
    fromSourceId: string;
    toSourceId: string;
    relationshipType: string;
    explanation: string;
    actor?: string;
  }): Promise<string> {
    uuidSchema.parse(input.fromSourceId);
    uuidSchema.parse(input.toSourceId);
    return transaction(this.pool, async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO source_relationships (from_source_id, to_source_id, relationship_type, explanation)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [input.fromSourceId, input.toSourceId, input.relationshipType, nonEmpty.parse(input.explanation)]);
      const id = result.rows[0].id;
      await appendAudit(client, { objectType: "source_relationship", objectId: id, action: "created", actor: input.actor, after: input });
      return id;
    });
  }

  async independenceCounts(sourceEditionIds: string[]): Promise<{
    editions: number;
    works: number;
    sourceFamilies: number;
  }> {
    if (sourceEditionIds.length === 0) return { editions: 0, works: 0, sourceFamilies: 0 };
    sourceEditionIds.forEach((id) => uuidSchema.parse(id));
    const [result] = await rows<{ editions: number; works: number; source_families: number }>(this.pool,
      `SELECT count(DISTINCT id)::int AS editions,
        count(DISTINCT work_id)::int AS works,
        count(DISTINCT COALESCE(independence_cluster_key, id::text))::int AS source_families
       FROM source_editions WHERE id = ANY($1::uuid[])`, [sourceEditionIds]);
    return { editions: result.editions, works: result.works, sourceFamilies: result.source_families };
  }
}
