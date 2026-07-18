export interface ReviewedOpenClaim {
  locator: string;
  sourceAdapter?: "world_english_bible" | "gutenberg";
  sourceStableIdentifier?: string;
  statement: string;
  claimClass: string;
  directness?: number;
  interpretationLevel?: number;
  uncertaintyNote?: string;
  caseFiles?: string[];
  motif?: { slug: string; label: string; definition: string };
  entity?: { name: string; roleKey?: string; nativeLabel?: string; tradition?: string };
}

export const reviewedOpenClaims: ReviewedOpenClaim[] = [
  { locator: "Genesis 6:4", statement: "Genesis 6:4 in the World English Bible reports Nephilim on the earth in the period when the sons of God came to human daughters.", claimClass: "textual_report", caseFiles: ["watchers-giants-hybrid-beings"], motif: { slug: "giant-lineage", label: "Giant lineage", definition: "A textual tradition describing giants or unusually powerful ancestral beings; comparison does not imply biological identity." } },
  { locator: "Genesis 6:13", statement: "Genesis 6:13 presents divine judgment in response to the earth being filled with violence.", claimClass: "textual_report", caseFiles: ["flood-traditions-atlas"] },
  { locator: "Genesis 7:17", statement: "Genesis 7:17 reports that the flood continued for forty days and that rising waters lifted the ark.", claimClass: "chronological_assertion", caseFiles: ["flood-traditions-atlas"], motif: { slug: "world-flood", label: "World flood", definition: "A narrative of destructive inundation affecting the represented world; scope and historical interpretation remain source-specific." } },
  { locator: "Genesis 8:4", statement: "Genesis 8:4 reports that the ark came to rest on the mountains of Ararat in the seventh month.", claimClass: "textual_report", caseFiles: ["flood-traditions-atlas"] },
  { locator: "Genesis 9:11", statement: "Genesis 9:11 reports a covenant promise that a flood would not again destroy all flesh.", claimClass: "textual_report", caseFiles: ["flood-traditions-atlas"] },
  { locator: "Exodus 2:10", statement: "Exodus 2:10 reports that Pharaoh's daughter raised the child and named him Moses.", claimClass: "textual_report", entity: { name: "Moses", tradition: "Judaism / Christianity" } },
  { locator: "Exodus 3:4", statement: "Exodus 3:4 reports Moses being called by name from the burning bush scene.", claimClass: "textual_report", entity: { name: "Moses", tradition: "Judaism / Christianity" } },
  { locator: "Deuteronomy 34:10", statement: "Deuteronomy 34:10 identifies Moses as a prophet of exceptional direct encounter within Israel's tradition.", claimClass: "textual_description", entity: { name: "Moses", roleKey: "prophet", nativeLabel: "prophet (WEB English)", tradition: "Judaism / Christianity" } },
  { locator: "Matthew 3:13", statement: "Matthew 3:13 reports Jesus coming from Galilee to John at the Jordan for baptism.", claimClass: "textual_report", entity: { name: "Jesus", tradition: "Christianity" } },
  { locator: "Matthew 5:3", statement: "Matthew 5:3 begins the Beatitudes by presenting Jesus teaching about the blessedness of the poor in spirit.", claimClass: "textual_report", entity: { name: "Jesus", tradition: "Christianity" } },
  { locator: "Luke 4:18", statement: "Luke 4:18 presents Jesus reading a mission-oriented passage concerning good news, release, recovery of sight, and liberty.", claimClass: "textual_report", entity: { name: "Jesus", tradition: "Christianity" } },
  { locator: "John 1:38", statement: "John 1:38 records disciples addressing Jesus as Rabbi and explicitly glosses that title as Teacher.", claimClass: "textual_description", entity: { name: "Jesus", roleKey: "teacher", nativeLabel: "Rabbi", tradition: "Christianity" } },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:1572",
    locator: "Timaeus dialogue — Critias account of Atlantis",
    statement: "In the Timaeus dialogue, Critias' account places Atlantis beyond the Pillars of Heracles and reports its disappearance following earthquakes and floods.",
    claimClass: "textual_report",
    caseFiles: ["atlantis-in-plato"],
    motif: { slug: "lost-place-cataclysm", label: "Lost place and cataclysm", definition: "A narrative in which a named place is destroyed or made inaccessible by a catastrophe; coding does not establish historicity." },
  },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:77935",
    locator: "1 Enoch chapters 6–7",
    statement: "The R. H. Charles translation of 1 Enoch 6–7 reports heavenly beings taking wives and offspring described as giants.",
    claimClass: "textual_report",
    caseFiles: ["watchers-giants-hybrid-beings"],
    motif: { slug: "giant-lineage", label: "Giant lineage", definition: "A textual tradition describing giants or unusually powerful ancestral beings; comparison does not imply biological identity." },
  },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:15474",
    locator: "Mahabharata Volume 1 — celestials in the firmament, vimanam note marker",
    statement: "Ganguli's English rendering describes celestials standing in the firmament in their respective spheres and marks the passage with translator note 107.",
    claimClass: "translation_observation",
    directness: 4,
    interpretationLevel: 1,
    caseFiles: ["vimanas-sky-vehicles"],
  },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:15474",
    locator: "translator note 107 on vimanam",
    statement: "Translator note 107 identifies the original term as 'Vimanam' and glosses it as 'a car.'",
    claimClass: "translation_observation",
    directness: 4,
    interpretationLevel: 0,
    uncertaintyNote: "This is evidence about one translator's lexical choice, not evidence for an aircraft interpretation.",
    caseFiles: ["vimanas-sky-vehicles"],
  },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:15474",
    locator: "Section CLXXII — fiery celestial weapon",
    statement: "Mahabharata Section CLXXII reports Arjuna invoking a fiery weapon transmitted through named teachers and says it burns a Gandharva's chariot.",
    claimClass: "textual_report",
    caseFiles: ["divine-astral-weapons"],
    motif: { slug: "divine-weapon", label: "Divine or celestial weapon", definition: "A textual motif in which an extraordinary weapon is granted, invoked, or attributed to a divine or celestial source; coding does not identify a modern technology." },
  },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:2017",
    locator: "Dhammapada chapter XIV, verses 179–185",
    statement: "The Müller translation of Dhammapada chapter XIV calls the Buddha 'the Awakened' and presents purification of mind, patience, restraint, and non-harm as teachings of the Awakened.",
    claimClass: "teaching_summary",
    directness: 3,
    interpretationLevel: 1,
    uncertaintyNote: "Role wording and teaching summary are specific to this historical English translation and selected verses.",
    entity: { name: "The Buddha", roleKey: "awakened_teacher", nativeLabel: "Buddha (the Awakened)", tradition: "Buddhism" },
  },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:3330",
    locator: "Analects book I, chapter I",
    statement: "The Legge translation of Analects book I attributes to 'the Master' sayings on learning with perseverance, receiving friends, and remaining composed when unrecognized.",
    claimClass: "teaching_summary",
    directness: 3,
    interpretationLevel: 1,
    uncertaintyNote: "The label 'Master' is the historical English translation's presentation and is not asserted as a universal sacred category.",
    entity: { name: "Confucius", roleKey: "teacher", nativeLabel: "the Master (Legge English)", tradition: "Confucian tradition" },
  },
  {
    sourceAdapter: "gutenberg",
    sourceStableIdentifier: "gutenberg:2800",
    locator: "Koran sura 33 — Muhammad described as apostle and seal of the prophets",
    statement: "Rodwell's historical English translation of Quran 33:40 describes Muhammad as an apostle of God and the seal of the prophets.",
    claimClass: "textual_description",
    directness: 4,
    interpretationLevel: 0,
    uncertaintyNote: "This is an older public-domain English translation; comparison must retain its edition identity and should not substitute it for Arabic or current reviewed translations.",
    entity: { name: "Muhammad", roleKey: "prophet", nativeLabel: "seal of the prophets (Rodwell English)", tradition: "Islam" },
  },
];
