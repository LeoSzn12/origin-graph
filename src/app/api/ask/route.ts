import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { AskService } from "@/research/ask-service";
import { apiError, clientAddress } from "@/http";
import { enforceRateLimit, privacySafeClientKey } from "@/security/rate-limit";

const schema = z.object({ question: z.string().trim().min(3), filters: z.object({ evidence_roles:z.array(z.enum(["primary_tradition","physical_scientific","academic_interpretation","modern_discourse","reference_metadata"])).optional(),traditions:z.array(z.string().min(1)).optional(),from_year:z.number().int().min(-10000000).max(3000).optional(),to_year:z.number().int().min(-10000000).max(3000).optional() }).optional() });

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(db(), `ask:${privacySafeClientKey(clientAddress(request))}`, 30, 3600);
    const { question,filters } = schema.parse(await request.json());
    return NextResponse.json(await new AskService(db()).ask(question,filters));
  } catch (error) { return apiError(error); }
}
