import type { Pool } from "pg";
import { transaction } from "@/db";
import { providerRegistry } from "@/connectors/registry";
import { caseFileShells, syntheticIds as id } from "../../fixtures/synthetic";

export async function seedSyntheticFixtures(pool: Pool): Promise<void> {
  await transaction(pool, async (client) => {
    for (const provider of providerRegistry) {
      await client.query(
        `INSERT INTO source_providers (provider_key,display_name,provider_kind,homepage_url,api_base_url,
          cultures,content_scope,access_mode,connector_status,rights_lane,rights_note,attribution_text,
          terms_url,environment_key,capabilities,enabled,last_checked_at)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,
           CASE WHEN $9='connected' THEN now() ELSE NULL END)
         ON CONFLICT (provider_key) DO UPDATE SET display_name=EXCLUDED.display_name,
           provider_kind=EXCLUDED.provider_kind,homepage_url=EXCLUDED.homepage_url,
           api_base_url=EXCLUDED.api_base_url,cultures=EXCLUDED.cultures,
           content_scope=EXCLUDED.content_scope,access_mode=EXCLUDED.access_mode,
           connector_status=EXCLUDED.connector_status,rights_lane=EXCLUDED.rights_lane,
           rights_note=EXCLUDED.rights_note,attribution_text=EXCLUDED.attribution_text,
           terms_url=EXCLUDED.terms_url,environment_key=EXCLUDED.environment_key,
           capabilities=EXCLUDED.capabilities,enabled=EXCLUDED.enabled,updated_at=now()`,
        [provider.key,provider.name,provider.kind,provider.homepage,provider.apiBase ?? null,
          JSON.stringify(provider.cultures),provider.scope,provider.access,provider.status,
          provider.rightsLane,provider.rightsNote,provider.attribution ?? null,provider.termsUrl ?? null,
          provider.environmentKey ?? null,JSON.stringify(provider.capabilities),provider.enabled]);
    }

    await client.query(
      `INSERT INTO works (id, title, work_type, tradition, culture, original_language, description)
       VALUES
        ($1, 'SYNTHETIC Comparative Work', 'synthetic_text', 'Synthetic Tradition', 'Synthetic Culture', 'zxx', 'Test-only work; not historical evidence.'),
        ($2, 'SYNTHETIC Media Episode', 'synthetic_media', NULL, 'Synthetic Culture', 'en', 'Test-only media record; not a real episode.')
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description`,
      [id.work, id.mediaWork]
    );

    await client.query(
      `INSERT INTO source_editions (
        id, work_id, version_group_key, version_number, supersedes_source_edition_id, title,
        edition_type, evidence_role, language, stable_identifier, rights_lane, rights_note,
        rights_reviewed_at, rights_reviewed_by, publication_allowed, full_text_publication_allowed,
        content_hash, independence_cluster_key, adapter_key, adapter_version, parser_version, review_status
      ) VALUES
       ($1,$4,'synthetic-primary',1,NULL,'SYNTHETIC Edition v1','synthetic_fixture','primary_tradition','zxx',
        'synthetic:primary','green','Synthetic content created for tests.',now(),'fixture-reviewer',true,true,
        repeat('1',64),'synthetic-family-a','fixture','1.0.0','1.0.0','superseded'),
       ($2,$4,'synthetic-primary',2,$1,'SYNTHETIC Edition v2','synthetic_fixture','primary_tradition','zxx',
        'synthetic:primary','green','Synthetic content created for tests.',now(),'fixture-reviewer',true,true,
        repeat('2',64),'synthetic-family-a','fixture','1.0.0','1.0.0','approved'),
       ($3,$5,'synthetic-media',1,NULL,'SYNTHETIC Media Transcript','synthetic_transcript','modern_discourse','en',
        'synthetic:media','yellow','Test-only user-provided transcript; metadata/summary publication only.',now(),'fixture-reviewer',true,false,
        repeat('3',64),'synthetic-family-a','fixture','1.0.0','1.0.0','approved')
      ON CONFLICT (id) DO UPDATE SET review_status=EXCLUDED.review_status, content_hash=EXCLUDED.content_hash`,
      [id.sourceV1, id.sourceV2, id.mediaSource, id.work, id.mediaWork]
    );

    await client.query(
      `INSERT INTO witnesses (id, work_id, source_edition_id, witness_type, repository_name,
        repository_identifier, material, description, review_status) VALUES
       ($1,$3,$4,'synthetic_witness','Synthetic Repository','SYN-W1','test material','No real artifact.','approved'),
       ($2,$3,$4,'synthetic_witness','Synthetic Repository','SYN-W2','test material','Second test-only witness.','approved')
       ON CONFLICT (id) DO NOTHING`, [id.witnessA, id.witnessB, id.work, id.sourceV2]);

    await client.query(
      `INSERT INTO passages (id, source_edition_id, witness_id, locator_type, locator_value,
        safe_summary, text_hash, review_status) VALUES
       ($1,$3,$4,'synthetic_line','SYN 1.1','Synthetic structural summary; not a quotation.',repeat('4',64),'approved'),
       ($2,$5,NULL,'timestamp','00:01:00.000-00:01:12.000','Synthetic speaker claim summary; not a quotation.',repeat('5',64),'approved')
       ON CONFLICT (id) DO UPDATE SET locator_value=EXCLUDED.locator_value`,
      [id.primaryPassage, id.mediaPassage, id.sourceV2, id.witnessA, id.mediaSource]);

    await client.query(
      `INSERT INTO entities (id, entity_type, preferred_name, description, review_status) VALUES
       ($1,'person','SYNTHETIC Sacred Figure','Test-only entity used to prove multiple native roles.','approved'),
       ($2,'person','SYNTHETIC Speaker','Test-only transcript speaker.','approved')
       ON CONFLICT (id) DO NOTHING`, [id.entity, id.speaker]);

    await client.query(
      `INSERT INTO claims (id, passage_id, claim_class, evidence_role, statement, review_status, created_by, reviewed_by) VALUES
       ($1,$3,'textual_report','primary_tradition','SYNTHETIC claim derived from the exact synthetic locator.','published','fixture','fixture-reviewer'),
       ($2,$4,'scholarly_interpretation','modern_discourse','SYNTHETIC modern-discourse lead requiring underlying-source verification.','approved','fixture','fixture-reviewer')
       ON CONFLICT (id) DO UPDATE SET statement=EXCLUDED.statement, review_status=EXCLUDED.review_status`,
      [id.primaryClaim, id.mediaClaim, id.primaryPassage, id.mediaPassage]);

    await client.query(
      `INSERT INTO entity_role_assertions (id, entity_id, role_key, native_label, tradition,
        community, source_claim_id, confidence, review_status) VALUES
       ($1,$3,'sage','SYN-ROLE-A','Synthetic Tradition A','Synthetic Community A',$4,'medium','approved'),
       ($2,$3,'lawgiver','SYN-ROLE-B','Synthetic Tradition B','Synthetic Community B',$4,'medium','approved')
       ON CONFLICT (id) DO NOTHING`, [id.roleA, id.roleB, id.entity, id.primaryClaim]);

    await client.query(
      `INSERT INTO media_segments (id, passage_id, speaker_entity_id, start_ms, end_ms,
        transcript_provenance, speaker_confidence, text_confidence, rights_lane, review_status)
       VALUES ($1,$2,$3,60000,72000,'user_provided',0.950,0.900,'yellow','approved')
       ON CONFLICT (id) DO UPDATE SET start_ms=EXCLUDED.start_ms, end_ms=EXCLUDED.end_ms`,
      [id.mediaSegment, id.mediaPassage, id.speaker]);

    await client.query(
      `INSERT INTO events (id, title, event_type, description, historicity_status, review_status)
       VALUES ($1,'SYNTHETIC Multi-date Event','synthetic_event','Test-only event for chronology roles.','synthetic','approved')
       ON CONFLICT (id) DO NOTHING`, [id.event]);

    const temporalFixtures = [
      ["event_claimed_date", -10000, -9000, "SYNTHETIC claimed-event interval", "narrative relative"],
      ["composition_date", -400, -350, "SYNTHETIC composition interval", "synthetic fixture"],
      ["witness_date", 800, 900, "SYNTHETIC witness interval", "synthetic fixture"],
      ["edition_date", 2000, 2000, "SYNTHETIC edition year", "synthetic fixture"],
      ["observation_date", 2010, 2010, "SYNTHETIC observation year", "synthetic fixture"],
      ["phenomenon_date", -12000, -11000, "SYNTHETIC phenomenon interval", "synthetic measurement method"]
    ] as const;
    for (let index = 0; index < temporalFixtures.length; index += 1) {
      const [role, earliest, latest, label, method] = temporalFixtures[index];
      const temporalId = `61000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      await client.query(
        `INSERT INTO temporal_assertions (id, target_type, target_id, role, earliest_year,
          latest_year, display_label, era_system, precision, dating_method, confidence,
          source_claim_id, review_status)
         VALUES ($1,'event',$2,$3,$4,$5,$6,'astronomical_year','range',$7,'medium',$8,'approved')
         ON CONFLICT (id) DO UPDATE SET earliest_year=EXCLUDED.earliest_year, latest_year=EXCLUDED.latest_year`,
        [temporalId, id.event, role, earliest, latest, label, method, id.primaryClaim]);
    }

    await client.query(
      `INSERT INTO motifs (id, slug, label, definition, review_status)
       VALUES ($1,'synthetic-comparison-motif','SYNTHETIC Comparison Motif','Test-only motif; similarity does not imply identity.','approved')
       ON CONFLICT (id) DO NOTHING`, [id.motif]);
    await client.query(
      `INSERT INTO places (id, preferred_name, place_kind, uncertainty_type, uncertainty_note, review_status)
       VALUES ($1,'SYNTHETIC Literary Place','literary','mythical','No factual coordinates are assigned.','approved')
       ON CONFLICT (id) DO NOTHING`, [id.place]);
    await client.query(
      `INSERT INTO places (id, preferred_name, place_kind, geometry, uncertainty_type, uncertainty_note, review_status)
       VALUES ($1,'SYNTHETIC Approximate Site','synthetic_site',ST_SetSRID(ST_MakePoint(12.5::double precision,34.4::double precision),4326),
         'approximate_point','Test-only point used to exercise map uncertainty.','approved')
       ON CONFLICT (id) DO UPDATE SET geometry=EXCLUDED.geometry, uncertainty_note=EXCLUDED.uncertainty_note`, [id.mappedPlace]);
    await client.query(
      `INSERT INTO places (id, preferred_name, place_kind, geometry, public_geometry, uncertainty_type,
        uncertainty_note, sensitive, review_status)
       VALUES ($1,'SYNTHETIC Protected Site','synthetic_site',ST_SetSRID(ST_MakePoint(13.1::double precision,35.2::double precision),4326),
         ST_SetSRID(ST_MakePoint(13.0::double precision,35.0::double precision),4326),'generalized',
         'Public location is deliberately generalized for this test-only sensitive site.',true,'approved')
       ON CONFLICT (id) DO UPDATE SET geometry=EXCLUDED.geometry,public_geometry=EXCLUDED.public_geometry,
         uncertainty_note=EXCLUDED.uncertainty_note`, [id.sensitivePlace]);
    await client.query(
      `INSERT INTO source_relationships (id, from_source_id, to_source_id, relationship_type,
        explanation, confidence, review_status)
       VALUES ($1,$2,$3,'summarizes','Synthetic media source depends on the synthetic primary source.','high','approved')
       ON CONFLICT (id) DO NOTHING`, [id.relationship, id.mediaSource, id.sourceV2]);
    await client.query(
      `INSERT INTO connections (id, from_type, from_id, to_type, to_id, connection_type,
        explanation, confidence, review_status)
       VALUES ($1,'claim',$2,'motif',$3,'claim_expresses_motif',
        'Synthetic typed link; no identity or truth inference.','medium','approved')
       ON CONFLICT (id) DO NOTHING`, [id.connection, id.primaryClaim, id.motif]);
    await client.query(
      `INSERT INTO connection_source_claims (connection_id, claim_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`, [id.connection, id.primaryClaim]);

    await client.query(
      `INSERT INTO hypotheses (id, slug, title, proposition, scope, predicted_observations,
        falsifiers, alternatives, state, private_workspace, review_status)
       VALUES ($1,'synthetic-structural-hypothesis','SYNTHETIC Structural Hypothesis',
        'A test-only proposition used to exercise pro and challenge evidence.',
        'Synthetic fixtures only.','["Synthetic predicted observation"]','["Synthetic falsifier"]',
        '["Synthetic alternative"]','draft',true,'draft')
       ON CONFLICT (id) DO NOTHING`, [id.hypothesis]);
    await client.query(
      `INSERT INTO evidence_items (id, hypothesis_id, claim_id, stance, evidence_domain,
        independence_cluster, reviewer_note, review_status) VALUES
       ($1,$3,$4,'supports','primary text','synthetic-family-a','Synthetic support card.','draft'),
       ($2,$3,$5,'challenges','modern observation','synthetic-family-a','Synthetic challenge card from a dependent source.','draft')
       ON CONFLICT (id) DO NOTHING`,
      [id.evidenceSupport, id.evidenceChallenge, id.hypothesis, id.primaryClaim, id.mediaClaim]);

    for (let index = 0; index < caseFileShells.length; index += 1) {
      const [slug, title, coreQuestion] = caseFileShells[index];
      const caseId = `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      await client.query(
        `INSERT INTO case_files (id, slug, title, core_question, summary, scope, status, review_status)
         VALUES ($1,$2,$3,$4,NULL,'Empty editorial shell; no evidence seeded.','draft','draft')
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, core_question=EXCLUDED.core_question`,
        [caseId, slug, title, coreQuestion]);
    }
  });
}
