import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ReviewService } from "@/domain/services";
import { apiError, requestActor } from "@/http";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{const {id}=await context.params;await new ReviewService(db()).transition({objectType:"claim",objectId:id,to:"published",reviewer:requestActor(request),note:"Published through claim API."});return NextResponse.json({id,review_status:"published"});}catch(error){return apiError(error);}}
