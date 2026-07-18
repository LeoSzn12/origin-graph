# Corpus and evidence connection matrix

Origin Graph does not treat “available online” as equivalent to “licensed, verified, and safe to publish.” A provider connection has three independent states: catalog visibility, live metadata/reference search, and approved edition content.

The registry currently contains 25 providers. “Connected” below means a bounded adapter or controlled importer exists; it never means an entire provider corpus is copied or automatically published.

| Provider | Domain | Current connection | Publication boundary |
| --- | --- | --- | --- |
| World English Bible | Bible | Controlled chapter importer; reviewed pilot loaded | Named public-domain edition only; exact verse locators and hashes retained |
| Project Gutenberg | Public-domain editions | OPDS discovery plus controlled line-range importer; reviewed pilot loaded | Gutenberg US status is not a global rights guarantee; edition notice retained |
| Wikipedia | Reference summaries | Live bounded reference search | Reference/discovery only; not treated as primary evidence |
| Wikisource | Public-source editions | Live bounded MediaWiki search | Review edition, transcription status, and license before promotion |
| Wikidata | Linked open metadata | Live bounded entity search | Preserve identifiers and source references; never substitute metadata for a claim source |
| Sefaria | Tanakh, rabbinic and Jewish texts | Exact-reference metadata preview | Select and record the license for the named version before storing text |
| Quran Foundation | Quran, translations, tafsir metadata | Credential adapter registered | Requires client credentials; preserve Arabic/translation resource terms |
| Tanzil | Verified Arabic Quran text | Manual controlled import registered | Arabic must remain unmodified and Tanzil notice must remain visible |
| Perseus / Scaife CTS | Greek and Latin texts, Plato and historiography | CTS provider registered | Edition and translation review required before passage import |
| Chinese Text Project | Classical Chinese texts | Provider registered | API/reuse approval required; metadata/reference first |
| GRETIL | Vedic, Sanskrit, epic, Buddhist and Jain texts | Manual import registered | File and edition provenance reviewed individually |
| BDRC | Tibetan and Buddhist works/scans | Linked-data provider registered | Metadata, scan, and text rights vary by record |
| SAT Daizōkyō | Chinese/Japanese Buddhist canon research | Discovery provider registered | Reference-only until reuse terms are approved |
| Library of Congress | Global books, manuscripts, maps and collections | Live no-key metadata search | Item rights remain record-specific |
| Europeana | European/global cultural heritage | Credential adapter registered | Provider and object rights statements retained |
| Smithsonian Open Access | Museum/archive/library objects | Credential adapter registered | CC0 assets can become Green only after record verification |
| Internet Archive | Scanned editions and media | Configured discovery-metadata search | Archive presence is never proof of public domain |
| Pleiades | Ancient geography | Live exact-ID lookup | Preserve Pleiades contributors / CC BY 3.0 attribution |
| Open Context | Archaeological datasets | Provider registered | Dataset licenses and sensitive-site policies reviewed per record |
| NOAA/WDS Paleoclimatology | Proxy records and reconstructions | Live no-key study search | Preserve investigators, methods, chronology and dataset links |
| Neotoma | Paleoecology | API registered | Search mapping pending; preserve dataset and chronology-model provenance |
| Paleobiology Database | Fossils, taxa and geological intervals | Live no-key occurrence search | Preserve collection/reference attribution and uncertainty |
| Crossref | Scholarly DOI metadata | Live no-key work search | Abstract/full-text rights remain publisher/work-specific |
| OpenAlex | Scholarship and citation graph | Credential adapter registered | Preserve OA/retraction fields and linked-content rights |

## Research lanes still requiring curated source selection

- African oral and written traditions need named archives, field editions, community context, and appropriate cultural permissions rather than a generic “African corpus.”
- Maya and other Indigenous American materials need edition-specific sources, language/community context, and sensitivity review. Library of Congress provides discovery coverage but is not the editorial source by itself.
- Japanese historical and Shintō materials need a selected scholarly/public-domain edition provider beyond the current SAT Buddhist catalog.
- Bible translations outside Sefaria/Perseus require named edition licenses; “the Bible” is not a single reusable text object.
- Archaeological case files such as the pyramids, Sphinx, Atlantis candidates, and Sumerian chronology require a reviewed mix of primary texts, excavation reports, museum records, scientific datasets, and serious counterarguments.

## Required credentials

- `QURAN_CLIENT_ID` and `QURAN_CLIENT_SECRET`
- `EUROPEANA_API_KEY`
- `SMITHSONIAN_API_KEY`
- `OPENALEX_API_KEY`

Credentials enable bounded metadata retrieval only. They never bypass the source inbox, rights review, exact-locator requirement, or human publication decision.
