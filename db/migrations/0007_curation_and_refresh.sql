CREATE TABLE curation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key text UNIQUE NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','completed_with_warnings','failed')),
  query_count integer NOT NULL DEFAULT 0 CHECK (query_count >= 0),
  record_count integer NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  warning_count integer NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(warnings)='array'),
  actor text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE case_file_external_records (
  case_file_id uuid NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  external_record_id uuid NOT NULL REFERENCES external_records(id) ON DELETE CASCADE,
  curation_batch_id uuid REFERENCES curation_batches(id) ON DELETE SET NULL,
  relevance_note text NOT NULL,
  review_status review_status NOT NULL DEFAULT 'inbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_file_id, external_record_id)
);

CREATE TABLE source_refresh_policies (
  source_edition_id uuid PRIMARY KEY REFERENCES source_editions(id) ON DELETE CASCADE,
  refresh_mode text NOT NULL DEFAULT 'manual' CHECK (refresh_mode IN ('manual','scheduled','disabled')),
  minimum_interval interval,
  next_check_at timestamptz,
  last_checked_at timestamptz,
  last_content_hash text,
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE case_file_revisions (
  id bigserial PRIMARY KEY,
  case_file_id uuid NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
  reason text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_file_id, revision_number)
);

CREATE INDEX case_file_external_review_idx ON case_file_external_records (case_file_id, review_status, created_at);
CREATE INDEX source_refresh_due_idx ON source_refresh_policies (refresh_mode, next_check_at) WHERE refresh_mode='scheduled';
CREATE INDEX case_file_revisions_idx ON case_file_revisions (case_file_id, revision_number DESC);
