import { createPool, transaction } from "../src/db";
import { ProviderService } from "../src/connectors/provider-service";
import { appendAudit } from "../src/domain/services";
import { loadLocalEnv } from "./env";

const selections: Record<string, Array<[string, string]>> = {
  "african-humid-period": [["crossref", "10.1038/s41467-019-11701-z"]],
  "atlantis-in-plato": [["gutenberg", "1572"], ["wikisource", "3928299"]],
  "deep-human-timeline": [["paleobiodb", "occ:212227"], ["paleobiodb", "occ:212049"]],
  "divine-astral-weapons": [["gutenberg", "15474"], ["crossref", "10.1558/rosa.24401"]],
  "flood-traditions-atlas": [["crossref", "10.1007/978-94-009-3959-2_26"]],
  "sphinx-chronology": [["crossref", "10.2307/jj.38271388.14"], ["crossref", "10.2307/1506380"], ["loc", "http://www.loc.gov/item/90713672/"]],
  "sumerian-king-list-long-reigns": [["crossref", "10.5615/jcunestud.70.2018.0037"], ["crossref", "10.2307/3209665"]],
  "vimanas-sky-vehicles": [["gutenberg", "15474"], ["crossref", "10.1086/463672"]],
  "watchers-giants-hybrid-beings": [["gutenberg", "77935"], ["wikisource", "130737"]],
  "younger-dryas": [["noaa_paleo", "2709"], ["crossref", "10.1016/j.earscirev.2021.103677"]],
};

async function main() {
  loadLocalEnv();
  const pool = createPool();
  const providers = new ProviderService(pool);
  const actor = "curated-record-review";
  let promoted = 0;
  let linked = 0;
  let blocked = 0;
  try {
    for (const [caseSlug, records] of Object.entries(selections)) {
      for (const [providerKey, externalId] of records) {
        const record = await pool.query<{ id: string }>(
          `SELECT er.id FROM external_records er JOIN source_providers sp ON sp.id = er.source_provider_id
            WHERE sp.provider_key = $1 AND er.external_id = $2`,
          [providerKey, externalId],
        );
        if (!record.rows[0]) throw new Error(`Missing staged record ${providerKey}:${externalId}`);
        const editionId = await providers.promote(record.rows[0].id, actor);
        await transaction(pool, async (client) => {
          const file = await client.query<{ id: string }>(`SELECT id FROM case_files WHERE slug = $1`, [caseSlug]);
          if (!file.rows[0]) throw new Error(`Missing case file ${caseSlug}`);
          await client.query(
            `UPDATE source_editions SET review_status = 'approved', publication_allowed = true,
              full_text_publication_allowed = false, rights_reviewed_at = now(), rights_reviewed_by = $2,
              storage_visibility = 'metadata_only', updated_at = now()
             WHERE id = $1`,
            [editionId, actor],
          );
          await client.query(`UPDATE passages SET review_status = 'approved' WHERE source_edition_id = $1`, [editionId]);
          const result = await client.query(
            `INSERT INTO case_file_objects (case_file_id, object_type, object_id)
             VALUES ($1, 'source_edition', $2) ON CONFLICT DO NOTHING`,
            [file.rows[0].id, editionId],
          );
          linked += result.rowCount ?? 0;
          await client.query(
            `UPDATE case_file_external_records SET review_status = 'approved'
              WHERE case_file_id = $1 AND external_record_id = $2`,
            [file.rows[0].id, record.rows[0].id],
          );
          await client.query(
            `INSERT INTO source_refresh_policies (source_edition_id, refresh_mode, minimum_interval,
              next_check_at, last_content_hash)
             SELECT id, 'scheduled', interval '30 days', now() + interval '30 days', content_hash
               FROM source_editions WHERE id = $1
             ON CONFLICT (source_edition_id) DO UPDATE SET refresh_mode = EXCLUDED.refresh_mode,
               minimum_interval = EXCLUDED.minimum_interval, next_check_at = EXCLUDED.next_check_at,
               last_content_hash = EXCLUDED.last_content_hash, updated_at = now()`,
            [editionId],
          );
          await appendAudit(client, { objectType: "source_edition", objectId: editionId,
            action: "metadata_record_reviewed", actor,
            after: { case_file: caseSlug, provider: providerKey, external_id: externalId, full_text: false } });
        });
        promoted += 1;
      }
    }

    const rejected = await pool.query(
      `UPDATE case_file_external_records cfer SET review_status = 'blocked'
        WHERE review_status = 'inbox'
          AND NOT EXISTS (
            SELECT 1 FROM external_records er JOIN source_providers sp ON sp.id = er.source_provider_id
             WHERE er.id = cfer.external_record_id
               AND EXISTS (
                 SELECT 1 FROM jsonb_each($1::jsonb) cases,
                   jsonb_array_elements(cases.value) pair
                  WHERE (pair->>0) = sp.provider_key AND (pair->>1) = er.external_id
               )
          )`,
      [JSON.stringify(selections)],
    );
    blocked = rejected.rowCount ?? 0;
    await pool.query(`UPDATE source_editions se SET review_status='blocked',publication_allowed=false,full_text_publication_allowed=false,updated_at=now()
      FROM external_records er JOIN source_providers sp ON sp.id=er.source_provider_id
      WHERE er.source_edition_id=se.id AND sp.provider_key='noaa_paleo' AND er.external_id='82023'`);
    process.stdout.write(`${JSON.stringify({ promoted, linked, blocked }, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
