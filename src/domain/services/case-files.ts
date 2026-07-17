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
}
