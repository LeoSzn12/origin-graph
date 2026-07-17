import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";

export async function GET(_request: NextRequest) {
  const status = "published";
  const result = await db().query(
    `SELECT c.id,c.statement,c.claim_class,c.evidence_role,c.review_status,p.locator_value,se.title AS source_title
     FROM claims c LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id
     WHERE ($1::text IS NULL OR c.review_status::text=$1) ORDER BY c.created_at DESC LIMIT 200`, [status]);
  return NextResponse.json({ claims: result.rows });
}
