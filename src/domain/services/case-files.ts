import type { Pool } from "pg";
import { transaction } from "@/db";
import { nonEmpty, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

export class CaseFileService {
  constructor(private readonly pool: Pool) {}

  async createShell(input: { slug: string; title: string; coreQuestion: string; actor?: string }): Promise<string> {
    return transaction(this.pool, async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO case_files (slug, title, core_question, status, review_status)
         VALUES ($1,$2,$3,'draft','draft')
         ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, core_question=EXCLUDED.core_question
         RETURNING id`,
        [nonEmpty.parse(input.slug), nonEmpty.parse(input.title), nonEmpty.parse(input.coreQuestion)]);
      const id = result.rows[0].id;
      await appendAudit(client, { objectType: "case_file", objectId: id, action: "shell_upserted", actor: input.actor, after: input });
      return id;
    });
  }

  async attachObject(input: { caseFileId: string; objectType: string; objectId: string; sortOrder?: number }): Promise<void> {
    uuidSchema.parse(input.caseFileId);
    uuidSchema.parse(input.objectId);
    await this.pool.query(
      `INSERT INTO case_file_objects (case_file_id, object_type, object_id, sort_order)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [input.caseFileId, nonEmpty.parse(input.objectType), input.objectId, input.sortOrder ?? 0]);
  }

  async revise(input: { slug: string; title?: string; coreQuestion?: string; summary?: string; scope?: string; reason: string; actor?: string }): Promise<number> {
    return transaction(this.pool, async (client) => {
      const locked = await client.query<{ id: string }>(`SELECT id FROM case_files WHERE slug = $1 FOR UPDATE`, [nonEmpty.parse(input.slug)]);
      if (!locked.rows[0]) throw new Error("NOT_FOUND: case file not found");
      const snapshot = await client.query<Record<string, unknown>>(
        `SELECT cf.*, coalesce((SELECT json_agg(cfo ORDER BY cfo.sort_order) FROM case_file_objects cfo WHERE cfo.case_file_id=cf.id),'[]') AS objects
           FROM case_files cf WHERE cf.id = $1`, [locked.rows[0].id]);
      const revision = await client.query<{ revision_number: number }>(
        `INSERT INTO case_file_revisions (case_file_id, revision_number, snapshot, reason, actor)
         SELECT $1, coalesce(max(revision_number),0)+1, $2::jsonb, $3, $4
           FROM case_file_revisions WHERE case_file_id = $1 RETURNING revision_number`,
        [locked.rows[0].id, JSON.stringify(snapshot.rows[0]), nonEmpty.parse(input.reason), input.actor ?? "local-editor"],
      );
      await client.query(
        `UPDATE case_files SET title=coalesce($2,title), core_question=coalesce($3,core_question),
          summary=coalesce($4,summary), scope=coalesce($5,scope), updated_at=now() WHERE id=$1`,
        [locked.rows[0].id, input.title ?? null, input.coreQuestion ?? null, input.summary ?? null, input.scope ?? null],
      );
      await appendAudit(client, { objectType: "case_file", objectId: locked.rows[0].id, action: "revision_saved", actor: input.actor, after: { revision: revision.rows[0].revision_number, reason: input.reason } });
      return revision.rows[0].revision_number;
    });
  }
}
