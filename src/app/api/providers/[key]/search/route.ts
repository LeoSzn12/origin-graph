import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ProviderService } from "@/connectors/provider-service";
import { apiError, requestActor } from "@/http";
import { enforceRateLimit, privacySafeClientKey } from "@/security/rate-limit";

const schema = z.object({ query: z.string().trim().min(2).max(300),limit:z.number().int().min(1).max(25).default(12) });
export async function POST(request: NextRequest, context: { params: Promise<{key:string}> }) {
  try {
    const {key}=await context.params;
    await enforceRateLimit(db(),`provider:${key}:${privacySafeClientKey(requestActor(request))}`,60,3600);
    const {query,limit}=schema.parse(await request.json());
    return NextResponse.json({results:await new ProviderService(db()).search(key,query,requestActor(request),limit)});
  } catch (error) { return apiError(error); }
}
