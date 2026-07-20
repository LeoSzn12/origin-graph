import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(){const result=await db().query(`SELECT c.id,c.statement,c.claim_class,c.evidence_role,c.review_status,p.locator_value,se.title AS source_title FROM claims c LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id WHERE c.review_status NOT IN ('retracted','blocked','superseded') AND coalesce(se.adapter_key,'') <> 'fixture' ORDER BY c.created_at DESC LIMIT 500`);return NextResponse.json({claims:result.rows});}
