import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import { appendAudit } from "@/domain/services";
import { providerRegistry } from "./registry";
import { searchProvider, type ExternalCandidate } from "./search";

export class ProviderService {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Record<string, unknown>[]> {
    return rows(this.pool, `SELECT * FROM provider_health ORDER BY provider_kind,display_name`);
  }

  async search(key: string, query: string, actor: string, limit = 12): Promise<ExternalCandidate[]> {
    const definition = providerRegistry.find((provider) => provider.key === key);
    if (!definition) throw new Error("NOT_FOUND: provider not found");
    if (!definition.enabled) throw new Error(`CONNECTOR_DISABLED: ${definition.name} needs credentials or editorial approval`);
    const run = await this.pool.query<{id:string}>(
      `INSERT INTO provider_sync_runs (source_provider_id,query,status,started_at,actor)
       SELECT id,$2::jsonb,'running',now(),$3 FROM source_providers WHERE provider_key=$1 RETURNING id`,
      [key,JSON.stringify({query}),actor]);
    if (!run.rows[0]) throw new Error("NOT_FOUND: provider registry has not been seeded");
    try {
      const results = await searchProvider(key, query, limit);
      await this.pool.query(`UPDATE provider_sync_runs SET status='completed',records_seen=$2,completed_at=now(),updated_at=now() WHERE id=$1`,[run.rows[0].id,results.length]);
      await this.pool.query(`UPDATE source_providers SET last_checked_at=now(),updated_at=now() WHERE provider_key=$1`,[key]);
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.pool.query(`UPDATE provider_sync_runs SET status='failed',error_code='SEARCH_FAILED',error_message=$2,completed_at=now(),updated_at=now() WHERE id=$1`,[run.rows[0].id,message.slice(0,500)]);
      throw error;
    }
  }

  async stage(key: string, candidate: ExternalCandidate, actor: string): Promise<string> {
    return transaction(this.pool, async (client) => {
      const provider = await client.query<{id:string}>("SELECT id FROM source_providers WHERE provider_key=$1",[key]);
      if (!provider.rows[0]) throw new Error("NOT_FOUND: provider not found");
      const hash = createHash("sha256").update(JSON.stringify(candidate.raw_metadata)).digest("hex");
      const result = await client.query<{id:string}>(
        `INSERT INTO external_records (source_provider_id,external_id,record_type,title,subtitle,canonical_url,date_label,
          creators,places,subjects,rights_uri,rights_lane,rights_note,safe_summary,raw_metadata,content_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15::jsonb,$16)
         ON CONFLICT (source_provider_id,external_id) DO UPDATE SET title=EXCLUDED.title,subtitle=EXCLUDED.subtitle,
          canonical_url=EXCLUDED.canonical_url,date_label=EXCLUDED.date_label,creators=EXCLUDED.creators,
          places=EXCLUDED.places,subjects=EXCLUDED.subjects,rights_uri=EXCLUDED.rights_uri,
          rights_lane=EXCLUDED.rights_lane,rights_note=EXCLUDED.rights_note,safe_summary=EXCLUDED.safe_summary,
          raw_metadata=EXCLUDED.raw_metadata,content_hash=EXCLUDED.content_hash,last_seen_at=now()
         RETURNING id`,[provider.rows[0].id,candidate.external_id,candidate.record_type,candidate.title,candidate.subtitle ?? null,
          candidate.canonical_url ?? null,candidate.date_label ?? null,JSON.stringify(candidate.creators),JSON.stringify(candidate.places),
          JSON.stringify(candidate.subjects),candidate.rights_uri ?? null,candidate.rights_lane,candidate.rights_note,
          candidate.safe_summary ?? null,JSON.stringify(candidate.raw_metadata),hash]);
      await appendAudit(client,{objectType:"external_record",objectId:result.rows[0].id,action:"staged_from_provider",actor,after:{provider:key,external_id:candidate.external_id}});
      return result.rows[0].id;
    });
  }

  async promote(recordId:string,actor:string):Promise<string>{
    return transaction(this.pool,async client=>{
      const result=await client.query<{id:string;title:string;record_type:string;canonical_url:string|null;rights_lane:"green"|"yellow"|"red";rights_note:string;safe_summary:string|null;content_hash:string;source_edition_id:string|null;provider_key:string}>(`SELECT er.id,er.title,er.record_type,er.canonical_url,er.rights_lane,er.rights_note,er.safe_summary,er.content_hash,er.source_edition_id,sp.provider_key FROM external_records er JOIN source_providers sp ON sp.id=er.source_provider_id WHERE er.id=$1 FOR UPDATE`,[recordId]);
      const record=result.rows[0];if(!record)throw new Error("NOT_FOUND: external record not found");if(record.source_edition_id)return record.source_edition_id;
      const work=await client.query<{id:string}>(`INSERT INTO works (title,work_type,description) VALUES ($1,$2,$3) RETURNING id`,[record.title,record.record_type,record.safe_summary??"External provider record awaiting editorial review."]);
      const edition=await client.query<{id:string}>(`INSERT INTO source_editions (work_id,version_group_key,title,edition_type,evidence_role,stable_identifier,canonical_url,rights_lane,rights_note,content_hash,adapter_key,adapter_version,parser_version,review_status,metadata) VALUES ($1,$2,$3,$4,'reference_metadata',$5,$5,$6,$7,$8,$9,'1.0.0','1.0.0','draft',$10::jsonb) RETURNING id`,[work.rows[0].id,`provider:${record.provider_key}:${record.id}`,record.title,record.record_type,record.canonical_url,record.rights_lane,record.rights_note,record.content_hash,record.provider_key,JSON.stringify({external_record_id:record.id})]);
      if(record.safe_summary)await client.query(`INSERT INTO passages (source_edition_id,locator_type,locator_value,safe_summary,text_hash,review_status) VALUES ($1,'provider_record',$2,$3,$4,'draft')`,[edition.rows[0].id,record.canonical_url??record.id,record.safe_summary,createHash('sha256').update(record.safe_summary).digest('hex')]);
      await client.query(`UPDATE external_records SET source_edition_id=$2,review_status='draft',last_seen_at=now() WHERE id=$1`,[record.id,edition.rows[0].id]);
      await appendAudit(client,{objectType:'external_record',objectId:record.id,action:'promoted_to_source_draft',actor,after:{source_edition_id:edition.rows[0].id}});
      return edition.rows[0].id;
    });
  }
}
