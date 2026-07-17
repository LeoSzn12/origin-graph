import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ReviewService } from "@/domain/services";
import { apiError, requestActor } from "@/http";

const schema = z.object({ to: z.enum(["draft","in_review","approved","published","blocked","retracted","superseded"]), note: z.string().optional() });
const allowedTypes = new Set(["source_edition","witness","passage","claim","temporal_assertion","place","entity","entity_role_assertion","event","motif","connection","source_relationship","media_segment","hypothesis","evidence_item","case_file"]);

export async function POST(request: NextRequest, context: { params: Promise<{ objectType: string; id: string }> }) {
  try {
    const { objectType, id } = await context.params;
    if (!allowedTypes.has(objectType)) throw new Error("INVALID_OBJECT_TYPE: unsupported review type");
    const input = schema.parse(await request.json());
    await new ReviewService(db()).transition({ objectType: objectType as never, objectId: id, to: input.to, reviewer: requestActor(request), note: input.note });
    return NextResponse.json({ object_type: objectType, object_id: id, review_status: input.to });
  } catch (error) { return apiError(error); }
}
