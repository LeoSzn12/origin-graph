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
      `SELECT * FROM timeline_items
       WHERE coalesce(latest_year,earliest_year,$1) >= $1 AND coalesce(earliest_year,latest_year,$2) <= $2
         AND ($3::text[]='{}' OR lane=ANY($3::text[]))
         AND (NOT $4 OR review_status IN ('approved','published'))
       ORDER BY earliest_year NULLS LAST,title LIMIT 1000`, [from, to, lanes, reviewed]);
    return NextResponse.json({ from, to, items: result.rows });
  } catch (error) { return apiError(error); }
}

