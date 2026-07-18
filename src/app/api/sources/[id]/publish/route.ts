import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ReviewService } from "@/domain/services";
import { apiError, requestActor } from "@/http";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{const {id}=await context.params;await new ReviewService(db()).transition({objectType:"source_edition",objectId:id,to:"published",reviewer:requestActor(request),note:"Published through source API after rights review."});return NextResponse.json({id,review_status:"published"});}catch(error){return apiError(error);}}
