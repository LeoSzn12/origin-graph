import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  ATLANTIS_ROUNDS,
  buildAtlantisProfile,
  gradeEvidenceGame,
  type EvidenceGameChallenge,
} from "@/domain/evidence-game";
import { apiError } from "@/http";

type AtlantisPacket = {
  id: string;
  title: string;
  core_question: string;
  reviewed_claim_count: number;
  reviewed_source_count: number;
  discovery_lead_count: number;
  physical_evidence_count: number;
  source_id: string | null;
  source_title: string | null;
  locator_value: string | null;
};

const answerSchema = z.object({
  answers: z.object({
    inference: z.string().optional(),
    independence: z.string().optional(),
    chronology: z.string().optional(),
    "next-evidence": z.string().optional(),
  }),
});

async function loadAtlantisPacket() {
  const result = await db().query<AtlantisPacket>(
    `SELECT cf.id,cf.title,cf.core_question,
      (SELECT count(*)::int FROM case_file_objects cfo JOIN claims c ON cfo.object_type='claim' AND c.id=cfo.object_id WHERE cfo.case_file_id=cf.id AND c.review_status='published') AS reviewed_claim_count,
      (SELECT count(*)::int FROM case_file_objects cfo JOIN source_editions se ON cfo.object_type='source_edition' AND se.id=cfo.object_id WHERE cfo.case_file_id=cf.id AND se.review_status IN ('approved','published')) AS reviewed_source_count,
      (SELECT count(*)::int FROM case_file_external_records cfer WHERE cfer.case_file_id=cf.id) AS discovery_lead_count,
      (SELECT count(*)::int FROM case_file_objects cfo JOIN claims c ON cfo.object_type='claim' AND c.id=cfo.object_id WHERE cfo.case_file_id=cf.id AND c.review_status='published' AND c.evidence_role='physical_scientific') AS physical_evidence_count,
      citation.source_id,citation.source_title,citation.locator_value
     FROM case_files cf
     LEFT JOIN LATERAL (
       SELECT se.id AS source_id,se.title AS source_title,p.locator_value
       FROM case_file_objects cfo
       JOIN claims c ON cfo.object_type='claim' AND c.id=cfo.object_id
       JOIN passages p ON p.id=c.passage_id
       JOIN source_editions se ON se.id=p.source_edition_id
       WHERE cfo.case_file_id=cf.id AND c.review_status='published'
       ORDER BY c.created_at LIMIT 1
     ) citation ON true
     WHERE cf.slug='atlantis-in-plato'`,
  );
  return result.rows[0];
}

export async function GET() {
  const packet = await loadAtlantisPacket();
  if (!packet) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "The Atlantis case file is unavailable.",
          details: {},
        },
      },
      { status: 404 },
    );
  }

  const citation = {
    label: packet.source_title ?? "Reviewed primary source",
    locator: packet.locator_value ?? "Exact locator unavailable",
    href: packet.source_id
      ? `/sources/${packet.source_id}`
      : "/case-files/atlantis-in-plato",
  };
  const challenge: EvidenceGameChallenge = {
    id: "atlantis-source-criticism",
    slug: "atlantis",
    caseNumber: "001",
    title: packet.title,
    question: "Can the reviewed evidence establish a historical Atlantis?",
    deckLabel: "Starter investigation · 4 rounds",
    era: "Classical text · deep-time claim",
    region: "Mediterranean",
    difficulty: "Starter",
    accent: "night",
    caseFileHref: "/case-files/atlantis-in-plato",
    reviewedClaimCount: packet.reviewed_claim_count,
    reviewedSourceCount: packet.reviewed_source_count,
    discoveryLeadCount: packet.discovery_lead_count,
    rounds: ATLANTIS_ROUNDS,
    citations: [citation],
    profile: buildAtlantisProfile({
      reviewedClaimCount: packet.reviewed_claim_count,
      reviewedSourceCount: packet.reviewed_source_count,
      discoveryLeadCount: packet.discovery_lead_count,
      physicalEvidenceCount: packet.physical_evidence_count,
    }),
  };
  return NextResponse.json({ challenge });
}

export async function POST(request: Request) {
  try {
    const { answers } = answerSchema.parse(await request.json());
    return NextResponse.json({
      result: gradeEvidenceGame(answers, "atlantis-source-criticism"),
    });
  } catch (error) {
    return apiError(error);
  }
}
