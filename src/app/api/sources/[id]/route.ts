import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const source = await db().query(
      `SELECT se.*,w.title AS work_title,w.work_type,
        coalesce((SELECT json_agg(p ORDER BY p.locator_value) FROM passages p WHERE p.source_edition_id=se.id),'[]') AS passages,
        coalesce((SELECT json_agg(sv ORDER BY sv.version_number) FROM source_versions sv WHERE sv.version_group_key=se.version_group_key),'[]') AS versions
       FROM source_editions se LEFT JOIN works w ON w.id=se.work_id WHERE se.id=$1`, [id]);
    if (!source.rows[0]) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Source not found", details: {} } }, { status: 404 });
    return NextResponse.json(source.rows[0]);
  } catch (error) { return apiError(error); }
}

