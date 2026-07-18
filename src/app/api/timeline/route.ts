import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { apiError } from "@/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const from = Number(params.get("from") ?? -7000000);
    const to = Number(params.get("to") ?? new Date().getUTCFullYear());
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error("INVALID_DATE_RANGE: from must be <= to");
    const lanes = params.get("lanes")?.split(",").filter(Boolean) ?? [];
    const reviewed = params.get("reviewed") !== "false";
    const result = await db().query(
      `SELECT ti.*,p.source_edition_id,se.title AS source_title,p.locator_type,p.locator_value
       FROM timeline_items ti LEFT JOIN claims sc ON sc.id=ti.source_claim_id
       LEFT JOIN passages p ON p.id=sc.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id
       WHERE coalesce(ti.latest_year,ti.earliest_year,$1) >= $1 AND coalesce(ti.earliest_year,ti.latest_year,$2) <= $2
         AND ($3::text[]='{}' OR ti.lane=ANY($3::text[]))
         AND (NOT $4 OR ti.review_status IN ('approved','published'))
         AND (ti.source_claim_id IS NULL OR sc.review_status='published')
         AND ti.title NOT LIKE 'SYNTHETIC%'
       ORDER BY ti.earliest_year NULLS LAST,ti.title LIMIT 1000`, [from, to, lanes, reviewed]);
    return NextResponse.json({ from, to, items: result.rows });
  } catch (error) { return apiError(error); }
}
