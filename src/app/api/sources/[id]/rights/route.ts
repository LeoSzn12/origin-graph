import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { SourceService } from "@/domain/services";
import { apiError, requestActor } from "@/http";

const schema = z.object({
  lane: z.enum(["green","yellow","red"]),
  publication_allowed: z.boolean(),
  full_text_publication_allowed: z.boolean(),
  note: z.string().trim().min(1),
  license_name: z.string().optional(),
  license_url: z.url().optional(),
  attribution_text: z.string().optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const record = await new SourceService(db()).reviewRights({
      sourceEditionId: id, lane: input.lane, publicationAllowed: input.publication_allowed,
      fullTextPublicationAllowed: input.full_text_publication_allowed, reviewer: requestActor(request),
      note: input.note, licenseName: input.license_name, licenseUrl: input.license_url,
      attributionText: input.attribution_text
    });
    return NextResponse.json(record);
  } catch (error) { return apiError(error); }
}

