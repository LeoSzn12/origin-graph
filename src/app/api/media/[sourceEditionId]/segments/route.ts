import { NextResponse } from "next/server";
import { db } from "@/db";
export async function GET(_request:Request,context:{params:Promise<{sourceEditionId:string}>}){const {sourceEditionId}=await context.params;const result=await db().query(`SELECT ms.*,p.locator_type,p.locator_value,p.safe_summary,e.preferred_name AS speaker,se.rights_lane AS source_rights_lane,se.title AS source_title FROM media_segments ms JOIN passages p ON p.id=ms.passage_id JOIN source_editions se ON se.id=p.source_edition_id LEFT JOIN entities e ON e.id=ms.speaker_entity_id WHERE p.source_edition_id=$1 AND ms.review_status IN ('approved','published') ORDER BY ms.start_ms`,[sourceEditionId]);return NextResponse.json({segments:result.rows});}

