export type GameOption = {
  id: string;
  label: string;
};

export type GameRound = {
  id: "inference" | "independence" | "chronology" | "next-evidence";
  number: string;
  skill: string;
  prompt: string;
  context: string;
  options: GameOption[];
};

export type GameCitation = {
  label: string;
  locator: string;
  href: string;
};

export type GameProfileDimension = {
  label: string;
  state: "present" | "limited" | "missing" | "open";
  value: string;
  detail: string;
};

export type EvidenceGameChallenge = {
  id: string;
  title: string;
  question: string;
  deckLabel: string;
  caseFileHref: string;
  reviewedClaimCount: number;
  reviewedSourceCount: number;
  discoveryLeadCount: number;
  rounds: GameRound[];
  citations: GameCitation[];
  profile: GameProfileDimension[];
};

export type EvidenceGameResult = {
  playerScore: number;
  maxScore: number;
  correctCount: number;
  totalRounds: number;
  rank: "Field assistant" | "Source critic" | "Evidence cartographer";
  results: Array<{
    roundId: GameRound["id"];
    correct: boolean;
    correctOptionId: string;
    explanation: string;
    citationIndex?: number;
  }>;
};

export const ATLANTIS_ROUNDS: GameRound[] = [
  {
    id: "inference",
    number: "01",
    skill: "Read the claim",
    prompt: "What does the reviewed Timaeus passage establish?",
    context: "Critias' account places Atlantis beyond the Pillars of Heracles and describes its disappearance after earthquakes and floods.",
    options: [
      { id: "textual-report", label: "Plato's Timaeus contains an Atlantis narrative with those details." },
      { id: "verified-city", label: "Archaeology has verified Atlantis as a historical city." },
      { id: "certain-location", label: "The passage identifies a modern location with certainty." }
    ]
  },
  {
    id: "independence",
    number: "02",
    skill: "Trace the sources",
    prompt: "How many independent eyewitness accounts are represented by these editions?",
    context: "The packet includes Timaeus records from Project Gutenberg plus a Critias edition lead. Editions and later reproductions can preserve a text without becoming independent ancient witnesses.",
    options: [
      { id: "zero-witnesses", label: "Zero independent eyewitness accounts." },
      { id: "one-witness", label: "One eyewitness account because Plato names a chain of transmission." },
      { id: "three-witnesses", label: "Three eyewitness accounts because three source records are listed." }
    ]
  },
  {
    id: "chronology",
    number: "03",
    skill: "Keep dates honest",
    prompt: "How should the game place Atlantis on a timeline?",
    context: "A narrated event date, the dialogue's composition date, and a modern edition date answer different questions. Combining them creates false certainty.",
    options: [
      { id: "separate-roles", label: "Show each date separately and label its temporal role and uncertainty." },
      { id: "oldest-date", label: "Use only the oldest narrated date as the historical event date." },
      { id: "edition-date", label: "Use the Project Gutenberg edition date for the Atlantis event." }
    ]
  },
  {
    id: "next-evidence",
    number: "04",
    skill: "Choose the next test",
    prompt: "Which discovery would most strengthen a historical-location hypothesis?",
    context: "A visual resemblance can generate a lead. A strong test needs a secure context, independent analysis, and features predicted before the match was proposed.",
    options: [
      { id: "dated-site", label: "A securely dated archaeological context with provenance and independently reviewed, distinctive matches." },
      { id: "map-shape", label: "A satellite image whose outline resembles a ring." },
      { id: "many-posts", label: "Many websites repeating the same modern location theory." }
    ]
  }
];

const ANSWERS: Record<GameRound["id"], { option: string; explanation: string; citationIndex?: number }> = {
  inference: {
    option: "textual-report",
    explanation: "A primary text can establish what the text reports. It does not, by itself, establish that the narrated city existed.",
    citationIndex: 0
  },
  independence: {
    option: "zero-witnesses",
    explanation: "Multiple editions of Plato are useful for textual comparison, but they are not multiple independent witnesses to the narrated event.",
    citationIndex: 0
  },
  chronology: {
    option: "separate-roles",
    explanation: "Claimed event, composition, witness, edition, observation, and phenomenon dates must remain separate so uncertainty stays visible.",
    citationIndex: 0
  },
  "next-evidence": {
    option: "dated-site",
    explanation: "A provenanced, securely dated context with independent review can test a location hypothesis. Shape resemblance and repetition cannot.",
  }
};

export function gradeEvidenceGame(answers: Partial<Record<GameRound["id"], string>>): EvidenceGameResult {
  const results = ATLANTIS_ROUNDS.map((round) => {
    const answer = ANSWERS[round.id];
    return {
      roundId: round.id,
      correct: answers[round.id] === answer.option,
      correctOptionId: answer.option,
      explanation: answer.explanation,
      citationIndex: answer.citationIndex
    };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const playerScore = correctCount * 250;
  const rank = correctCount === 4 ? "Evidence cartographer" : correctCount >= 2 ? "Source critic" : "Field assistant";
  return { playerScore, maxScore: 1000, correctCount, totalRounds: results.length, rank, results };
}

export function buildAtlantisProfile(input: {
  reviewedClaimCount: number;
  reviewedSourceCount: number;
  discoveryLeadCount: number;
  physicalEvidenceCount: number;
}): GameProfileDimension[] {
  return [
    {
      label: "Primary textual report",
      state: input.reviewedClaimCount > 0 ? "present" : "missing",
      value: input.reviewedClaimCount > 0 ? "Present" : "Missing",
      detail: `${input.reviewedClaimCount} exact-locator reviewed claim${input.reviewedClaimCount === 1 ? "" : "s"}`
    },
    {
      label: "Independent ancient corroboration",
      state: "missing",
      value: "Not established",
      detail: "Edition count is not witness independence"
    },
    {
      label: "Material evidence",
      state: input.physicalEvidenceCount > 0 ? "limited" : "missing",
      value: input.physicalEvidenceCount > 0 ? "Attached, needs comparison" : "Not attached",
      detail: `${input.physicalEvidenceCount} reviewed physical-scientific claim${input.physicalEvidenceCount === 1 ? "" : "s"}`
    },
    {
      label: "Candidate locations",
      state: input.discoveryLeadCount > 0 ? "open" : "missing",
      value: input.discoveryLeadCount > 0 ? "Discovery stage" : "No reviewed leads",
      detail: `${input.discoveryLeadCount} lead${input.discoveryLeadCount === 1 ? "" : "s"}; leads are not evidence`
    },
    {
      label: "Current reading",
      state: "open",
      value: "Textually attested, historically unresolved",
      detail: `${input.reviewedSourceCount} reviewed source record${input.reviewedSourceCount === 1 ? "" : "s"}; no truth percentage`
    }
  ];
}
