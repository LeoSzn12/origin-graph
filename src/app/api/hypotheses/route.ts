import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { HypothesisService } from "@/domain/services";
import { apiError, requestActor } from "@/http";

const schema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(1), proposition: z.string().min(3), scope: z.string().min(3), predictions: z.array(z.string()).default([]), falsifiers: z.array(z.string()).default([]), alternatives: z.array(z.string()).min(1) });

export async function GET() {
  const result = await db().query(
    `SELECT h.*,count(ei.id)::int AS evidence_count,
      count(ei.id) FILTER (WHERE ei.stance='supports')::int AS support_count,
      count(ei.id) FILTER (WHERE ei.stance='challenges')::int AS challenge_count
     FROM hypotheses h LEFT JOIN evidence_items ei ON ei.hypothesis_id=h.id
     WHERE h.slug NOT LIKE 'synthetic-%'
     GROUP BY h.id ORDER BY h.updated_at DESC`);
  return NextResponse.json({ hypotheses: result.rows });
}

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const id = await new HypothesisService(db()).createDraft({ ...input, actor: requestActor(request) });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
