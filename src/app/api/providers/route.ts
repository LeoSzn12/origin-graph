import { NextResponse } from "next/server";
import { db } from "@/db";
import { ProviderService } from "@/connectors/provider-service";
import { apiError } from "@/http";

export async function GET() {
  try { return NextResponse.json({ providers: await new ProviderService(db()).list() }); }
  catch (error) { return apiError(error); }
}
