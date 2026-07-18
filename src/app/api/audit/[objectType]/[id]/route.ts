import { NextResponse } from "next/server";
import { db } from "@/db";
export async function GET(_request:Request,context:{params:Promise<{objectType:string;id:string}>}){const {objectType,id}=await context.params;const result=await db().query(`SELECT id,object_type,object_id,action,actor,before_data,after_data,created_at FROM audit_events WHERE object_type=$1 AND object_id=$2 ORDER BY created_at DESC,id DESC LIMIT 250`,[objectType,id]);return NextResponse.json({events:result.rows});}
