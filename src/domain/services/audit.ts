import type { DbExecutor } from "@/db";

export async function appendAudit(
  executor: DbExecutor,
  input: {
    objectType: string;
    objectId: string;
    action: string;
    actor?: string;
    before?: unknown;
    after?: unknown;
  }
): Promise<void> {
  await executor.query(
    `INSERT INTO audit_events (object_type, object_id, action, actor, before_data, after_data)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      input.objectType,
      input.objectId,
      input.action,
      input.actor ?? null,
      input.before === undefined ? null : JSON.stringify(input.before),
      input.after === undefined ? null : JSON.stringify(input.after)
    ]
  );
}
