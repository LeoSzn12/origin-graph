export type SacredCoverageGroup = {
  key: string;
  label: string;
  matching_passages: number;
  distinct_references: number;
  editions: number;
};

export type SacredCoverage = {
  matching_passages: number;
  distinct_references: number;
  shown_passages: number;
  text_groups_with_matches: number;
  groups: SacredCoverageGroup[];
};

export type SensemakingMeasure = {
  key: "recurrence" | "independence" | "detail_agreement" | "external_corroboration";
  label: string;
  value: string;
  tone: "positive" | "caution" | "neutral";
  explanation: string;
};

export type CompetingExplanation = {
  title: string;
  interpretation: string;
  would_strengthen: string;
  caution: string;
};

export type SacredSensemaking = {
  signal: "broad_recurrence" | "partial_recurrence" | "single_group" | "no_match";
  headline: string;
  bottom_line: string;
  measures: SensemakingMeasure[];
  established: string[];
  not_established: string[];
  explanations: CompetingExplanation[];
  next_questions: string[];
};

type SensemakingInput = {
  normalizedQuery: string;
  concept: string | null;
  coverage: SacredCoverage;
};

const sharedCautions = {
  inheritance:
    "The Torah, Christian Bible, Quran, and related writings can share people, stories, and literary ancestry. Repetition among related sources is not the same as independent confirmation.",
  language:
    "A keyword match identifies a place to investigate. It does not yet show that the passages describe the same event, being, chronology, or meaning.",
  history:
    "Religious texts are evidence for the traditions, beliefs, and narratives they preserve. A historical event needs additional chronological, material, geographic, or independent documentary evidence."
};

const topicExplanations: Record<string,CompetingExplanation[]> = {
  flood:[
    {
      title:"A shared or inherited story",
      interpretation:"Later communities preserved, adapted, or responded to an earlier flood tradition.",
      would_strengthen:"Textual dependencies, shared sequence details, distinctive wording, and a defensible transmission path.",
      caution:"Related Abrahamic texts cannot be counted as fully independent witnesses."
    },
    {
      title:"Memories of regional disasters",
      interpretation:"Different communities preserved memories of severe local or regional floods.",
      would_strengthen:"Independent traditions tied to distinct locations, dates, sediment layers, settlements, and environmental records.",
      caution:"Similar disasters can produce similar stories without identifying one worldwide event."
    },
    {
      title:"One large historical event",
      interpretation:"Several accounts ultimately refer to the same unusually large flood.",
      would_strengthen:"Convergent dating, geography, archaeology, geology, and records that are demonstrably independent.",
      caution:"Textual recurrence alone cannot determine the event's scale or probability."
    },
    {
      title:"Symbolic or theological reuse",
      interpretation:"Flood language functions as judgment, renewal, chaos, purification, or metaphor rather than as a historical report.",
      would_strengthen:"Genre, literary context, and explicit figurative use within each passage.",
      caution:"A metaphorical use does not disprove that another passage preserves a disaster memory."
    }
  ],
  creation:[
    {
      title:"Shared literary inheritance",
      interpretation:"Creation accounts reuse or answer older regional traditions.",
      would_strengthen:"Distinctive shared sequence, vocabulary, imagery, and a plausible transmission history.",
      caution:"Shared ancestry explains similarity without making every account identical."
    },
    {
      title:"Independent answers to common questions",
      interpretation:"Communities independently developed accounts of origins, order, life, and human purpose.",
      would_strengthen:"Comparable themes without a traceable borrowing path or distinctive shared narrative details.",
      caution:"A universal question can produce broad similarity while the cosmologies remain substantially different."
    },
    {
      title:"Theological or philosophical models",
      interpretation:"The accounts primarily express claims about divinity, duty, being, or cosmic order.",
      would_strengthen:"Genre and context showing argument, hymn, symbolism, or instruction rather than chronological reportage.",
      caution:"Theological purpose and historical claims are not mutually exclusive, but they require separate tests."
    }
  ],
  giants:[
    {
      title:"A connected ancient tradition",
      interpretation:"Named giant or superhuman-being traditions traveled between related communities.",
      would_strengthen:"Shared names, genealogies, episodes, wording, and a traceable textual relationship.",
      caution:"Watchers, Nephilim, Rephaim, jinn, and devas should not be merged merely because they seem non-human."
    },
    {
      title:"Memory of unusual people or warriors",
      interpretation:"Stories magnified encounters with exceptionally tall, powerful, foreign, or elite groups.",
      would_strengthen:"Independent contemporary descriptions plus securely provenanced human remains or material culture.",
      caution:"Later legendary description is not a biological measurement."
    },
    {
      title:"Mythic or symbolic figures",
      interpretation:"Large beings personify chaos, ancestry, violence, divine-human boundaries, or heroic opposition.",
      would_strengthen:"Genre, narrative role, and repeated symbolic use within each tradition.",
      caution:"Similar narrative roles do not establish the same entity."
    }
  ],
  resurrection:[
    {
      title:"Claims about a historical return to life",
      interpretation:"One or more passages make a claim intended as an event in human history.",
      would_strengthen:"Early independent testimony, clear identity continuity, chronology, and evidence resistant to ordinary alternatives.",
      caution:"Later repetition and theological importance do not by themselves establish independence."
    },
    {
      title:"Vision, exaltation, or spiritual transformation",
      interpretation:"Return-to-life language describes a vision, afterlife state, vindication, or transformed existence.",
      would_strengthen:"Source-native vocabulary, genre, and context distinguishing bodily, visionary, and metaphorical claims.",
      caution:"English translations can make different concepts sound more alike than they are."
    },
    {
      title:"Literary or moral restoration",
      interpretation:"Death-and-life language symbolizes communal, ethical, or spiritual renewal.",
      would_strengthen:"Explicit metaphor, poetic structure, or a surrounding restoration argument.",
      caution:"Metaphorical passages should not be counted as independent reports of an event."
    }
  ],
  aliens:[
    {
      title:"Source-native spiritual beings",
      interpretation:"The passages describe angels, jinn, devas, Watchers, or celestial beings within their own cosmologies.",
      would_strengthen:"Consistent source-language terms and roles within each text.",
      caution:"Calling these beings extraterrestrials imports a modern category the texts do not explicitly use."
    },
    {
      title:"Visionary or symbolic imagery",
      interpretation:"Unusual beings, vehicles, or heavens belong to vision, poetry, ritual, or symbolic narrative.",
      would_strengthen:"Genre markers, symbolic interpretation within the text, and parallels in the same literary tradition.",
      caution:"Visual resemblance to modern technology is not technical identification."
    },
    {
      title:"A modern extraterrestrial reading",
      interpretation:"Readers interpret ancient descriptions through contemporary ideas about space travel or non-human intelligence.",
      would_strengthen:"Specific, unambiguous technical details that outperform linguistic, historical, and literary explanations.",
      caution:"This remains speculative unless it survives those competing explanations."
    }
  ]
};

function genericExplanations(topic:string):CompetingExplanation[]{
  return[
    {
      title:"A shared or inherited tradition",
      interpretation:`The ${topic} pattern spread through contact, borrowing, translation, or common textual ancestry.`,
      would_strengthen:"Distinctive shared details and a traceable relationship between sources.",
      caution:"Dependent sources should not be counted as separate confirmation."
    },
    {
      title:"Independent recurrence",
      interpretation:`Different communities developed similar ${topic} ideas or accounts independently.`,
      would_strengthen:"Early, geographically separated sources with no plausible transmission path and agreement on specific details.",
      caution:"Broad human concerns often recur independently; that alone does not identify the same event."
    },
    {
      title:"Different meanings under one search term",
      interpretation:`Translation or modern vocabulary makes distinct concepts look like one ${topic} pattern.`,
      would_strengthen:"Passage-level comparison of original terms, genre, actors, sequence, and claimed outcome.",
      caution:"Keyword overlap is the beginning of analysis, not its conclusion."
    }
  ];
}

export function buildSacredSensemaking(input:SensemakingInput):SacredSensemaking{
  const {coverage}=input;
  const topic=input.normalizedQuery || "this topic";
  const groupNames=coverage.groups.map(group=>group.label);
  const groupCount=coverage.text_groups_with_matches;
  const signal:SacredSensemaking["signal"]=
    groupCount>=4?"broad_recurrence":groupCount>=2?"partial_recurrence":groupCount===1?"single_group":"no_match";
  const breadth=signal==="broad_recurrence"?"Broad":signal==="partial_recurrence"?"Partial":signal==="single_group"?"Limited":"None";
  const headline=signal==="no_match"
    ?`No reviewed passage currently matches “${topic}.”`
    :`${breadth} textual recurrence found for “${topic}.”`;
  const bottomLine=signal==="no_match"
    ?"The current corpus does not provide a textual pattern to compare. That may reflect wording, translation, filters, or corpus coverage—not proof that the idea is absent from every tradition."
    :`${coverage.matching_passages.toLocaleString()} matching passage${coverage.matching_passages===1?"":"s"} appear across ${groupCount} text ${groupCount===1?"group":"groups"} (${groupNames.join(", ")}). This establishes recurrence in the indexed texts; it does not by itself establish one event, independent witnesses, or a historical probability.`;

  return{
    signal,
    headline,
    bottom_line:bottomLine,
    measures:[
      {
        key:"recurrence",
        label:"Cross-text recurrence",
        value:breadth,
        tone:groupCount>=4?"positive":groupCount?"neutral":"caution",
        explanation:groupCount
          ?`${groupCount} of the indexed text groups contain matching language.`
          :"No selected text group contains a reviewed match for this search."
      },
      {
        key:"independence",
        label:"Source independence",
        value:groupCount>1?"Unresolved":"Not testable",
        tone:"caution",
        explanation:groupCount>1?sharedCautions.inheritance:"At least two source families are needed before independence can be compared."
      },
      {
        key:"detail_agreement",
        label:"Detail agreement",
        value:groupCount>1?"Needs review":"Not assessed",
        tone:"neutral",
        explanation:sharedCautions.language
      },
      {
        key:"external_corroboration",
        label:"External corroboration",
        value:"Not included",
        tone:"caution",
        explanation:sharedCautions.history
      }
    ],
    established:signal==="no_match"?[
      "No approved or published passage matched the current terms and filters."
    ]:[
      `The indexed corpus contains ${coverage.matching_passages.toLocaleString()} edition-level matches representing ${coverage.distinct_references.toLocaleString()} distinct text-group references.`,
      `${groupCount} text ${groupCount===1?"group preserves":"groups preserve"} related wording: ${groupNames.join(", ")}.`,
      `${coverage.shown_passages.toLocaleString()} representative passages are displayed below for close reading.`
    ],
    not_established:[
      "That every match refers to the same event, being, practice, or idea.",
      "That the matching sources are independent of one another.",
      "That recurrence supplies a numerical probability that a historical claim occurred.",
      "That absence from this result means absence from every edition, language, or tradition."
    ],
    explanations:topicExplanations[input.concept??""]??genericExplanations(topic),
    next_questions:[
      "Do the passages agree on specific actors, sequence, location, cause, scale, and outcome—or only on a broad word?",
      "Which accounts are earliest, and which can be shown to depend on or respond to another source?",
      "What independent archaeology, geology, chronology, inscriptions, or contemporary records would distinguish the explanations?",
      "How do the source-language terms and literary genres change the apparent similarity?"
    ]
  };
}
