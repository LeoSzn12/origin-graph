DROP TABLE IF EXISTS text_embeddings, audit_events, reviews, case_file_objects, case_files,
  evidence_items, hypotheses, source_relationships, connection_source_claims, connections,
  temporal_assertions, media_segments, entity_role_assertions, claims, motifs, events,
  entities, passages, witnesses, places, source_editions, canonical_statuses, works CASCADE;
DROP TYPE IF EXISTS source_evidence_role, temporal_role, evidence_stance, confidence_level, rights_lane, review_status;
