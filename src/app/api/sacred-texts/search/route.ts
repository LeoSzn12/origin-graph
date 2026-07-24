import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiError, clientAddress } from "@/http";
import { enforceRateLimit, privacySafeClientKey } from "@/security/rate-limit";
import { SacredTextSearchService } from "@/sacred-texts/search";

const schema=z.object({
  query:z.string().trim().min(2).max(240),
  filters:z.object({
    traditions:z.array(z.string().regex(/^[a-z0-9-]+$/)).max(10).optional(),
    canons:z.array(z.string().regex(/^[a-z0-9-]+$/)).max(10).optional(),
    editions:z.array(z.string().regex(/^[a-z0-9-]+$/)).max(20).optional(),
    limit:z.number().int().min(1).max(200).optional()
  }).optional()
});

export async function POST(request:NextRequest){
  try{
    await enforceRateLimit(db(),`sacred-search:${privacySafeClientKey(clientAddress(request))}`,60,3600);
    const {query,filters}=schema.parse(await request.json());
    return NextResponse.json(await new SacredTextSearchService(db()).search(query,filters));
  }catch(error){return apiError(error,"SACRED_SEARCH_FAILED");}
}
