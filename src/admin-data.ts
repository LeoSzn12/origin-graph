import { db, rows } from "@/db";
import type { ReviewStatus, SourceEvidenceRole, TemporalRole } from "@/domain/types";

export interface AdminSummary {
  counts: { table_name: string; row_count: number }[];
  sourceEditions: {
    id: string;
    title: string;
    version_group_key: string;
    version_number: number;
    evidence_role: SourceEvidenceRole;
    rights_lane: string;
    review_status: ReviewStatus;
  }[];
  temporalAssertions: {
    id: string;
    role: TemporalRole;
    display_label: string;
    earliest_year: number | null;
    latest_year: number | null;
    target_title: string;
  }[];
  entityRoles: {
    id: string;
    preferred_name: string;
    role_key: string;
    native_label: string | null;
    tradition: string;
    review_status: ReviewStatus;
  }[];
  mediaSegments: {
    id: string;
    source_title: string;
    speaker_name: string | null;
    start_ms: string;
    end_ms: string;
    transcript_provenance: string;
    rights_lane: string;
    review_status: ReviewStatus;
  }[];
  caseFiles: { slug: string; title: string; status: string; review_status: ReviewStatus }[];
}

export async function getAdminSummary(): Promise<AdminSummary> {
  const pool = db();
  const [countRows, sourceEditions, temporalAssertions, entityRoles, mediaSegments, caseFiles] = await Promise.all([
    rows<{ table_name: string; row_count: string }>(pool,
      "SELECT table_name, row_count FROM admin_table_counts ORDER BY table_name"),
    rows<AdminSummary["sourceEditions"][number]>(pool,
      `SELECT id, title, version_group_key, version_number, evidence_role, rights_lane, review_status
       FROM source_editions ORDER BY version_group_key, version_number`),
    rows<AdminSummary["temporalAssertions"][number]>(pool,
      `SELECT ta.id, ta.role, ta.display_label, ta.earliest_year, ta.latest_year,
        COALESCE(e.title, ta.target_type || ':' || ta.target_id::text) AS target_title
       FROM temporal_assertions ta LEFT JOIN events e ON ta.target_type='event' AND e.id=ta.target_id
       ORDER BY ta.role, ta.earliest_year LIMIT 50`),
    rows<AdminSummary["entityRoles"][number]>(pool,
      `SELECT era.id, e.preferred_name, era.role_key, era.native_label, era.tradition, era.review_status
       FROM entity_role_assertions era JOIN entities e ON e.id=era.entity_id
       ORDER BY e.preferred_name, era.tradition`),
    rows<AdminSummary["mediaSegments"][number]>(pool,
      `SELECT ms.id, se.title AS source_title, e.preferred_name AS speaker_name,
        ms.start_ms::text, ms.end_ms::text, ms.transcript_provenance, ms.rights_lane, ms.review_status
       FROM media_segments ms JOIN passages p ON p.id=ms.passage_id
       JOIN source_editions se ON se.id=p.source_edition_id
       LEFT JOIN entities e ON e.id=ms.speaker_entity_id ORDER BY ms.start_ms`),
    rows<AdminSummary["caseFiles"][number]>(pool,
      "SELECT slug, title, status, review_status FROM case_files ORDER BY title")
  ]);
  return {
    counts: countRows.map((row) => ({ ...row, row_count: Number(row.row_count) })),
    sourceEditions,
    temporalAssertions,
    entityRoles,
    mediaSegments,
    caseFiles
  };
}
