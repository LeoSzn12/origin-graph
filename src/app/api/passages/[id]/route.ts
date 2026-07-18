import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await db().query(
    `SELECT p.*,se.title AS source_title,se.rights_lane,se.license_name,se.license_url,se.attribution_text,
      coalesce((SELECT json_agg(c ORDER BY c.created_at) FROM claims c WHERE c.passage_id=p.id),'[]') AS claims
     FROM passages p JOIN source_editions se ON se.id=p.source_edition_id WHERE p.id=$1`, [id]);
  if (!result.rows[0]) return NextResponse.json({ error: { code:"NOT_FOUND",message:"Passage not found",details:{} } }, { status:404 });
  return NextResponse.json(result.rows[0]);
}
