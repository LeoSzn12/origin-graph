import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { AskService } from "@/research/ask-service";
import { apiError, clientAddress } from "@/http";
import { enforceRateLimit, privacySafeClientKey } from "@/security/rate-limit";

const schema = z.object({ question: z.string().trim().min(3), filters: z.record(z.string(), z.unknown()).optional() });

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(db(), `ask:${privacySafeClientKey(clientAddress(request))}`, 30, 3600);
    const { question } = schema.parse(await request.json());
    return NextResponse.json(await new AskService(db()).ask(question));
  } catch (error) { return apiError(error); }
}

