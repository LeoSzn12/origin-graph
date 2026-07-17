import { NextResponse } from "next/server";
import { getAdminSummary } from "@/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAdminSummary(), {
    headers: { "Cache-Control": "private, no-store" }
  });
}
