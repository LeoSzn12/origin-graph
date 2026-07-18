import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";

export async function GET(request:NextRequest){const ids=request.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean).slice(0,6)??[];if(ids.length<2)return NextResponse.json({error:{code:"COMPARE_REQUIRES_TWO",message:"Choose at least two hypotheses.",details:{}}},{status:400});const result=await db().query(`SELECT h.*,
  coalesce((SELECT json_agg(json_build_object('id',ei.id,'stance',ei.stance,'domain',ei.evidence_domain,'cluster',ei.independence_cluster,'statement',c.statement,'locator',p.locator_value,'source',se.title)) FROM evidence_items ei JOIN claims c ON c.id=ei.claim_id LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id WHERE ei.hypothesis_id=h.id),'[]') AS evidence
  FROM hypotheses h WHERE h.id=ANY($1::uuid[]) ORDER BY array_position($1::uuid[],h.id)`,[ids]);return NextResponse.json({hypotheses:result.rows,dimensions:["predicted_observations","falsifiers","alternatives","supports","challenges","contextualizes","ambiguous","cannot_test"]});}
