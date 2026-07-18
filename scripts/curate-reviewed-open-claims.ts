import { createPool, transaction } from "../src/db";
import { appendAudit } from "../src/domain/services";
import { reviewedOpenClaims } from "../fixtures/reviewed-open-claims";
import { loadLocalEnv } from "./env";

async function main() {
  loadLocalEnv();
  const pool = createPool();
  const actor = "curated-open-review";
  try {
    const summary = await transaction(pool, async (client) => {
      let claims = 0;
      let roles = 0;
      let links = 0;

      for (const item of reviewedOpenClaims) {
        const adapter = item.sourceAdapter ?? "world_english_bible";
        if (adapter === "world_english_bible") {
          const retracted = await client.query<{id:string}>(
            `UPDATE claims c SET review_status='retracted', uncertainty_note=coalesce(c.uncertainty_note || ' ', '') || 'Retracted: prior prefix locator match attached this statement to the wrong verse.', updated_at=now()
              FROM passages p JOIN source_editions se ON se.id=p.source_edition_id
             WHERE c.passage_id=p.id AND se.adapter_key='world_english_bible' AND c.statement=$1 AND p.locator_value<>$2 AND c.review_status<>'retracted'
             RETURNING c.id`,[item.statement,item.locator]);
          for (const row of retracted.rows) await appendAudit(client,{objectType:"claim",objectId:row.id,action:"retracted_wrong_locator_match",actor,after:{expected_locator:item.locator}});
        }
        const params: unknown[] = [adapter, item.locator];
        let editionFilter = "";
        if (item.sourceStableIdentifier) {
          params.push(item.sourceStableIdentifier);
          editionFilter = `AND se.stable_identifier = $3`;
        }
        const passage = await client.query<{ id: string; source_edition_id: string; work_id: string | null }>(
          `SELECT p.id, p.source_edition_id, se.work_id
             FROM passages p
             JOIN source_editions se ON se.id = p.source_edition_id
            WHERE se.adapter_key = $1
              AND (($1='world_english_bible' AND p.locator_value=$2) OR ($1<>'world_english_bible' AND p.locator_value LIKE '%' || $2 || '%'))
              ${editionFilter}
            ORDER BY se.version_number DESC LIMIT 1`,
          params,
        );
        if (!passage.rows[0]) throw new Error(`Missing imported passage ${adapter}:${item.locator}`);

        const workMetadata: Record<string, [string, string, string]> = {
          "gutenberg:1572": ["Ancient Greek philosophy", "Classical Greek", "grc"],
          "gutenberg:77935": ["Second Temple Jewish / Ethiopian Christian reception", "Ancient Jewish", "gez,grc,arc"],
          "gutenberg:15474": ["Hindu traditions", "South Asian", "sa"],
          "gutenberg:2017": ["Buddhism", "South Asian", "pi"],
          "gutenberg:3330": ["Confucian tradition", "Chinese", "zh"],
          "gutenberg:2800": ["Islam", "Arabic", "ar"],
        };
        const metadata = item.sourceStableIdentifier ? workMetadata[item.sourceStableIdentifier] : undefined;
        if (metadata && passage.rows[0].work_id) {
          await client.query(`UPDATE works SET tradition=$2, culture=$3, original_language=$4, updated_at=now() WHERE id=$1`, [passage.rows[0].work_id, ...metadata]);
        }

        await client.query(
          `UPDATE passages SET review_status = 'approved' WHERE id = $1 AND review_status = 'draft'`,
          [passage.rows[0].id],
        );

        let entityId: string | null = null;
        if (item.entity) {
          let entity = await client.query<{ id: string }>(
            `SELECT id FROM entities WHERE entity_type = 'person' AND preferred_name = $1 ORDER BY id LIMIT 1`,
            [item.entity.name],
          );
          if (!entity.rows[0]) {
            entity = await client.query<{ id: string }>(
              `INSERT INTO entities (entity_type, preferred_name, description, review_status)
               VALUES ('person', $1, 'Profile assembled only from reviewed claims and role assertions.', 'approved') RETURNING id`,
              [item.entity.name],
            );
          }
          entityId = entity.rows[0].id;
        }

        let claim = await client.query<{ id: string }>(
          `SELECT id FROM claims WHERE passage_id = $1 AND statement = $2`,
          [passage.rows[0].id, item.statement],
        );
        if (!claim.rows[0]) {
          claim = await client.query<{ id: string }>(
            `INSERT INTO claims (passage_id, claim_class, evidence_role, statement, subject_entity_id,
              directness, interpretation_level, confidence, uncertainty_note, review_status, created_by, reviewed_by)
             VALUES ($1, $2, 'primary_tradition', $3, $4, $5, $6, 'high', $7, 'published', $8, $8)
             RETURNING id`,
            [passage.rows[0].id, item.claimClass, item.statement, entityId, item.directness ?? 4,
              item.interpretationLevel ?? 0, item.uncertaintyNote ?? null, actor],
          );
        }
        claims += 1;

        if (item.entity?.roleKey && entityId) {
          const existingRole = await client.query(
            `SELECT 1 FROM entity_role_assertions
              WHERE entity_id = $1 AND role_key = $2 AND tradition = $3
                AND community IS NULL AND source_claim_id = $4`,
            [entityId, item.entity.roleKey, item.entity.tradition ?? "Unspecified", claim.rows[0].id],
          );
          if (!existingRole.rows[0]) {
            await client.query(
              `INSERT INTO entity_role_assertions
                (entity_id, role_key, native_label, tradition, source_claim_id, confidence, review_status)
               VALUES ($1, $2, $3, $4, $5, 'high', 'published')`,
              [entityId, item.entity.roleKey, item.entity.nativeLabel ?? null,
                item.entity.tradition ?? "Unspecified", claim.rows[0].id],
            );
            roles += 1;
          }
        }

        if (adapter === "gutenberg" && passage.rows[0].work_id && item.sourceStableIdentifier === "gutenberg:77935") {
          await client.query(
            `INSERT INTO canonical_statuses (work_id, tradition, community, status, context_note, source_url)
             VALUES ($1, 'Christianity', 'Ethiopian Orthodox Tewahedo Church', 'canonical',
               'Community-specific canonical status. This must not be generalized to all Christian communities.',
               'https://www.ethiopianorthodox.org/english/canonical/books.html')
             ON CONFLICT DO NOTHING`,
            [passage.rows[0].work_id],
          );
        }

        if (item.motif) {
          let motif = await client.query<{ id: string }>(`SELECT id FROM motifs WHERE slug = $1`, [item.motif.slug]);
          if (!motif.rows[0]) {
            motif = await client.query<{ id: string }>(
              `INSERT INTO motifs (slug, label, definition, review_status) VALUES ($1, $2, $3, 'published') RETURNING id`,
              [item.motif.slug, item.motif.label, item.motif.definition],
            );
          }
          let connection = await client.query<{ id: string }>(
            `SELECT id FROM connections WHERE from_type = 'claim' AND from_id = $1
              AND to_type = 'motif' AND to_id = $2 AND connection_type = 'claim_expresses_motif'`,
            [claim.rows[0].id, motif.rows[0].id],
          );
          if (!connection.rows[0]) {
            connection = await client.query<{ id: string }>(
              `INSERT INTO connections (from_type, from_id, to_type, to_id, connection_type, explanation, confidence, review_status)
               VALUES ('claim', $1, 'motif', $2, 'claim_expresses_motif',
                 'Editorial motif coding of this exact located passage; similarity does not establish identity or transmission.',
                 'medium', 'published') RETURNING id`,
              [claim.rows[0].id, motif.rows[0].id],
            );
            await client.query(`INSERT INTO connection_source_claims (connection_id, claim_id) VALUES ($1, $2)`, [connection.rows[0].id, claim.rows[0].id]);
          }
        }

        for (const slug of item.caseFiles ?? []) {
          const file = await client.query<{ id: string }>(`SELECT id FROM case_files WHERE slug = $1`, [slug]);
          if (!file.rows[0]) throw new Error(`Missing case file ${slug}`);
          for (const [type, id] of [["source_edition", passage.rows[0].source_edition_id], ["passage", passage.rows[0].id], ["claim", claim.rows[0].id]] as const) {
            const result = await client.query(
              `INSERT INTO case_file_objects (case_file_id, object_type, object_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
              [file.rows[0].id, type, id],
            );
            links += result.rowCount ?? 0;
          }
          if (item.motif) {
            const motif = await client.query<{ id: string }>(`SELECT id FROM motifs WHERE slug = $1`, [item.motif.slug]);
            await client.query(
              `INSERT INTO case_file_objects (case_file_id, object_type, object_id) VALUES ($1, 'motif', $2) ON CONFLICT DO NOTHING`,
              [file.rows[0].id, motif.rows[0].id],
            );
          }
        }

        await appendAudit(client, {
          objectType: "claim",
          objectId: claim.rows[0].id,
          action: "public_domain_claim_reviewed",
          actor,
          after: { locator: item.locator, adapter, source_edition_id: passage.rows[0].source_edition_id },
        });
      }
      return { claims_reviewed: claims, role_assertions_created: roles, case_links_created: links };
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
