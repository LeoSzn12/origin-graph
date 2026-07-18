import { NextResponse } from "next/server";
import { db } from "@/db";
export const dynamic="force-dynamic";
export async function GET(){try{const result=await db().query(`SELECT now() AS checked_at,
  (SELECT count(*)::int FROM ingestion_jobs WHERE status='failed') AS failed_jobs,
  (SELECT count(*)::int FROM source_refresh_policies WHERE refresh_mode='scheduled' AND next_check_at<=now()) AS refresh_due,
  (SELECT count(*)::int FROM source_editions WHERE review_status IN ('approved','published')) AS reviewed_sources`);return NextResponse.json({status:"ok",...result.rows[0],version:process.env.npm_package_version??"0.1.0"},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({status:"degraded"},{status:503,headers:{"Cache-Control":"no-store"}});}}
