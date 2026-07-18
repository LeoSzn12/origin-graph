# Origin Graph implementation report

## Current release candidate — 2026-07-17

This section supersedes the earlier checkpoint narrative below while retaining it as implementation history.

Origin Graph is now a working, authenticated research application across the packet's principal surfaces: governed source discovery and promotion, private upload/URL parsing, review and rights controls, citation-grounded Ask, ten case files, Hypothesis Lab with revisions and triangulation, semantic-band timeline, uncertainty-aware map, typed graph, Sacred Teachers comparison, exports, backups, refresh policy, health endpoint, and an admin data browser.

The current local database contains 25 registered providers (12 enabled/configured), 42 source editions, 488 passages, 38 claims, 31 published non-fixture claims, five explicitly retracted claims retained for audit, 16 public/reviewed chronology assertions, seven native-role assertions, six typed connections, and ten case files. Eight case files contain published pilot claims; Sphinx Chronology and Sumerian King List remain honest bibliographic research leads without fabricated conclusions.

### Current behavioral proof

- Production build: passed, 32 pages generated and all API routes compiled.
- TypeScript: passed after an isolated dev-type regeneration check.
- Automated tests: seven files, 24 tests passed, including timeline collision regression coverage.
- Dependency audit: zero known vulnerabilities at the high threshold.
- Browser proof: passed the authenticated desktop/mobile route, readiness, console-error, page-error, live provider-search, grounded-Ask, timeline-inspector, Atlantis case-file, and Sacred Teachers journeys.
- Live Ask proof: a query comparing *Homo sapiens* and *Homo erectus* returns two atomic factual sentences, each tied to an exact PBDB record URL and citation marker.
- Rights proof: unknown rights remain Yellow; publication guards require an approved edition and exact passage locator; full source snapshots remain private.
- Data-integrity proof: an incorrect verse-prefix match and non-atomic PBDB claim versions were retracted, not deleted, with replacement claims and audit history.
- Fresh database proof: migrations `0001` through `0007` apply on a new database with PostGIS, pgvector, and pgcrypto.

### Current source pilot

The reviewed pilot includes 459 exact World English Bible verses; exact line-range excerpts from Project Gutenberg editions of Plato's *Timaeus*, *1 Enoch*, the *Mahabharata*, the *Dhammapada*, the *Analects*, and Rodwell's public-domain English Quran translation; an African Humid Period paper abstract from Crossref; exact PBDB occurrence records; NOAA/WDS paleoclimate coverage; and reviewed Pleiades place records. Library, archive, Wikisource, Wikipedia, and Wikidata connections are discovery/reference inputs, not blanket full-text licenses.

### Release boundary

This is ready for local pilot use, not unrestricted public production. Production still needs managed PostgreSQL/PostGIS/pgvector, private object storage, real identity and roles, secrets, backups/retention, and an editorial owner for rights decisions. The pilot is intentionally bounded and does not contain “all historical texts,” automated platform transcripts, public social features, or a truth-probability score. Credentialed providers remain disabled until keys and source-specific terms are approved.

## 1. Repository state and branch

- Standalone repository: `/Volumes/Xstorage/Origin Graph/origin-graph`
- Branch: `feat/origin-graph-mvp`
- Foundation commit: `0b4ae4a05c2e30f127e3174e02e0c8939e95a1f2`
- Application implementation commit: `1a23e80a22d28035db7f84467618b6a44995d428`
- Research-network expansion commit: `0c1a155041a5ea7ad4475f213127ae6d62af7b4f`
- Nothing was merged or deployed.

## 2. Architecture decisions

- Next.js App Router and TypeScript for public and private research surfaces.
- PostgreSQL with real PostGIS, pgvector, and pgcrypto extensions; SQL-first migrations and queries.
- PostgreSQL-backed inspection/parse jobs with `FOR UPDATE SKIP LOCKED` worker claiming.
- Private local object storage abstraction under `storage/private`; no public serving route.
- MapLibre for uncertainty-aware geography, D3 band scaling for chronology, and Cytoscape for focused typed graph neighborhoods.
- Deterministic Ask implementation with PostgreSQL full-text retrieval and server-side citation-marker validation; no paid model dependency.
- Environment-driven HTTP Basic boundary for the private V1 workspace.

## 3. Schema implemented

The foundation schema covers works, editions, witnesses, passages, claims, source relationships, entities and native role assertions, places, events, motifs, typed connections, temporal assertions, media segments, hypotheses, evidence cards, case files, reviews, and audit events.

Migration `0004_research_workspace.sql` adds source inputs and private snapshots, database jobs, verification tasks, source-impact suggestions, hypothesis revisions, saved case queries, database-backed rate-limit buckets, full-text search vectors, storage/publication metadata, and the timeline/review views required by the application.

Migrations `0005_provider_registry.sql` and `0006_external_record_promotion.sql` add the governed provider registry, bounded synchronization records, staged external records, provider health, and an explicit external-record-to-draft-source promotion path through human review.

No truth score or probability column exists.

## 4. Migrations and indexes

A new empty database was migrated with the real container extensions:

```text
applied 0001_extensions.sql
applied 0002_domain_schema.sql
applied 0003_guards_and_views.sql
applied 0004_research_workspace.sql
applied 0005_provider_registry.sql
applied 0006_external_record_promotion.sql
pgcrypto:1.3
postgis:3.6.4
vector:0.8.5
```

Indexes cover geometry, review state, source roles, locators, chronology ranges, connections, source-input status, queued jobs, revision history, rate-limit cleanup, and generated search vectors. Down migrations are present for every migration.

## 5. Fixtures

The deterministic fixture corpus is visibly labeled `SYNTHETIC` and contains no invented historical quotation or date:

| Object | Count |
| --- | ---: |
| Works / editions / witnesses | 2 / 3 / 2 |
| Passages / claims | 2 / 2 |
| Events / temporal assertions | 1 / 6 |
| Entities / role assertions | 2 / 2 |
| Media segments | 1 |
| Places | 3 |
| Connections / source relationships | 1 / 1 |
| Hypotheses / evidence cards | 1 / 2 |
| Case-file shells | 10 |

The place fixtures prove factual-coordinate suppression for literary places and generalized public geometry for a sensitive site. The ten case files remain honest empty editorial shells.

## 6. Tests and behavioral proof

- `npm run typecheck` — passed.
- `npm test` against the dedicated test database — 5 files, 21 tests passed.
- `npm run build` — passed; 26 static/dynamic pages generated with all routes compiled.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `git diff --check` — passed.
- Fresh-database migration with real extensions — passed.
- Browser proof across the expanded desktop/mobile workspace — passed response, readiness, console-error, and page-error checks, including a live provider search and a grounded Ask result.

Tests prove:

- distinct chronology roles survive independently;
- edition supersession and multiple witnesses work;
- published claims require an exact located passage and approved source rights;
- unknown rights begin Yellow and block full-text publication;
- source independence/dependency is represented explicitly;
- entity native-role assertions and media timestamps persist;
- manual source registration is idempotent;
- user-provided transcripts create draft modern-discourse leads only;
- URL policy blocks private/loopback targets and unsafe upload types;
- Ask accepts only valid citation markers, returns reviewed material, and refuses insufficient coverage;
- literary/mythical place responses contain no factual geometry.
- provider coverage spans textual traditions, archaeology, climate, bibliography, and museum/library catalogs without treating catalog registration as licensed corpus ingestion;
- staged external records remain Yellow and unpublished until a reviewer creates and approves an edition draft;
- Ask filters evidence role, tradition, and date range while separating source statements, interpretations, support, challenge, chronology, and source genealogy;
- Ask-to-Hypothesis creates a private draft with contextualizing evidence and no truth-probability score.

Representative HTTP proof:

```text
GET /api/timeline -> 200, six independent temporal roles from the synthetic event
POST /api/ask {"question":"synthetic claim"} -> partial answer, exact C1 locator, coverage uncertainty
GET /api/hypotheses without authentication -> 401
GET /api/hypotheses with configured local authentication -> 200
GET /api/providers -> governed status and rights gates for nineteen providers
GET /api/providers/crossref/search?q=Sumerian%20King%20List -> bounded live metadata results
```

Screenshots are stored in `artifacts/screenshots/`, including timeline desktop/mobile, source inbox desktop/mobile, case files desktop/mobile, hypothesis board, Ask evidence, data-source search, map, graph, and admin browser.

## 7. Screens and APIs implemented

The default homepage is the timeline with semantic time bands, role-specific lanes, linear within-band scaling, uncertainty intervals, linked inspectors, an Ask overlay, and a matching accessible table. Additional surfaces cover the governed data-source catalog and live bounded search, reviewed source inbox, source detail and rights review, human review queue, ten case files and exports, private hypothesis creation/editing/revisions/evidence/export, deterministic Ask dossiers, the uncertainty-aware interactive map, focused typed graph, sacred-teacher native-role comparison, and the admin browser.

APIs cover source registration/upload/transcript review, rights decisions, review transitions, provider discovery/search/staging/promotion, chronology/anchors, claims, grounded Ask, case files/export, hypotheses/revisions/evidence/export, entity profiles and sacred-role comparison, media segments, map features and feature-gated Pleiades drafts, and graph neighborhoods/source lineage.

## 8. Security and rights controls included

- Constant-time credential comparison and private-route enforcement.
- SSRF defense before requests and on every redirect, including DNS resolution and private-address rejection.
- Bounded fetch timeout/size and sanitized external metadata.
- MIME, size, empty-file, and path-character upload validation.
- Restrictive local private-file permissions and no direct file route.
- Database-backed Ask rate limiting with privacy-safe client keys.
- Green/Yellow/Red edition rights, with unknown defaulting to Yellow.
- Database publication guards for source rights, passage locators, and connection citations.
- Reviewed/published-only public claims, chronology, map, graph, entity, media, and Ask outputs.
- Sensitive coordinate generalization, literary-place geometry suppression, and Pleiades attribution.
- Live external access is provider-specific: seven bounded metadata/reference adapters are available, credentialed providers remain disabled until configured, and no adapter silently promotes or publishes content.
- No credentials are stored in code, fixtures, screenshots, or this report.

## 9. Deviations and known limitations

- The ten case files and Sacred Teachers Atlas have interface/schema support but no real seed corpus. This is intentional: completing them requires manual verification of editions, locators, translations, genealogy, rights, and counterevidence.
- The nineteen-provider catalog is not a claim that every historical text has been copied into Origin Graph. Seven adapters currently perform bounded live metadata/reference searches; credentialed or rights-sensitive providers require keys, edition choices, and editorial approval. The exact matrix is recorded in `docs/CORPUS_CONNECTION_MATRIX.md`.
- Metadata inspection and Pleiades import are feature-gated and were not exercised against live services in automated tests. No automated transcript retrieval exists.
- Object storage is a local private adapter; production needs a managed private object store and retention policy.
- HTTP Basic is appropriate for this isolated V1 review gate, but production multi-user work needs identity, roles, session expiry, and CSRF controls.
- Ask is deterministic lexical retrieval. It has strong grounding/refusal behavior, evidence-role/date/tradition filters, genealogy and chronology context, but no semantic embedding re-ranker or prose model.
- The review queue supports safe lifecycle advancement, while detailed editorial comparison remains a human workflow rather than automated adjudication.

## 10. Next smallest implementation step

The next safe step is an editorial pilot, not indiscriminate crawling: provide the credentialed API keys, approve edition/license policies by tradition, configure production-grade identity/database/private storage, and ingest a small manually verified source set with exact locators. Deployment remains a separate founder-approved action.
