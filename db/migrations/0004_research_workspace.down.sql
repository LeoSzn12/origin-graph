DROP VIEW IF EXISTS review_queue;
DROP VIEW IF EXISTS timeline_items;
DROP TABLE IF EXISTS request_rate_limits, case_file_queries, hypothesis_revisions,
  source_impact_suggestions, verification_tasks, ingestion_jobs, source_snapshots, source_inputs;
ALTER TABLE claims DROP COLUMN IF EXISTS search_vector;
ALTER TABLE evidence_items DROP COLUMN IF EXISTS created_at;
ALTER TABLE passages DROP COLUMN IF EXISTS search_vector;
ALTER TABLE source_editions DROP COLUMN IF EXISTS metadata, DROP COLUMN IF EXISTS storage_visibility;
DROP TYPE IF EXISTS job_status, source_input_type, ingestion_status;
