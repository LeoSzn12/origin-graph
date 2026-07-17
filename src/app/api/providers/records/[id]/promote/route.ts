import { NextResponse,type NextRequest } from "next/server";
import { db } from "@/db";
import { ProviderService } from "@/connectors/provider-service";
import { apiError,requestActor } from "@/http";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{const {id}=await context.params;const source_edition_id=await new ProviderService(db()).promote(id,requestActor(request));return NextResponse.json({source_edition_id,review_status:'draft'});}catch(error){return apiError(error);}}
