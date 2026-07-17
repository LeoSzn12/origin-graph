import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ProviderService } from "@/connectors/provider-service";
import { apiError, requestActor } from "@/http";

const candidate = z.object({ external_id:z.string().min(1),record_type:z.string().min(1),title:z.string().min(1),subtitle:z.string().optional(),canonical_url:z.url().optional(),date_label:z.string().optional(),creators:z.array(z.string()),places:z.array(z.string()),subjects:z.array(z.string()),rights_uri:z.string().optional(),rights_lane:z.enum(["green","yellow","red"]),rights_note:z.string().min(1),safe_summary:z.string().optional(),raw_metadata:z.record(z.string(),z.unknown()) });
export async function POST(request:NextRequest,context:{params:Promise<{key:string}>}){try{const {key}=await context.params;const record=candidate.parse(await request.json());const id=await new ProviderService(db()).stage(key,record,requestActor(request));return NextResponse.json({id,review_status:"inbox"},{status:201});}catch(error){return apiError(error);}}
