import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, transaction } from "@/db";
import { apiError, requestActor } from "@/http";

const patchSchema = z.object({ title: z.string().min(1).optional(), proposition: z.string().min(3).optional(), scope: z.string().min(3).optional(), state: z.enum(["draft","active","paused","rejected","supported","superseded"]).optional(), predicted_observations: z.array(z.string()).optional(), falsifiers: z.array(z.string()).optional(), alternatives: z.array(z.string()).min(1).optional(), reason: z.string().min(1) });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await db().query(
    `SELECT h.*,
      coalesce((SELECT json_agg(json_build_object('id',ei.id,'stance',ei.stance,'domain',ei.evidence_domain,
        'cluster',ei.independence_cluster,'claim_id',c.id,'statement',c.statement,'source_title',se.title,
        'locator',p.locator_value) ORDER BY ei.created_at) FROM evidence_items ei JOIN claims c ON c.id=ei.claim_id
        LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id WHERE ei.hypothesis_id=h.id),'[]') AS evidence,
      coalesce((SELECT json_agg(hr ORDER BY hr.revision_number DESC) FROM hypothesis_revisions hr WHERE hr.hypothesis_id=h.id),'[]') AS revisions
     FROM hypotheses h WHERE h.id=$1`, [id]);
  if (!result.rows[0]) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Hypothesis not found", details: {} } }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = patchSchema.parse(await request.json());
    const actor = requestActor(request);
    const record = await transaction(db(), async (client) => {
      const before = await client.query("SELECT * FROM hypotheses WHERE id=$1 FOR UPDATE", [id]);
      if (!before.rows[0]) throw new Error("NOT_FOUND: hypothesis not found");
      const revision = await client.query<{ next: number }>("SELECT coalesce(max(revision_number),0)::int+1 AS next FROM hypothesis_revisions WHERE hypothesis_id=$1", [id]);
      await client.query(
        `INSERT INTO hypothesis_revisions (hypothesis_id,revision_number,snapshot,reason,actor)
         VALUES ($1,$2,$3::jsonb,$4,$5)`, [id, revision.rows[0].next, JSON.stringify(before.rows[0]), input.reason, actor]);
      const result = await client.query(
        `UPDATE hypotheses SET title=coalesce($2,title),proposition=coalesce($3,proposition),scope=coalesce($4,scope),
          state=coalesce($5,state),predicted_observations=coalesce($6::jsonb,predicted_observations),
          falsifiers=coalesce($7::jsonb,falsifiers),alternatives=coalesce($8::jsonb,alternatives),updated_at=now()
         WHERE id=$1 RETURNING *`, [id,input.title,input.proposition,input.scope,input.state,
          input.predicted_observations ? JSON.stringify(input.predicted_observations) : null,
          input.falsifiers ? JSON.stringify(input.falsifiers) : null,
          input.alternatives ? JSON.stringify(input.alternatives) : null]);
      return result.rows[0];
    });
    return NextResponse.json(record);
  } catch (error) { return apiError(error); }
}

