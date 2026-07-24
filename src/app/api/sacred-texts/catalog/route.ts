import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/http";
import { SacredTextSearchService } from "@/sacred-texts/search";

export async function GET(){
  try{return NextResponse.json(await new SacredTextSearchService(db()).catalog());}
  catch(error){return apiError(error,"SACRED_CATALOG_FAILED",500);}
}
