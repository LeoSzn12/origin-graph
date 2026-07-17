import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await db().query(
    `SELECT cf.*,
      coalesce((SELECT json_agg(cfo ORDER BY cfo.sort_order) FROM case_file_objects cfo WHERE cfo.case_file_id=cf.id),'[]') AS objects,
      coalesce((SELECT json_agg(cfq ORDER BY cfq.created_at) FROM case_file_queries cfq WHERE cfq.case_file_id=cf.id),'[]') AS saved_queries
     FROM case_files cf WHERE cf.slug=$1`, [slug]);
  if (!result.rows[0]) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Case file not found", details: {} } }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

