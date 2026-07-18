import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { importWorldEnglishBibleChapter } from "@/connectors/open-corpus-import";
import { apiError, requestActor } from "@/http";
const schema=z.object({book:z.string().regex(/^[1-3]?[A-Za-z]{2,3}$/),chapter:z.number().int().positive()});
export async function POST(request:NextRequest){try{const input=schema.parse(await request.json());const result=await importWorldEnglishBibleChapter(db(),{...input,actor:requestActor(request)});return NextResponse.json(result,{status:201});}catch(error){return apiError(error);}}
