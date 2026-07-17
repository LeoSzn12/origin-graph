CREATE TYPE ingestion_status AS ENUM (
  'registered', 'fetching', 'fetched', 'rights_check_required', 'parsing',
  'parsed_with_warnings', 'draft_objects_created', 'human_review', 'approved',
  'published', 'failed', 'blocked'
);
CREATE TYPE source_input_type AS ENUM (
  'url', 'doi', 'upload', 'dataset_id', 'book_citation', 'manual_note',
  'transcript_upload', 'media_reference'
);
CREATE TYPE job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

ALTER TABLE source_editions
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN storage_visibility text NOT NULL DEFAULT 'private'
    CHECK (storage_visibility IN ('private', 'metadata_only', 'public'));

ALTER TABLE passages
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(original_text,'') || ' ' || coalesce(transliteration,'') ||
      ' ' || coalesce(translation_text,'') || ' ' || coalesce(safe_summary,''))
  ) STORED;

ALTER TABLE claims
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', statement)
  ) STORED;

ALTER TABLE evidence_items ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE source_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type source_input_type NOT NULL,
  normalized_key text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  intended_case_file_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status ingestion_status NOT NULL DEFAULT 'registered',
  source_edition_id uuid REFERENCES source_editions(id),
  rights_lane rights_lane NOT NULL DEFAULT 'yellow',
  created_by text NOT NULL,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (input_type, normalized_key)
);

CREATE TABLE source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_input_id uuid NOT NULL REFERENCES source_inputs(id) ON DELETE CASCADE,
  source_edition_id uuid REFERENCES source_editions(id) ON DELETE SET NULL,
  content_hash text NOT NULL,
  storage_uri text NOT NULL,
  media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  adapter_key text NOT NULL,
  adapter_version text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  upstream_modified_at timestamptz,
  private boolean NOT NULL DEFAULT true,
  UNIQUE (source_input_id, content_hash, adapter_version)
);

CREATE TABLE ingestion_jobs (
  id bigserial PRIMARY KEY,
  source_input_id uuid NOT NULL REFERENCES source_inputs(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('inspect','fetch','parse','extract','review_prepare','index')),
  status job_status NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_input_id, job_type, status)
);

CREATE TABLE verification_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  alleged_source_label text NOT NULL,
  alleged_locator text,
  alleged_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','not_found','rejected')),
  matched_source_edition_id uuid REFERENCES source_editions(id),
  matched_passage_id uuid REFERENCES passages(id),
  reviewer text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE source_impact_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_edition_id uuid NOT NULL REFERENCES source_editions(id) ON DELETE CASCADE,
  hypothesis_id uuid NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL CHECK (
    suggestion_type IN ('possible_support','possible_challenge','possible_duplicate','no_likely_impact')
  ),
  explanation text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_edition_id, hypothesis_id, suggestion_type)
);

CREATE TABLE hypothesis_revisions (
  id bigserial PRIMARY KEY,
  hypothesis_id uuid NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  reason text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hypothesis_id, revision_number)
);

CREATE TABLE case_file_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_file_id uuid NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  label text NOT NULL,
  question text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE request_rate_limits (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX source_inputs_status_idx ON source_inputs (status, created_at DESC);
CREATE INDEX source_snapshots_input_idx ON source_snapshots (source_input_id, fetched_at DESC);
CREATE INDEX ingestion_jobs_queue_idx ON ingestion_jobs (status, available_at) WHERE status = 'queued';
CREATE INDEX verification_tasks_status_idx ON verification_tasks (status, created_at);
CREATE INDEX source_impact_hypothesis_idx ON source_impact_suggestions (hypothesis_id, status);
CREATE INDEX hypothesis_revisions_idx ON hypothesis_revisions (hypothesis_id, revision_number DESC);
CREATE INDEX passages_search_idx ON passages USING gin (search_vector);
CREATE INDEX claims_search_idx ON claims USING gin (search_vector);

CREATE VIEW timeline_items AS
SELECT
  ta.id AS temporal_assertion_id,
  ta.target_type,
  ta.target_id,
  ta.source_claim_id,
  ta.role,
  ta.earliest_year,
  ta.latest_year,
  ta.display_label,
  ta.era_system,
  ta.precision,
  ta.confidence,
  ta.review_status,
  CASE ta.target_type
    WHEN 'event' THEN e.title
    WHEN 'work' THEN w.title
    WHEN 'source_edition' THEN se.title
    WHEN 'claim' THEN c.statement
    WHEN 'entity' THEN en.preferred_name
    ELSE ta.target_type || ':' || ta.target_id::text
  END AS title,
  CASE ta.role
    WHEN 'phenomenon_date' THEN 'climate_geology'
    WHEN 'event_claimed_date' THEN 'claimed_events'
    WHEN 'composition_date' THEN 'text_composition'
    WHEN 'witness_date' THEN 'physical_witnesses'
    WHEN 'edition_date' THEN 'editions'
    WHEN 'observation_date' THEN 'modern_observation'
    ELSE 'historical_events'
  END AS lane,
  coalesce(w.tradition, source_work.tradition) AS tradition,
  coalesce(w.culture, source_work.culture) AS culture
FROM temporal_assertions ta
LEFT JOIN events e ON ta.target_type = 'event' AND e.id = ta.target_id
LEFT JOIN works w ON ta.target_type = 'work' AND w.id = ta.target_id
LEFT JOIN source_editions se ON ta.target_type = 'source_edition' AND se.id = ta.target_id
LEFT JOIN works source_work ON source_work.id = se.work_id
LEFT JOIN claims c ON ta.target_type = 'claim' AND c.id = ta.target_id
LEFT JOIN entities en ON ta.target_type = 'entity' AND en.id = ta.target_id;

CREATE VIEW review_queue AS
SELECT 'source_input'::text AS object_type, id AS object_id, status::text AS status,
  input_type::text AS subtype, created_at, rights_lane::text AS rights_lane,
  coalesce(payload->>'title', payload->>'url', payload->>'doi', normalized_key) AS label
FROM source_inputs WHERE status NOT IN ('published','failed')
UNION ALL
SELECT 'claim', id, review_status::text, claim_class, created_at, NULL,
  left(statement, 160) FROM claims WHERE review_status IN ('draft','in_review','blocked')
UNION ALL
SELECT 'source_edition', id, review_status::text, edition_type, created_at,
  rights_lane::text, title FROM source_editions
WHERE review_status IN ('inbox','draft','in_review','blocked');
