export const reviewStatuses = [
  "inbox", "fetched", "parsed", "draft", "in_review", "approved",
  "published", "superseded", "retracted", "blocked"
] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export const rightsLanes = ["green", "yellow", "red"] as const;
export type RightsLane = (typeof rightsLanes)[number];

export const sourceEvidenceRoles = [
  "primary_tradition", "physical_scientific", "academic_interpretation",
  "modern_discourse", "reference_metadata"
] as const;
export type SourceEvidenceRole = (typeof sourceEvidenceRoles)[number];

export const temporalRoles = [
  "event_claimed_date", "composition_date", "witness_date", "edition_date",
  "observation_date", "phenomenon_date", "active_interval"
] as const;
export type TemporalRole = (typeof temporalRoles)[number];

export const evidenceStances = ["supports", "challenges", "contextualizes", "ambiguous", "cannot_test"] as const;
export type EvidenceStance = (typeof evidenceStances)[number];

export type Confidence = "very_low" | "low" | "medium" | "high" | "very_high";

export interface WorkRecord {
  id: string;
  title: string;
  work_type: string;
  tradition: string | null;
  culture: string | null;
}

export interface SourceEditionRecord {
  id: string;
  work_id: string | null;
  version_group_key: string;
  version_number: number;
  supersedes_source_edition_id: string | null;
  title: string;
  evidence_role: SourceEvidenceRole;
  rights_lane: RightsLane;
  publication_allowed: boolean;
  full_text_publication_allowed: boolean;
  content_hash: string;
  independence_cluster_key: string | null;
  review_status: ReviewStatus;
}

export interface PassageRecord {
  id: string;
  source_edition_id: string;
  locator_type: string;
  locator_value: string;
  review_status: ReviewStatus;
}

export interface ClaimRecord {
  id: string;
  passage_id: string | null;
  claim_class: string;
  evidence_role: SourceEvidenceRole;
  statement: string;
  review_status: ReviewStatus;
}
