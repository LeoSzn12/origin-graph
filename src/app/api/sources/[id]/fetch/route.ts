import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { apiError } from "@/http";
export async function POST(_request:NextRequest,context:{params:Promise<{id:string}>}){try{const {id}=await context.params;const result=await db().query(`INSERT INTO ingestion_jobs (source_input_id,job_type,status) SELECT $1,'inspect','queued' WHERE EXISTS (SELECT 1 FROM source_inputs WHERE id=$1) ON CONFLICT (source_input_id,job_type,status) DO UPDATE SET available_at=now(),updated_at=now() RETURNING id`,[id]);if(!result.rows[0])throw new Error("NOT_FOUND: source input not found");return NextResponse.json({source_input_id:id,job_id:result.rows[0].id,status:"queued"},{status:202});}catch(error){return apiError(error);}}
