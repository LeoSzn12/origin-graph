# Source and license report

## Current reviewed pilot

The repository now contains a bounded real-source pilot in addition to labeled synthetic tests. It does not contain a complete world corpus.

| Source family | Material used | Rights/publication treatment |
| --- | --- | --- |
| World English Bible | 459 exact verses from selected chapters | Public-domain edition; exact locators, hashes, and stable source URLs retained |
| World English Bible Protestant and Catholic USFM packages | Full-edition importers for 66- and 73-book public-domain editions | Downloaded source archives are hashed; faithful text requirement and edition labels retained |
| JPS TaNaKH 1917 | Full public-domain Tanakh USFM package | Jewish edition identity, traditional canon grouping, exact verse locators, and source URL retained |
| Tanzil Uthmani Quran | 6,236 Arabic ayahs | Verbatim-only redistribution; Tanzil attribution and link are mandatory; no text normalization |
| Rodwell Quran / Arnold Bhagavad Gita / Charles 1 Enoch | Complete public-domain US Project Gutenberg source files | Historical translations; exact edition and jurisdiction notes retained |
| Project Gutenberg | Exact line ranges from selected public-domain US editions of *Timaeus*, *1 Enoch*, *Mahabharata*, *Dhammapada*, *Analects*, and Rodwell's Quran translation | Edition-specific Gutenberg notices and URLs retained; downstream users must consider their jurisdiction |
| Crossref | DOI metadata and a reviewed paper abstract | Metadata/abstract only; no publisher full text copied |
| PBDB | Two exact occurrence API records | Record URL, collection/reference identifiers, intervals, and age uncertainty retained |
| NOAA/WDS | One exact paleoclimate study record | Dataset coverage and study link retained; no causal inference fabricated |
| Pleiades | Reviewed ancient-place records | “Pleiades contributors, CC BY 3.0” attribution retained |
| Wikipedia, Wikisource, Wikidata, LOC, Internet Archive, Sefaria | Bounded discovery/reference results | Candidates only unless a named edition is separately reviewed and promoted |

The older checkpoint statement below is retained for history and no longer describes the current database.

Earlier checkpoint: no real source corpus was bundled at that review gate.

Synthetic fixtures remain labeled `SYNTHETIC`; they are behavioral tests, not historical evidence, and are excluded from public research queries.

The application records rights per source edition using Green, Yellow, and Red lanes. Unknown rights default to Yellow, block full-text publication, and require a named human review before publication. User-provided transcript text remains private; only reviewed rights-safe summaries and metadata may be published.

Pleiades import is disabled by default and creates a draft only. Where Pleiades data is eventually approved for display, the UI preserves the required “Pleiades contributors, CC BY 3.0” attribution. No Tanzil or Sefaria text is included; future adapters must preserve Tanzil notices and Arabic text integrity and inspect Sefaria rights per version.

Before any real-source pilot, an editor must record edition identifier, stable URL, evidence role, license/rights note, publication allowance, full-text allowance, reviewer, review date, exact locator, source family, and any required attribution.

The live provider registry and its current credential/review gates are documented in [CORPUS_CONNECTION_MATRIX.md](CORPUS_CONNECTION_MATRIX.md). External search results enter `external_records` in Inbox state. Promotion creates a source draft with publication disabled; it does not create a published claim.
