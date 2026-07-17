import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { requestActor, apiError, clientAddress } from "@/http";
import { transcriptInputSchema } from "@/ingestion/schemas";
import { SourceInputService } from "@/ingestion/source-input-service";
import { enforceRateLimit, privacySafeClientKey } from "@/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(db(), `transcript:${privacySafeClientKey(clientAddress(request))}`, 10, 3600);
    const input = transcriptInputSchema.parse(await request.json());
    const record = await new SourceInputService(db()).registerTranscript(input, requestActor(request));
    return NextResponse.json(record, { status: 201 });
  } catch (error) { return apiError(error); }
}

