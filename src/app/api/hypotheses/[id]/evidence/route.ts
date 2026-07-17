import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { HypothesisService } from "@/domain/services";
import { apiError, requestActor } from "@/http";

const schema = z.object({ claim_id: z.uuid(), stance: z.enum(["supports","challenges","contextualizes","ambiguous","cannot_test"]), evidence_domain: z.string().min(1), independence_cluster: z.string().optional(), reviewer_note: z.string().optional() });
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const evidenceId = await new HypothesisService(db()).addEvidence({ hypothesisId: id, claimId: input.claim_id, stance: input.stance, evidenceDomain: input.evidence_domain, independenceCluster: input.independence_cluster, reviewerNote: input.reviewer_note, actor: requestActor(request) });
    return NextResponse.json({ id: evidenceId }, { status: 201 });
  } catch (error) { return apiError(error); }
}

