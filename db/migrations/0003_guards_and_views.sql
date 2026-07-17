CREATE OR REPLACE FUNCTION enforce_passage_publication() RETURNS trigger AS $$
DECLARE source_record source_editions%ROWTYPE;
BEGIN
  IF NEW.review_status = 'published' AND OLD.review_status IS DISTINCT FROM 'published' THEN
    SELECT * INTO source_record FROM source_editions WHERE id = NEW.source_edition_id;
    IF source_record.rights_reviewed_at IS NULL OR NOT source_record.publication_allowed THEN
      RAISE EXCEPTION 'SOURCE_RIGHTS_UNRESOLVED: passage source rights are not approved';
    END IF;
    IF (NEW.original_text IS NOT NULL OR NEW.translation_text IS NOT NULL)
       AND NOT source_record.full_text_publication_allowed THEN
      RAISE EXCEPTION 'SOURCE_FULL_TEXT_BLOCKED: rights permit metadata/summary only';
    END IF;
    IF source_record.review_status NOT IN ('approved', 'published') THEN
      RAISE EXCEPTION 'SOURCE_NOT_APPROVED: passage source must be approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER passages_publication_guard
BEFORE INSERT OR UPDATE OF review_status ON passages
FOR EACH ROW EXECUTE FUNCTION enforce_passage_publication();

CREATE OR REPLACE FUNCTION enforce_source_publication() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status = 'published' AND OLD.review_status IS DISTINCT FROM 'published' THEN
    IF NEW.rights_reviewed_at IS NULL OR NOT NEW.publication_allowed THEN
      RAISE EXCEPTION 'SOURCE_RIGHTS_UNRESOLVED: source rights are not approved';
    END IF;
    IF NEW.rights_lane = 'red' THEN
      RAISE EXCEPTION 'SOURCE_RIGHTS_BLOCKED: red-lane sources cannot be published';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER source_editions_publication_guard
BEFORE INSERT OR UPDATE OF review_status ON source_editions
FOR EACH ROW EXECUTE FUNCTION enforce_source_publication();

CREATE OR REPLACE FUNCTION enforce_claim_publication() RETURNS trigger AS $$
DECLARE passage_record passages%ROWTYPE;
DECLARE source_record source_editions%ROWTYPE;
BEGIN
  IF NEW.passage_id IS NOT NULL THEN
    SELECT * INTO passage_record FROM passages WHERE id = NEW.passage_id;
    SELECT * INTO source_record FROM source_editions WHERE id = passage_record.source_edition_id;
    IF source_record.id IS NOT NULL AND NEW.evidence_role <> source_record.evidence_role THEN
      RAISE EXCEPTION 'EVIDENCE_ROLE_MISMATCH: claim role must match its source edition';
    END IF;
  END IF;
  IF NEW.review_status = 'published' AND OLD.review_status IS DISTINCT FROM 'published' THEN
    IF NEW.passage_id IS NULL THEN
      RAISE EXCEPTION 'CLAIM_LOCATOR_REQUIRED: published claims require a passage';
    END IF;
    IF passage_record.id IS NULL OR btrim(passage_record.locator_value) = '' THEN
      RAISE EXCEPTION 'CLAIM_LOCATOR_REQUIRED: exact passage locator is missing';
    END IF;
    IF source_record.rights_reviewed_at IS NULL OR NOT source_record.publication_allowed THEN
      RAISE EXCEPTION 'SOURCE_RIGHTS_UNRESOLVED: claim source rights are not approved';
    END IF;
    IF source_record.review_status NOT IN ('approved', 'published') THEN
      RAISE EXCEPTION 'SOURCE_NOT_APPROVED: claim source must be approved';
    END IF;
    IF passage_record.review_status NOT IN ('approved', 'published') THEN
      RAISE EXCEPTION 'PASSAGE_NOT_APPROVED: claim passage must be approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_publication_guard
BEFORE INSERT OR UPDATE OF review_status ON claims
FOR EACH ROW EXECUTE FUNCTION enforce_claim_publication();

CREATE OR REPLACE FUNCTION enforce_connection_publication() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status = 'published' AND OLD.review_status IS DISTINCT FROM 'published' THEN
    IF NOT EXISTS (SELECT 1 FROM connection_source_claims WHERE connection_id = NEW.id) THEN
      RAISE EXCEPTION 'CONNECTION_SOURCE_REQUIRED: published connections require at least one source claim';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER connections_publication_guard
AFTER INSERT OR UPDATE OF review_status ON connections
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_connection_publication();

CREATE OR REPLACE FUNCTION protect_audit_events() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_APPEND_ONLY: audit events cannot be changed or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION protect_audit_events();

CREATE VIEW source_versions AS
SELECT
  id,
  work_id,
  version_group_key,
  version_number,
  supersedes_source_edition_id,
  title,
  content_hash,
  rights_lane,
  evidence_role,
  review_status,
  created_at,
  lead(id) OVER (PARTITION BY version_group_key ORDER BY version_number) AS replaced_by_source_edition_id
FROM source_editions;

CREATE VIEW admin_table_counts AS
SELECT table_name, row_count
FROM (
  SELECT 'works'::text AS table_name, count(*)::bigint AS row_count FROM works
  UNION ALL SELECT 'source_editions', count(*) FROM source_editions
  UNION ALL SELECT 'witnesses', count(*) FROM witnesses
  UNION ALL SELECT 'passages', count(*) FROM passages
  UNION ALL SELECT 'claims', count(*) FROM claims
  UNION ALL SELECT 'temporal_assertions', count(*) FROM temporal_assertions
  UNION ALL SELECT 'places', count(*) FROM places
  UNION ALL SELECT 'entities', count(*) FROM entities
  UNION ALL SELECT 'entity_role_assertions', count(*) FROM entity_role_assertions
  UNION ALL SELECT 'events', count(*) FROM events
  UNION ALL SELECT 'motifs', count(*) FROM motifs
  UNION ALL SELECT 'connections', count(*) FROM connections
  UNION ALL SELECT 'source_relationships', count(*) FROM source_relationships
  UNION ALL SELECT 'media_segments', count(*) FROM media_segments
  UNION ALL SELECT 'hypotheses', count(*) FROM hypotheses
  UNION ALL SELECT 'evidence_items', count(*) FROM evidence_items
  UNION ALL SELECT 'case_files', count(*) FROM case_files
  UNION ALL SELECT 'reviews', count(*) FROM reviews
  UNION ALL SELECT 'audit_events', count(*) FROM audit_events
) counts;
