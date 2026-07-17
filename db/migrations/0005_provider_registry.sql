CREATE TABLE source_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  provider_kind text NOT NULL CHECK (provider_kind IN ('text_corpus','scholarly_index','museum_archive','archaeology','geography','paleoclimate','paleoecology')),
  homepage_url text NOT NULL,
  api_base_url text,
  cultures jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cultures)='array'),
  content_scope text NOT NULL,
  access_mode text NOT NULL CHECK (access_mode IN ('open_no_key','api_key','client_credentials','manual_download','metadata_only','review_required')),
  connector_status text NOT NULL DEFAULT 'cataloged' CHECK (connector_status IN ('connected','configured','needs_credentials','cataloged','paused')),
  rights_lane rights_lane NOT NULL DEFAULT 'yellow',
  rights_note text NOT NULL,
  attribution_text text,
  terms_url text,
  environment_key text,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(capabilities)='array'),
  enabled boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE provider_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider_id uuid NOT NULL REFERENCES source_providers(id) ON DELETE CASCADE,
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  status job_status NOT NULL DEFAULT 'queued',
  records_seen integer NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
  records_staged integer NOT NULL DEFAULT 0 CHECK (records_staged >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE external_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider_id uuid NOT NULL REFERENCES source_providers(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  record_type text NOT NULL,
  title text NOT NULL,
  subtitle text,
  canonical_url text,
  date_label text,
  creators jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(creators)='array'),
  places jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(places)='array'),
  subjects jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(subjects)='array'),
  rights_uri text,
  rights_lane rights_lane NOT NULL DEFAULT 'yellow',
  rights_note text NOT NULL,
  safe_summary text,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(raw_metadata)='object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  review_status review_status NOT NULL DEFAULT 'inbox',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_provider_id, external_id)
);

CREATE INDEX source_providers_kind_status_idx ON source_providers (provider_kind, connector_status, enabled);
CREATE INDEX provider_sync_runs_provider_created_idx ON provider_sync_runs (source_provider_id, created_at DESC);
CREATE INDEX external_records_provider_status_idx ON external_records (source_provider_id, review_status, last_seen_at DESC);
CREATE INDEX external_records_search_idx ON external_records USING gin (to_tsvector('simple', title || ' ' || coalesce(safe_summary,'')));

CREATE VIEW provider_health AS
SELECT sp.id,sp.provider_key,sp.display_name,sp.provider_kind,sp.access_mode,sp.connector_status,
  sp.rights_lane,sp.enabled,sp.last_checked_at,
  count(er.id)::int AS staged_records,
  max(er.last_seen_at) AS last_record_at,
  (SELECT psr.status::text FROM provider_sync_runs psr WHERE psr.source_provider_id=sp.id ORDER BY psr.created_at DESC LIMIT 1) AS last_sync_status
FROM source_providers sp LEFT JOIN external_records er ON er.source_provider_id=sp.id
GROUP BY sp.id;
