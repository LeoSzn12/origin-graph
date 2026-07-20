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
  citationIndex?: number;
  options: GameOption[];
};

export type GameCitation = {
  label: string;
  locator: string;
  href: string;
  role?:
    | "primary text"
    | "archaeology"
    | "historical context"
    | "critical synthesis";
};

export type GameProfileDimension = {
  label: string;
  state: "present" | "limited" | "missing" | "open";
  value: string;
  detail: string;
};

export type EvidenceGameChallenge = {
  id: string;
  slug: "atlantis" | "troy";
  caseNumber: string;
  title: string;
  question: string;
  deckLabel: string;
  era: string;
  region: string;
  difficulty: "Starter" | "Intermediate";
  accent: "night" | "rust";
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
    context:
      "Critias' account places Atlantis beyond the Pillars of Heracles and describes its disappearance after earthquakes and floods.",
    citationIndex: 0,
    options: [
      {
        id: "textual-report",
        label:
          "Plato's Timaeus contains an Atlantis narrative with those details.",
      },
      {
        id: "verified-city",
        label: "Archaeology has verified Atlantis as a historical city.",
      },
      {
        id: "certain-location",
        label: "The passage identifies a modern location with certainty.",
      },
    ],
  },
  {
    id: "independence",
    number: "02",
    skill: "Trace the sources",
    prompt:
      "How many independent eyewitness accounts are represented by these editions?",
    context:
      "The packet includes Timaeus records from Project Gutenberg plus a Critias edition lead. Editions and later reproductions can preserve a text without becoming independent ancient witnesses.",
    citationIndex: 0,
    options: [
      { id: "zero-witnesses", label: "Zero independent eyewitness accounts." },
      {
        id: "one-witness",
        label:
          "One eyewitness account because Plato names a chain of transmission.",
      },
      {
        id: "three-witnesses",
        label:
          "Three eyewitness accounts because three source records are listed.",
      },
    ],
  },
  {
    id: "chronology",
    number: "03",
    skill: "Keep dates honest",
    prompt: "How should the game place Atlantis on a timeline?",
    context:
      "A narrated event date, the dialogue's composition date, and a modern edition date answer different questions. Combining them creates false certainty.",
    citationIndex: 0,
    options: [
      {
        id: "separate-roles",
        label:
          "Show each date separately and label its temporal role and uncertainty.",
      },
      {
        id: "oldest-date",
        label:
          "Use only the oldest narrated date as the historical event date.",
      },
      {
        id: "edition-date",
        label: "Use the Project Gutenberg edition date for the Atlantis event.",
      },
    ],
  },
  {
    id: "next-evidence",
    number: "04",
    skill: "Choose the next test",
    prompt:
      "Which discovery would most strengthen a historical-location hypothesis?",
    context:
      "A visual resemblance can generate a lead. A strong test needs a secure context, independent analysis, and features predicted before the match was proposed.",
    options: [
      {
        id: "dated-site",
        label:
          "A securely dated archaeological context with provenance and independently reviewed, distinctive matches.",
      },
      {
        id: "map-shape",
        label: "A satellite image whose outline resembles a ring.",
      },
      {
        id: "many-posts",
        label: "Many websites repeating the same modern location theory.",
      },
    ],
  },
];

export const TROY_ROUNDS: GameRound[] = [
  {
    id: "inference",
    number: "01",
    skill: "Classify the testimony",
    prompt: "What kind of evidence is Homer's Iliad for a Trojan War?",
    context:
      "The Iliad preserves an epic tradition about Achaean forces fighting at Troy. Its surviving literary form is later than the Late Bronze Age setting it describes.",
    citationIndex: 0,
    options: [
      {
        id: "tradition-evidence",
        label:
          "Strong evidence for an ancient war tradition, but not a contemporary eyewitness record.",
      },
      {
        id: "battle-transcript",
        label: "A verbatim battlefield record written during the siege.",
      },
      {
        id: "no-evidence",
        label: "No historical evidence of any kind because it is poetry.",
      },
    ],
  },
  {
    id: "independence",
    number: "02",
    skill: "Read the archaeology",
    prompt: "What does the mound at Hisarlık establish?",
    context:
      "Excavation revealed a long sequence of settlements, including a fortified Late Bronze Age city and lower town. Archaeological layers can establish place, period, destruction, and rebuilding without identifying Homer's characters.",
    citationIndex: 1,
    options: [
      {
        id: "real-settlement",
        label:
          "A major, long-lived fortified settlement existed at the traditional location of Troy.",
      },
      {
        id: "iliad-proven",
        label:
          "Every major event and named person in the Iliad is archaeologically verified.",
      },
      {
        id: "single-layer",
        label:
          "The mound contains one settlement destroyed in one ten-year siege.",
      },
    ],
  },
  {
    id: "chronology",
    number: "03",
    skill: "Triangulate the context",
    prompt: "How should Wilusa and Ahhiyawa enter the case?",
    context:
      "Hittite records refer to Wilusa and conflict involving Ahhiyawa. The proposed links to Ilios and Achaea create an independently sourced Late Bronze Age context, but the identification does not narrate Homer's war.",
    citationIndex: 2,
    options: [
      {
        id: "context-not-proof",
        label:
          "As independent geopolitical context that makes conflict feasible, not proof of the epic story.",
      },
      {
        id: "same-story",
        label:
          "As a second complete account of Achilles, Helen, and the wooden horse.",
      },
      {
        id: "ignore-tablets",
        label: "Ignore the tablets because only Greek literary sources matter.",
      },
    ],
  },
  {
    id: "next-evidence",
    number: "04",
    skill: "Write the verdict",
    prompt: "Which conclusion best survives all three evidence lanes?",
    context:
      "The literary tradition, the settlement archaeology, and the Hittite political background overlap in place and broad period. They do not converge on the poem's exact sequence, duration, causes, or cast.",
    citationIndex: 3,
    options: [
      {
        id: "layered-verdict",
        label:
          "Troy was real and Late Bronze Age conflict is plausible; Homer's specific war remains historically unresolved.",
      },
      {
        id: "epic-certain",
        label:
          "The entire Iliad is confirmed history because the city existed.",
      },
      {
        id: "nothing-happened",
        label:
          "No conflict could have happened because the poem contains mythic elements.",
      },
    ],
  },
];

type AnswerKey = Record<
  GameRound["id"],
  { option: string; explanation: string; citationIndex?: number }
>;

const ATLANTIS_ANSWERS: AnswerKey = {
  inference: {
    option: "textual-report",
    explanation:
      "A primary text can establish what the text reports. It does not, by itself, establish that the narrated city existed.",
    citationIndex: 0,
  },
  independence: {
    option: "zero-witnesses",
    explanation:
      "Multiple editions of Plato are useful for textual comparison, but they are not multiple independent witnesses to the narrated event.",
    citationIndex: 0,
  },
  chronology: {
    option: "separate-roles",
    explanation:
      "Claimed event, composition, witness, edition, observation, and phenomenon dates must remain separate so uncertainty stays visible.",
    citationIndex: 0,
  },
  "next-evidence": {
    option: "dated-site",
    explanation:
      "A provenanced, securely dated context with independent review can test a location hypothesis. Shape resemblance and repetition cannot.",
  },
};

const TROY_ANSWERS: AnswerKey = {
  inference: {
    option: "tradition-evidence",
    explanation:
      "The poem is primary evidence for the tradition it preserves. Its genre and transmission history prevent treating it as a contemporary campaign report.",
    citationIndex: 0,
  },
  independence: {
    option: "real-settlement",
    explanation:
      "Hisarlık anchors the case to a real, fortified Bronze Age settlement. That is powerful place evidence, but it does not identify Homeric people or verify the poem scene by scene.",
    citationIndex: 1,
  },
  chronology: {
    option: "context-not-proof",
    explanation:
      "The Hittite material is valuable because it is independent of Homer and describes a plausible geopolitical setting. The name links and conflict context still fall short of proving one specific Homeric war.",
    citationIndex: 2,
  },
  "next-evidence": {
    option: "layered-verdict",
    explanation:
      "This conclusion keeps the strongest overlap and the largest gaps visible at the same time. It distinguishes a real place and plausible conflict from a verified epic narrative.",
    citationIndex: 3,
  },
};

export const TROY_CITATIONS: GameCitation[] = [
  {
    label: "Homer, Iliad, Book 2",
    locator:
      "Book 2, the nine-year siege tradition and proposed tenth-year fall",
    href: "https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0217%3Abook%3D2",
    role: "primary text",
  },
  {
    label: "UNESCO World Heritage Centre, Archaeological Site of Troy",
    locator:
      "Outstanding Universal Value: settlement sequence, Troy VI, citadel and lower town",
    href: "https://whc.unesco.org/en/list/849/",
    role: "archaeology",
  },
  {
    label: "British Museum, The search for the lost city of Troy",
    locator: "Sections ‘The city of Troy’ and Hittite Wilusa/Ahhiyawa records",
    href: "https://www.britishmuseum.org/blog/search-lost-city-troy",
    role: "historical context",
  },
  {
    label: "British Museum, Troy: behind the scenes of a Hollywood epic",
    locator:
      "Discussion of archaeological backdrop versus Homer's narrated war",
    href: "https://www.britishmuseum.org/blog/troy-behind-scenes-hollywood-epic",
    role: "critical synthesis",
  },
];

export function gradeEvidenceGame(
  answers: Partial<Record<GameRound["id"], string>>,
  challengeId = "atlantis-source-criticism",
): EvidenceGameResult {
  const isTroy = challengeId === "troy-historicity";
  const rounds = isTroy ? TROY_ROUNDS : ATLANTIS_ROUNDS;
  const answerKey = isTroy ? TROY_ANSWERS : ATLANTIS_ANSWERS;
  const results = rounds.map((round) => {
    const answer = answerKey[round.id];
    return {
      roundId: round.id,
      correct: answers[round.id] === answer.option,
      correctOptionId: answer.option,
      explanation: answer.explanation,
      citationIndex: answer.citationIndex,
    };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const playerScore = correctCount * 250;
  const rank =
    correctCount === 4
      ? "Evidence cartographer"
      : correctCount >= 2
        ? "Source critic"
        : "Field assistant";
  return {
    playerScore,
    maxScore: 1000,
    correctCount,
    totalRounds: results.length,
    rank,
    results,
  };
}

export function buildTroyProfile(): GameProfileDimension[] {
  return [
    {
      label: "Epic tradition",
      state: "present",
      value: "Strongly attested",
      detail: "The Iliad preserves a detailed Greek war tradition",
    },
    {
      label: "Settlement archaeology",
      state: "present",
      value: "Present",
      detail: "A fortified Late Bronze Age city and lower town at Hisarlık",
    },
    {
      label: "Independent political context",
      state: "limited",
      value: "Suggestive",
      detail: "Wilusa and Ahhiyawa texts support a feasible regional setting",
    },
    {
      label: "Named events and people",
      state: "missing",
      value: "Not corroborated",
      detail:
        "No contemporary record verifies the epic's full cast and sequence",
    },
    {
      label: "Current reading",
      state: "open",
      value: "Real city, unresolved war",
      detail:
        "Historical core is plausible; the Homeric narrative is not proven",
    },
  ];
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
      detail: `${input.reviewedClaimCount} exact-locator reviewed claim${input.reviewedClaimCount === 1 ? "" : "s"}`,
    },
    {
      label: "Independent ancient corroboration",
      state: "missing",
      value: "Not established",
      detail: "Edition count is not witness independence",
    },
    {
      label: "Material evidence",
      state: input.physicalEvidenceCount > 0 ? "limited" : "missing",
      value:
        input.physicalEvidenceCount > 0
          ? "Attached, needs comparison"
          : "Not attached",
      detail: `${input.physicalEvidenceCount} reviewed physical-scientific claim${input.physicalEvidenceCount === 1 ? "" : "s"}`,
    },
    {
      label: "Candidate locations",
      state: input.discoveryLeadCount > 0 ? "open" : "missing",
      value:
        input.discoveryLeadCount > 0 ? "Discovery stage" : "No reviewed leads",
      detail: `${input.discoveryLeadCount} lead${input.discoveryLeadCount === 1 ? "" : "s"}; leads are not evidence`,
    },
    {
      label: "Current reading",
      state: "open",
      value: "Textually attested, historically unresolved",
      detail: `${input.reviewedSourceCount} reviewed source record${input.reviewedSourceCount === 1 ? "" : "s"}; no truth percentage`,
    },
  ];
}
