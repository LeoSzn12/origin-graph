import { createPool, transaction } from "../src/db";
import { appendAudit } from "../src/domain/services";
import { loadLocalEnv } from "./env";

async function main() {
  loadLocalEnv();
  const pool = createPool();
  const actor = "curated-timeline-review";
  try {
    const summary = await transaction(pool, async (client) => {
      let claims = 0; let assertions = 0;
      const editions = await client.query<{ id:string; title:string; publication_date:string; passage_id:string }>(
        `SELECT se.id,se.title,se.publication_date,p.id AS passage_id FROM source_editions se
          JOIN passages p ON p.source_edition_id=se.id AND p.locator_value LIKE '%Project Gutenberg embedded header%'
         WHERE se.adapter_key='gutenberg' AND se.publication_date IS NOT NULL AND se.review_status IN ('approved','published')`);
      for (const edition of editions.rows) {
        const yearMatch = edition.publication_date.match(/\b(18|19|20)\d{2}\b/);
        if (!yearMatch) continue;
        const year = Number(yearMatch[0]);
        const statement = `The embedded Project Gutenberg header records this eBook release as ${edition.publication_date}.`;
        await client.query(`UPDATE passages SET review_status='approved' WHERE id=$1 AND review_status='draft'`,[edition.passage_id]);
        let claim = await client.query<{id:string}>(`SELECT id FROM claims WHERE passage_id=$1 AND statement=$2`,[edition.passage_id,statement]);
        if (!claim.rows[0]) claim = await client.query<{id:string}>(
          `INSERT INTO claims (passage_id,claim_class,evidence_role,statement,directness,interpretation_level,confidence,review_status,created_by,reviewed_by)
           VALUES ($1,'edition_metadata','reference_metadata',$2,4,0,'high','published',$3,$3) RETURNING id`,[edition.passage_id,statement,actor]);
        claims += 1;
        const existing = await client.query(`SELECT 1 FROM temporal_assertions WHERE target_type='source_edition' AND target_id=$1 AND role='edition_date' AND source_claim_id=$2`,[edition.id,claim.rows[0].id]);
        if (!existing.rows[0]) { await client.query(
          `INSERT INTO temporal_assertions (target_type,target_id,role,earliest_year,latest_year,display_label,era_system,precision,dating_method,confidence,source_claim_id,note,review_status)
           VALUES ('source_edition',$1,'edition_date',$2,$2,$3,'CE','year','embedded Project Gutenberg header','high',$4,'This is the electronic edition release, not the work composition date.','approved')`,
          [edition.id,year,`Project Gutenberg eBook release: ${year} CE`,claim.rows[0].id]); assertions += 1; }
      }

      const atlantis = await client.query<{passage_id:string;claim_id:string;case_id:string}>(
        `SELECT p.id AS passage_id,c.id AS claim_id,cf.id AS case_id FROM passages p
          JOIN source_editions se ON se.id=p.source_edition_id
          JOIN claims c ON c.passage_id=p.id
          JOIN case_files cf ON cf.slug='atlantis-in-plato'
         WHERE se.stable_identifier='gutenberg:1572' AND p.locator_value LIKE '%Critias account of Atlantis%' LIMIT 1`);
      if (atlantis.rows[0]) {
        const statement = "The Timaeus passage places the narrated Athenian conflict with Atlantis 9,000 years before the dialogue's Solon frame.";
        let dateClaim = await client.query<{id:string}>(`SELECT id FROM claims WHERE passage_id=$1 AND statement=$2`,[atlantis.rows[0].passage_id,statement]);
        if (!dateClaim.rows[0]) dateClaim=await client.query<{id:string}>(
          `INSERT INTO claims (passage_id,claim_class,evidence_role,statement,directness,interpretation_level,confidence,uncertainty_note,review_status,created_by,reviewed_by)
           VALUES ($1,'chronological_assertion','primary_tradition',$2,4,1,'high','The converted interval is an editorial approximation of a narrative relative date, not an archaeological date.','published',$3,$3) RETURNING id`,
          [atlantis.rows[0].passage_id,statement,actor]);
        let event = await client.query<{id:string}>(`SELECT id FROM events WHERE title='Atlantis conflict and disappearance (Platonic narrative)'`);
        if (!event.rows[0]) event=await client.query<{id:string}>(`INSERT INTO events (title,event_type,description,historicity_status,review_status) VALUES ('Atlantis conflict and disappearance (Platonic narrative)','reported_event','Narrative event represented without asserting historicity.','literary_or_disputed','approved') RETURNING id`);
        const existing=await client.query(`SELECT 1 FROM temporal_assertions WHERE target_type='event' AND target_id=$1 AND role='event_claimed_date' AND source_claim_id=$2`,[event.rows[0].id,dateClaim.rows[0].id]);
        if(!existing.rows[0]){await client.query(`INSERT INTO temporal_assertions (target_type,target_id,role,earliest_year,latest_year,display_label,era_system,precision,dating_method,chronology_model,confidence,source_claim_id,note,review_status) VALUES ('event',$1,'event_claimed_date',-9600,-9500,'Narrative date: approximately 9,000 years before Solon','astronomical_year','derived_range','relative narrative calculation','Solon frame approximated to the early sixth century BCE','low',$2,'Claimed narrative chronology only; not a composition, witness, or scientific phenomenon date.','approved')`,[event.rows[0].id,dateClaim.rows[0].id]);assertions+=1;}
        await client.query(`INSERT INTO case_file_objects (case_file_id,object_type,object_id) VALUES ($1,'event',$2) ON CONFLICT DO NOTHING`,[atlantis.rows[0].case_id,event.rows[0].id]);
      }
      await appendAudit(client,{objectType:"timeline",objectId:"00000000-0000-4000-8000-000000000001",action:"curated_timeline_reviewed",actor,after:{claims,assertions}});
      return {claims_reviewed:claims,assertions_created:assertions};
    });
    process.stdout.write(`${JSON.stringify(summary,null,2)}\n`);
  } finally { await pool.end(); }
}
main().catch((error)=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
