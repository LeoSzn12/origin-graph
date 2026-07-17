CREATE OR REPLACE VIEW review_queue AS
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
DROP INDEX IF EXISTS external_records_source_edition_idx;
ALTER TABLE external_records DROP COLUMN IF EXISTS source_edition_id;
