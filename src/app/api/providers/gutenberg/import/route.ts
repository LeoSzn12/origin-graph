import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { importGutenbergExcerpts } from "@/connectors/open-corpus-import";
import { apiError,requestActor } from "@/http";
const schema=z.object({ebook_id:z.number().int().positive(),ranges:z.array(z.object({start:z.number().int().positive(),end:z.number().int().positive(),label:z.string().min(1)})).min(1).max(20)});
export async function POST(request:NextRequest){try{const input=schema.parse(await request.json());return NextResponse.json(await importGutenbergExcerpts(db(),{ebookId:input.ebook_id,ranges:input.ranges,actor:requestActor(request)}),{status:201});}catch(error){return apiError(error);}}
