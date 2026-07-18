import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean).slice(0, 6) ?? [];
  const result = await db().query(
    `SELECT e.id,e.preferred_name,e.description,
      coalesce((SELECT json_agg(json_build_object('role_key',era.role_key,'native_label',era.native_label,'tradition',era.tradition,'claim_id',era.source_claim_id)) FROM entity_role_assertions era WHERE era.entity_id=e.id AND era.review_status IN ('approved','published')),'[]') AS roles,
      coalesce((SELECT json_agg(json_build_object('role',ta.role,'earliest_year',ta.earliest_year,'latest_year',ta.latest_year,'display_label',ta.display_label)) FROM temporal_assertions ta WHERE ta.target_type='entity' AND ta.target_id=e.id AND ta.review_status IN ('approved','published')),'[]') AS dates,
      coalesce((SELECT json_agg(json_build_object('id',c.id,'statement',c.statement,'class',c.claim_class,'locator',p.locator_value,'source',se.title,'source_id',se.id,
        'dimension',CASE WHEN c.claim_class LIKE 'teaching%' OR c.statement ~* 'teach|beatitude|good news|learning|purif' THEN 'teachings'
          WHEN c.statement ~* 'raised|child|birth|daughter' THEN 'birth and upbringing'
          WHEN c.statement ~* 'called|mission|baptism|awak' THEN 'calling or awakening' ELSE 'reviewed passages' END)
        ORDER BY c.created_at) FROM claims c LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id WHERE c.subject_entity_id=e.id AND c.review_status='published'),'[]') AS claims
     FROM entities e
     WHERE e.preferred_name NOT LIKE 'SYNTHETIC%'
       AND ($1::uuid[]='{}' OR e.id=ANY($1::uuid[]))
       AND EXISTS (SELECT 1 FROM entity_role_assertions era WHERE era.entity_id=e.id AND era.review_status IN ('approved','published'))
     ORDER BY e.preferred_name LIMIT 6`, [ids]);
  return NextResponse.json({ entities:result.rows, dimensions:["native role","claimed lifetime","composition and witness dates","birth and upbringing","calling or awakening","teachings","reviewed passages"] });
}
