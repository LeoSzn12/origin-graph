import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { SourceInputService } from "@/ingestion/source-input-service";
import { sourceInputSchema } from "@/ingestion/schemas";
import { apiError, clientAddress, requestActor } from "@/http";
import { enforceRateLimit, privacySafeClientKey } from "@/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sources: await new SourceInputService(db()).list() });
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(db(), `source:${privacySafeClientKey(clientAddress(request))}`, 20, 3600);
    const input = sourceInputSchema.parse(await request.json());
    const service = new SourceInputService(db());
    const result = input.input_type === "url" || input.input_type === "doi"
      ? await service.register(input, requestActor(request))
      : await service.materializeManual(input, requestActor(request));
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}

