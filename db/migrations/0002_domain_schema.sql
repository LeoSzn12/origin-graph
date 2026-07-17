CREATE TYPE review_status AS ENUM (
  'inbox', 'fetched', 'parsed', 'draft', 'in_review', 'approved',
  'published', 'superseded', 'retracted', 'blocked'
);
CREATE TYPE rights_lane AS ENUM ('green', 'yellow', 'red');
CREATE TYPE confidence_level AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');
CREATE TYPE evidence_stance AS ENUM ('supports', 'challenges', 'contextualizes', 'ambiguous', 'cannot_test');
CREATE TYPE temporal_role AS ENUM (
  'event_claimed_date', 'composition_date', 'witness_date', 'edition_date',
  'observation_date', 'phenomenon_date', 'active_interval'
);
CREATE TYPE source_evidence_role AS ENUM (
  'primary_tradition', 'physical_scientific', 'academic_interpretation',
  'modern_discourse', 'reference_metadata'
);

CREATE TABLE works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  alternate_titles jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(alternate_titles) = 'array'),
  work_type text NOT NULL,
  tradition text,
  culture text,
  original_language text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE canonical_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  tradition text NOT NULL,
  community text,
  status text NOT NULL,
  context_note text,
  source_url text,
  UNIQUE NULLS NOT DISTINCT (work_id, tradition, community, status)
);

CREATE TABLE source_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid REFERENCES works(id),
  version_group_key text NOT NULL,
  version_number integer NOT NULL DEFAULT 1 CHECK (version_number > 0),
  supersedes_source_edition_id uuid REFERENCES source_editions(id),
  title text NOT NULL,
  edition_type text NOT NULL,
  evidence_role source_evidence_role NOT NULL DEFAULT 'reference_metadata',
  language text,
  editor_names jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(editor_names) = 'array'),
  translator_names jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(translator_names) = 'array'),
  publisher text,
  publication_date text,
  stable_identifier text,
  canonical_url text,
  license_name text,
  license_url text,
  rights_lane rights_lane NOT NULL DEFAULT 'yellow',
  rights_note text,
  attribution_text text,
  rights_reviewed_at timestamptz,
  rights_reviewed_by text,
  publication_allowed boolean NOT NULL DEFAULT false,
  full_text_publication_allowed boolean NOT NULL DEFAULT false,
  content_hash text NOT NULL,
  independence_cluster_key text,
  adapter_key text,
  adapter_version text,
  parser_version text,
  raw_snapshot_uri text,
  review_status review_status NOT NULL DEFAULT 'inbox',
  upstream_modified_at timestamptz,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_group_key, version_number),
  UNIQUE (version_group_key, content_hash),
  CHECK (rights_lane <> 'red' OR NOT publication_allowed),
  CHECK (NOT full_text_publication_allowed OR publication_allowed),
  CHECK (rights_reviewed_at IS NOT NULL OR (NOT publication_allowed AND NOT full_text_publication_allowed)),
  CHECK (version_number = 1 OR supersedes_source_edition_id IS NOT NULL)
);

CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preferred_name text NOT NULL,
  names jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(names) = 'array'),
  place_kind text NOT NULL,
  geometry geometry(Geometry, 4326),
  uncertainty_type text NOT NULL DEFAULT 'unknown',
  uncertainty_note text,
  sensitive boolean NOT NULL DEFAULT false,
  public_geometry geometry(Geometry, 4326),
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(external_ids) = 'object'),
  review_status review_status NOT NULL DEFAULT 'draft',
  CHECK (NOT sensitive OR public_geometry IS NULL OR NOT ST_Equals(geometry, public_geometry))
);

CREATE TABLE witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid REFERENCES works(id),
  source_edition_id uuid REFERENCES source_editions(id),
  witness_type text NOT NULL,
  repository_name text,
  repository_identifier text,
  material text,
  findspot_place_id uuid REFERENCES places(id),
  current_place_id uuid REFERENCES places(id),
  description text,
  image_rights_note text,
  review_status review_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_edition_id uuid NOT NULL REFERENCES source_editions(id) ON DELETE CASCADE,
  witness_id uuid REFERENCES witnesses(id),
  parent_passage_id uuid REFERENCES passages(id),
  locator_type text NOT NULL CHECK (btrim(locator_type) <> ''),
  locator_value text NOT NULL CHECK (btrim(locator_value) <> ''),
  original_text text,
  transliteration text,
  translation_text text,
  safe_summary text,
  text_hash text NOT NULL,
  damaged boolean NOT NULL DEFAULT false,
  reconstructed boolean NOT NULL DEFAULT false,
  extraction_confidence numeric(4,3) CHECK (extraction_confidence BETWEEN 0 AND 1),
  review_status review_status NOT NULL DEFAULT 'draft',
  UNIQUE (source_edition_id, locator_type, locator_value, text_hash)
);

CREATE TABLE entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  preferred_name text NOT NULL,
  names jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(names) = 'array'),
  description text,
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(external_ids) = 'object'),
  review_status review_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type text NOT NULL,
  description text,
  historicity_status text,
  review_status review_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE motifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  definition text NOT NULL,
  broader_motif_id uuid REFERENCES motifs(id),
  review_status review_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id uuid REFERENCES passages(id),
  claim_class text NOT NULL,
  evidence_role source_evidence_role NOT NULL DEFAULT 'reference_metadata',
  statement text NOT NULL CHECK (btrim(statement) <> ''),
  subject_entity_id uuid REFERENCES entities(id),
  predicate text,
  object_entity_id uuid REFERENCES entities(id),
  directness smallint NOT NULL DEFAULT 2 CHECK (directness BETWEEN 0 AND 4),
  interpretation_level smallint NOT NULL DEFAULT 0 CHECK (interpretation_level BETWEEN 0 AND 4),
  confidence confidence_level NOT NULL DEFAULT 'medium',
  uncertainty_note text,
  review_status review_status NOT NULL DEFAULT 'draft',
  created_by text,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (review_status <> 'published' OR passage_id IS NOT NULL)
);

CREATE TABLE entity_role_assertions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  native_label text,
  tradition text NOT NULL,
  community text,
  source_claim_id uuid NOT NULL REFERENCES claims(id),
  confidence confidence_level NOT NULL DEFAULT 'medium',
  review_status review_status NOT NULL DEFAULT 'draft',
  UNIQUE NULLS NOT DISTINCT (entity_id, role_key, tradition, community, source_claim_id)
);

CREATE TABLE media_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id uuid NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  speaker_entity_id uuid REFERENCES entities(id),
  start_ms bigint NOT NULL CHECK (start_ms >= 0),
  end_ms bigint NOT NULL CHECK (end_ms >= start_ms),
  transcript_provenance text NOT NULL DEFAULT 'unknown' CHECK (
    transcript_provenance IN ('official', 'creator_provided', 'user_provided', 'automated', 'edited', 'unknown')
  ),
  speaker_confidence numeric(4,3) CHECK (speaker_confidence BETWEEN 0 AND 1),
  text_confidence numeric(4,3) CHECK (text_confidence BETWEEN 0 AND 1),
  rights_lane rights_lane NOT NULL DEFAULT 'yellow',
  review_status review_status NOT NULL DEFAULT 'draft',
  UNIQUE NULLS NOT DISTINCT (passage_id, start_ms, end_ms, speaker_entity_id)
);

CREATE TABLE temporal_assertions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  role temporal_role NOT NULL,
  earliest_year integer,
  latest_year integer,
  display_label text NOT NULL,
  era_system text NOT NULL,
  precision text NOT NULL,
  dating_method text,
  chronology_model text,
  calibrated boolean,
  confidence confidence_level NOT NULL DEFAULT 'medium',
  source_claim_id uuid REFERENCES claims(id),
  note text,
  review_status review_status NOT NULL DEFAULT 'draft',
  CHECK (earliest_year IS NULL OR latest_year IS NULL OR earliest_year <= latest_year),
  CHECK (role <> 'phenomenon_date' OR dating_method IS NOT NULL)
);

CREATE TABLE connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type text NOT NULL,
  from_id uuid NOT NULL,
  to_type text NOT NULL,
  to_id uuid NOT NULL,
  connection_type text NOT NULL,
  direction_note text,
  explanation text NOT NULL CHECK (btrim(explanation) <> ''),
  confidence confidence_level NOT NULL DEFAULT 'medium',
  review_status review_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_type <> to_type OR from_id <> to_id)
);

CREATE TABLE connection_source_claims (
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES claims(id),
  PRIMARY KEY (connection_id, claim_id)
);

CREATE TABLE source_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_source_id uuid NOT NULL REFERENCES source_editions(id) ON DELETE CASCADE,
  to_source_id uuid NOT NULL REFERENCES source_editions(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (
    relationship_type IN ('cites', 'translates', 'copies', 'summarizes', 'republishes', 'derives_data_from', 'disputes', 'corrects')
  ),
  explanation text NOT NULL,
  confidence confidence_level NOT NULL DEFAULT 'medium',
  review_status review_status NOT NULL DEFAULT 'draft',
  UNIQUE (from_source_id, to_source_id, relationship_type),
  CHECK (from_source_id <> to_source_id)
);

CREATE TABLE hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  proposition text NOT NULL,
  scope text NOT NULL,
  definitions jsonb NOT NULL DEFAULT '{}'::jsonb,
  predicted_observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  falsifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  state text NOT NULL DEFAULT 'draft',
  triangulation_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  private_workspace boolean NOT NULL DEFAULT true,
  review_status review_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(triangulation_profile) = 'object')
);

CREATE TABLE evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id uuid NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES claims(id),
  stance evidence_stance NOT NULL,
  evidence_domain text NOT NULL,
  independence_cluster text,
  source_fidelity smallint CHECK (source_fidelity BETWEEN 0 AND 4),
  directness smallint CHECK (directness BETWEEN 0 AND 4),
  chronological_fit smallint CHECK (chronological_fit BETWEEN 0 AND 4),
  geographic_fit smallint CHECK (geographic_fit BETWEEN 0 AND 4),
  methodological_transparency smallint CHECK (methodological_transparency BETWEEN 0 AND 4),
  reviewer_note text,
  review_status review_status NOT NULL DEFAULT 'draft',
  UNIQUE (hypothesis_id, claim_id)
);

CREATE TABLE case_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  core_question text NOT NULL,
  summary text,
  scope text,
  status text NOT NULL DEFAULT 'draft',
  published_revision integer NOT NULL DEFAULT 0,
  review_status review_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE case_file_objects (
  case_file_id uuid NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (case_file_id, object_type, object_id)
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('request_changes', 'approve', 'reject', 'publish', 'retract')),
  reviewer text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  action text NOT NULL,
  actor text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE text_embeddings (
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  embedding vector(1536),
  model_key text NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (object_type, object_id, model_key)
);

CREATE INDEX source_editions_status_idx ON source_editions (review_status, rights_lane);
CREATE INDEX source_editions_role_idx ON source_editions (evidence_role, review_status);
CREATE INDEX source_editions_identifier_idx ON source_editions (stable_identifier) WHERE stable_identifier IS NOT NULL;
CREATE INDEX source_editions_independence_idx ON source_editions (independence_cluster_key);
CREATE INDEX passages_source_idx ON passages (source_edition_id, review_status);
CREATE INDEX claims_status_idx ON claims (review_status, claim_class);
CREATE INDEX claims_role_idx ON claims (evidence_role, review_status);
CREATE INDEX temporal_assertions_range_idx ON temporal_assertions (earliest_year, latest_year, role);
CREATE INDEX temporal_assertions_target_idx ON temporal_assertions (target_type, target_id, role);
CREATE INDEX places_geom_idx ON places USING gist (geometry);
CREATE INDEX places_public_geom_idx ON places USING gist (public_geometry);
CREATE INDEX connections_from_idx ON connections (from_type, from_id, connection_type);
CREATE INDEX connections_to_idx ON connections (to_type, to_id, connection_type);
CREATE INDEX source_relationships_from_idx ON source_relationships (from_source_id, relationship_type);
CREATE INDEX source_relationships_to_idx ON source_relationships (to_source_id, relationship_type);
CREATE INDEX evidence_hypothesis_idx ON evidence_items (hypothesis_id, stance);
CREATE INDEX entity_roles_entity_idx ON entity_role_assertions (entity_id, role_key, review_status);
CREATE INDEX media_segments_passage_idx ON media_segments (passage_id, start_ms);
CREATE INDEX audit_object_idx ON audit_events (object_type, object_id, created_at DESC);
