import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ClaimService } from "@/domain/services";
import { apiError, requestActor } from "@/http";

const schema=z.object({claim_class:z.string().min(1),statement:z.string().min(3),directness:z.number().int().min(0).max(4).optional(),interpretation_level:z.number().int().min(0).max(4).optional()});
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{const {id}=await context.params;const input=schema.parse(await request.json());const claim=await new ClaimService(db()).createDraft({passageId:id,claimClass:input.claim_class,statement:input.statement,directness:input.directness,interpretationLevel:input.interpretation_level,createdBy:requestActor(request)});return NextResponse.json(claim,{status:201});}catch(error){return apiError(error);}}
