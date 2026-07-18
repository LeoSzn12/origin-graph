import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ReviewService } from "@/domain/services";
import { apiError, requestActor } from "@/http";
const schema=z.object({decision:z.enum(["in_review","approved","blocked","retracted"]),note:z.string().optional()});
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{const {id}=await context.params;const input=schema.parse(await request.json());await new ReviewService(db()).transition({objectType:"claim",objectId:id,to:input.decision,reviewer:requestActor(request),note:input.note});return NextResponse.json({id,review_status:input.decision});}catch(error){return apiError(error);}}
