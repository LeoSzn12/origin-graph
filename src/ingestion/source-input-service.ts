import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import { appendAudit } from "@/domain/services";
import { storePrivateObject } from "@/storage/local-storage";
import { safeFetchMetadata } from "@/security/fetch";
import { normalizeExternalUrl } from "@/security/url-policy";
import type { SourceInput, TranscriptInput } from "./schemas";

interface SourceInputRecord {
  id: string;
  input_type: string;
  normalized_key: string;
  status: string;
  source_edition_id: string | null;
  rights_lane: string;
  created_at: string;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedKey(input: SourceInput): string {
  switch (input.input_type) {
    case "url": return normalizeExternalUrl(input.url);
    case "doi": return input.doi.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");
    case "book_citation": return hash(input.citation.toLowerCase());
    case "manual_note": return hash(`${input.title}:${input.note}`);
    case "dataset_id": return input.dataset_id.toLowerCase();
    case "media_reference": return normalizeExternalUrl(input.media_url);
  }
}

export class SourceInputService {
  constructor(private readonly pool: Pool) {}

  async register(input: SourceInput, actor: string): Promise<SourceInputRecord> {
    const key = normalizedKey(input);
    return transaction(this.pool, async (client) => {
      const [record] = await rows<SourceInputRecord>(client,
        `INSERT INTO source_inputs (input_type, normalized_key, payload, intended_case_file_slugs, created_by)
         VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)
         ON CONFLICT (input_type, normalized_key) DO UPDATE SET updated_at=now()
         RETURNING id, input_type, normalized_key, status, source_edition_id, rights_lane, created_at`,
        [input.input_type, key, JSON.stringify(input), JSON.stringify(input.case_file_slugs), actor]);
      await client.query(
        `INSERT INTO ingestion_jobs (source_input_id, job_type) VALUES ($1,$2)
         ON CONFLICT (source_input_id, job_type, status) DO NOTHING`,
        [record.id, input.input_type === "url" || input.input_type === "doi" ? "inspect" : "review_prepare"]);
      await appendAudit(client, { objectType: "source_input", objectId: record.id, action: "registered", actor, after: record });
      return record;
    });
  }

  async materializeManual(input: SourceInput, actor: string): Promise<SourceInputRecord> {
    const record = await this.register(input, actor);
    if (record.source_edition_id) return record;
    if (input.input_type === "url" || input.input_type === "doi") return record;
    const title = input.title;
    const summary = input.input_type === "book_citation" ? input.safe_summary ?? input.citation
      : input.input_type === "manual_note" ? input.note
      : input.input_type === "dataset_id" ? `Dataset identifier: ${input.dataset_id}`
      : `Media reference: ${input.media_url}`;
    return transaction(this.pool, async (client) => {
      const workId = randomUUID();
      const editionId = randomUUID();
      const passageId = randomUUID();
      await client.query(
        `INSERT INTO works (id,title,work_type,description) VALUES ($1,$2,$3,$4)`,
        [workId, title, input.input_type, "User-registered source awaiting human review."]);
      await client.query(
        `INSERT INTO source_editions (id,work_id,version_group_key,title,edition_type,evidence_role,
          rights_lane,content_hash,adapter_key,adapter_version,parser_version,review_status,metadata)
         VALUES ($1,$2,$3,$4,$5,$6,'yellow',$7,'manual','1.0.0','1.0.0','draft',$8::jsonb)`,
        [editionId, workId, `manual:${record.id}`, title, input.input_type,
          input.input_type === "dataset_id" ? "physical_scientific" : input.input_type === "media_reference" ? "modern_discourse" : "reference_metadata",
          hash(JSON.stringify(input)), JSON.stringify(input)]);
      await client.query(
        `INSERT INTO passages (id,source_edition_id,locator_type,locator_value,safe_summary,text_hash,review_status)
         VALUES ($1,$2,'source_input',$3,$4,$5,'draft')`, [passageId, editionId, record.normalized_key, summary, hash(summary)]);
      await client.query(
        `UPDATE source_inputs SET source_edition_id=$2,status='human_review',updated_at=now() WHERE id=$1`, [record.id, editionId]);
      await appendAudit(client, { objectType: "source_edition", objectId: editionId, action: "manual_draft_created", actor, after: { inputId: record.id } });
      return { ...record, source_edition_id: editionId, status: "human_review" };
    });
  }

  async registerTranscript(input: TranscriptInput, actor: string): Promise<SourceInputRecord> {
    const key = hash(`${input.title}:${input.episode_title}:${input.media_url ?? "local"}:${JSON.stringify(input.segments)}`);
    return transaction(this.pool, async (client) => {
      const [existing] = await rows<SourceInputRecord>(client,
        `SELECT id,input_type,normalized_key,status,source_edition_id,rights_lane,created_at
         FROM source_inputs WHERE input_type='transcript_upload' AND normalized_key=$1`, [key]);
      if (existing) return existing;
      const inputId = randomUUID();
      const workId = randomUUID();
      const editionId = randomUUID();
      await client.query(
        `INSERT INTO source_inputs (id,input_type,normalized_key,payload,intended_case_file_slugs,status,
          source_edition_id,rights_lane,created_by)
         VALUES ($1,'transcript_upload',$2,$3::jsonb,$4::jsonb,'human_review',NULL,$5,$6)`,
        [inputId, key, JSON.stringify(input), JSON.stringify(input.case_file_slugs), input.rights_lane, actor]);
      await client.query(
        `INSERT INTO works (id,title,work_type,description) VALUES ($1,$2,'media_episode',$3)`,
        [workId, input.episode_title, `${input.show ?? input.title}. Transcript supplied for review.`]);
      await client.query(
        `INSERT INTO source_editions (id,work_id,version_group_key,title,edition_type,evidence_role,language,
          canonical_url,rights_lane,content_hash,independence_cluster_key,adapter_key,adapter_version,
          parser_version,review_status,metadata)
         VALUES ($1,$2,$3,$4,'transcript','modern_discourse',$5,$6,$7,$8,$9,'transcript_manual','1.0.0','1.0.0','draft',$10::jsonb)`,
        [editionId, workId, `transcript:${inputId}`, input.episode_title, input.language, input.media_url ?? null,
          input.rights_lane, key, `media:${input.media_url ?? inputId}`, JSON.stringify({ show: input.show, provenance: input.provenance })]);
      for (const segment of input.segments) {
        let speakerId: string | null = null;
        if (segment.speaker) {
          const result = await client.query<{ id: string }>(
            `INSERT INTO entities (entity_type,preferred_name,review_status) VALUES ('person',$1,'draft') RETURNING id`, [segment.speaker]);
          speakerId = result.rows[0].id;
        }
        const passageId = randomUUID();
        await client.query(
          `INSERT INTO passages (id,source_edition_id,locator_type,locator_value,safe_summary,text_hash,review_status)
           VALUES ($1,$2,'timestamp',$3,$4,$5,'draft')`,
          [passageId, editionId, segment.locator, segment.safe_summary, hash(segment.safe_summary)]);
        await client.query(
          `INSERT INTO claims (passage_id,claim_class,evidence_role,statement,review_status,created_by)
           VALUES ($1,'scholarly_interpretation','modern_discourse',$2,'draft',$3)`,
          [passageId, `Speaker statement summary: ${segment.safe_summary}`, actor]);
        await client.query(
          `INSERT INTO media_segments (passage_id,speaker_entity_id,start_ms,end_ms,transcript_provenance,
            speaker_confidence,text_confidence,rights_lane,review_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')`,
          [passageId, speakerId, segment.start_ms, segment.end_ms, input.provenance,
            segment.speaker_confidence ?? null, segment.text_confidence ?? null, input.rights_lane]);
      }
      await client.query("UPDATE source_inputs SET source_edition_id=$2 WHERE id=$1", [inputId, editionId]);
      await appendAudit(client, { objectType: "source_input", objectId: inputId, action: "transcript_draft_created", actor, after: { editionId, segments: input.segments.length } });
      return { id: inputId, input_type: "transcript_upload", normalized_key: key, status: "human_review", source_edition_id: editionId, rights_lane: input.rights_lane, created_at: new Date().toISOString() };
    });
  }

  async registerUpload(file: File, actor: string, caseFileSlugs: string[]): Promise<SourceInputRecord> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentHash = hash(Buffer.from(bytes).toString("base64"));
    const [existing] = await rows<SourceInputRecord>(this.pool,
      `SELECT id,input_type,normalized_key,status,source_edition_id,rights_lane,created_at
       FROM source_inputs WHERE input_type='upload' AND normalized_key=$1`, [contentHash]);
    if (existing) return existing;
    const stored = await storePrivateObject(bytes, file.name.split(".").at(-1));
    return transaction(this.pool, async (client) => {
      const [record] = await rows<SourceInputRecord>(client,
        `INSERT INTO source_inputs (input_type,normalized_key,payload,intended_case_file_slugs,created_by)
         VALUES ('upload',$1,$2::jsonb,$3::jsonb,$4)
         ON CONFLICT (input_type,normalized_key) DO UPDATE SET updated_at=source_inputs.updated_at
         RETURNING id,input_type,normalized_key,status,source_edition_id,rights_lane,created_at`,
        [contentHash, JSON.stringify({ filename: file.name, media_type: file.type, size: file.size }), JSON.stringify(caseFileSlugs), actor]);
      await client.query(
        `INSERT INTO source_snapshots (source_input_id,content_hash,storage_uri,media_type,byte_size,
          adapter_key,adapter_version,private) VALUES ($1,$2,$3,$4,$5,'upload','1.0.0',true)
         ON CONFLICT (source_input_id,content_hash,adapter_version) DO NOTHING`,
        [record.id, contentHash, stored.uri, file.type, stored.byteSize]);
      await client.query(
        `INSERT INTO ingestion_jobs (source_input_id,job_type) VALUES ($1,'parse')
         ON CONFLICT (source_input_id,job_type,status) DO NOTHING`, [record.id]);
      return record;
    });
  }

  async processNextInspection(workerId: string): Promise<string | null> {
    const job = await transaction(this.pool, async (client) => {
      const result = await client.query<{ id: string; source_input_id: string; payload: SourceInput }>(
        `SELECT j.id::text,j.source_input_id,si.payload FROM ingestion_jobs j
         JOIN source_inputs si ON si.id=j.source_input_id
         WHERE j.status='queued' AND j.job_type='inspect' AND j.available_at<=now()
         ORDER BY j.id FOR UPDATE SKIP LOCKED LIMIT 1`);
      if (!result.rows[0]) return null;
      await client.query(
        `UPDATE ingestion_jobs SET status='running',attempts=attempts+1,locked_at=now(),locked_by=$2 WHERE id=$1`,
        [result.rows[0].id, workerId]);
      return result.rows[0];
    });
    if (!job) return null;
    try {
      const input = job.payload;
      let url: string;
      if (input.input_type === "url") url = input.url;
      else if (input.input_type === "doi") url = `https://api.crossref.org/works/${encodeURIComponent(normalizedKey(input))}`;
      else throw new Error("ADAPTER_MISMATCH");
      const fetched = await safeFetchMetadata(url);
      const stored = await storePrivateObject(fetched.content, fetched.mediaType.includes("html") ? "html" : "bin");
      let fetchedTitle = fetched.title;
      let fetchedDescription = fetched.description;
      let fetchedMetadata: Record<string, unknown> = { final_url: fetched.finalUrl, media_type: fetched.mediaType };
      if (input.input_type === "doi") {
        const payload = JSON.parse(new TextDecoder().decode(fetched.content)) as { message?: Record<string, unknown> };
        const message = payload.message ?? {};
        const titles = Array.isArray(message.title) ? message.title : [];
        fetchedTitle = typeof titles[0] === "string" ? titles[0] : `DOI ${normalizedKey(input)}`;
        fetchedDescription = typeof message.abstract === "string" ? message.abstract.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null;
        fetchedMetadata = { ...fetchedMetadata, doi: normalizedKey(input), publisher: message.publisher, author: message.author, license: message.license };
      }
      await transaction(this.pool, async (client) => {
        const workId = randomUUID();
        const editionId = randomUUID();
        const title = fetchedTitle ?? (input.input_type === "url" ? input.title ?? fetched.finalUrl : `DOI ${normalizedKey(input)}`);
        await client.query(
          `INSERT INTO source_snapshots (source_input_id,content_hash,storage_uri,media_type,byte_size,
            adapter_key,adapter_version,private) VALUES ($1,$2,$3,$4,$5,$6,'1.0.0',true)`,
          [job.source_input_id, hash(Buffer.from(fetched.content).toString("base64")), stored.uri,
            fetched.mediaType, stored.byteSize, input.input_type]);
        await client.query(
          `INSERT INTO works (id,title,work_type,description) VALUES ($1,$2,$3,$4)`,
          [workId, title, input.input_type === "doi" ? "academic_work" : "web_resource", fetchedDescription]);
        await client.query(
          `INSERT INTO source_editions (id,work_id,version_group_key,title,edition_type,evidence_role,
            stable_identifier,canonical_url,rights_lane,content_hash,adapter_key,adapter_version,
            parser_version,review_status,metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'yellow',$9,$5,'1.0.0','1.0.0','draft',$10::jsonb)`,
          [editionId, workId, `${input.input_type}:${job.source_input_id}`, title, input.input_type,
            input.input_type === "doi" ? "academic_interpretation" : "reference_metadata",
            input.input_type === "doi" ? normalizedKey(input) : fetched.finalUrl, fetched.finalUrl,
            hash(Buffer.from(fetched.content).toString("base64")), JSON.stringify(fetchedMetadata)]);
        await client.query(
          `INSERT INTO passages (source_edition_id,locator_type,locator_value,safe_summary,text_hash,review_status)
           VALUES ($1,'source_metadata',$2,$3,$4,'draft')`,
          [editionId, fetched.finalUrl, fetchedDescription ?? `Metadata record for ${title}.`, hash(fetchedDescription ?? title)]);
        await client.query(
          "UPDATE source_inputs SET source_edition_id=$2,status='rights_check_required',updated_at=now() WHERE id=$1",
          [job.source_input_id, editionId]);
        await client.query("UPDATE ingestion_jobs SET status='completed',updated_at=now() WHERE id=$1", [job.id]);
      });
      return job.source_input_id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.pool.query(
        `UPDATE ingestion_jobs SET status='failed',last_error=$2,updated_at=now() WHERE id=$1`, [job.id, message.slice(0, 500)]);
      await this.pool.query(
        `UPDATE source_inputs SET status='failed',error_code='INSPECTION_FAILED',error_message=$2,updated_at=now() WHERE id=$1`,
        [job.source_input_id, message.slice(0, 500)]);
      throw error;
    }
  }

  async list(): Promise<Record<string, unknown>[]> {
    return rows(this.pool,
      `SELECT si.id,si.input_type,si.status,si.rights_lane,si.created_at,si.error_code,
        si.source_edition_id,coalesce(se.title,si.payload->>'title',si.payload->>'url',si.payload->>'doi',si.normalized_key) AS title
       FROM source_inputs si LEFT JOIN source_editions se ON se.id=si.source_edition_id ORDER BY si.created_at DESC`);
  }
}
