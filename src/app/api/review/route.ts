import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await db().query("SELECT * FROM review_queue ORDER BY created_at DESC LIMIT 200");
  return NextResponse.json({ items: result.rows });
}

