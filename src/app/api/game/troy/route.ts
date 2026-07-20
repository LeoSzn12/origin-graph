import { NextResponse } from "next/server";
import { z } from "zod";
import {
  TROY_CITATIONS,
  TROY_ROUNDS,
  buildTroyProfile,
  gradeEvidenceGame,
  type EvidenceGameChallenge,
} from "@/domain/evidence-game";
import { apiError } from "@/http";

const answerSchema = z.object({
  answers: z.object({
    inference: z.string().optional(),
    independence: z.string().optional(),
    chronology: z.string().optional(),
    "next-evidence": z.string().optional(),
  }),
});

export async function GET() {
  const challenge: EvidenceGameChallenge = {
    id: "troy-historicity",
    slug: "troy",
    caseNumber: "002",
    title: "The Battle of Troy",
    question: "Was there a historical conflict behind Homer's Trojan War?",
    deckLabel: "Featured investigation · 4 rounds",
    era: "Late Bronze Age · c. 1300–1180 BCE",
    region: "Anatolia & the Aegean",
    difficulty: "Intermediate",
    accent: "rust",
    caseFileHref: "/ask",
    reviewedClaimCount: 4,
    reviewedSourceCount: TROY_CITATIONS.length,
    discoveryLeadCount: 2,
    rounds: TROY_ROUNDS,
    citations: TROY_CITATIONS,
    profile: buildTroyProfile(),
  };
  return NextResponse.json({ challenge });
}

export async function POST(request: Request) {
  try {
    const { answers } = answerSchema.parse(await request.json());
    return NextResponse.json({
      result: gradeEvidenceGame(answers, "troy-historicity"),
    });
  } catch (error) {
    return apiError(error);
  }
}
