import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(_request:Request,context:{params:Promise<{id:string}>}){const {id}=await context.params;const result=await db().query(`SELECT e.*,
  coalesce((SELECT json_agg(json_build_object('role_key',era.role_key,'native_label',era.native_label,'tradition',era.tradition,'community',era.community,'confidence',era.confidence,'claim_id',era.source_claim_id)) FROM entity_role_assertions era WHERE era.entity_id=e.id AND era.review_status IN ('approved','published')),'[]') AS roles,
  coalesce((SELECT json_agg(json_build_object('id',c.id,'class',c.claim_class,'statement',c.statement,'locator',p.locator_value,'source',se.title,'review_status',c.review_status)) FROM claims c LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id WHERE c.subject_entity_id=e.id AND c.review_status IN ('approved','published')),'[]') AS claims,
  coalesce((SELECT json_agg(ta ORDER BY ta.role,ta.earliest_year) FROM temporal_assertions ta WHERE ta.target_type='entity' AND ta.target_id=e.id AND ta.review_status IN ('approved','published')),'[]') AS temporal_assertions
  FROM entities e WHERE e.id=$1`,[id]);if(!result.rows[0])return NextResponse.json({error:{code:'NOT_FOUND',message:'Entity not found',details:{}}},{status:404});return NextResponse.json(result.rows[0]);}

