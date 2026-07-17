# Origin Graph implementation report

## 1. Repository state and branch

- Standalone repository: `/Volumes/Xstorage/Origin Graph/origin-graph`
- Branch: `feat/origin-graph-mvp`
- Foundation commit: `0b4ae4a05c2e30f127e3174e02e0c8939e95a1f2`
- Application implementation commit: `1a23e80a22d28035db7f84467618b6a44995d428`
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

No truth score or probability column exists.

## 4. Migrations and indexes

A new empty database was migrated with the real container extensions:

```text
applied 0001_extensions.sql
applied 0002_domain_schema.sql
applied 0003_guards_and_views.sql
applied 0004_research_workspace.sql
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
- `npm test` against the dedicated test database — 4 files, 17 tests passed.
- `npm run build` — passed; 23 static/dynamic pages generated with all routes compiled.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `git diff --check` — passed.
- Fresh-database migration with real extensions — passed.
- Browser proof on 11 desktop/mobile surfaces — passed response, readiness, console-error, and page-error checks.

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

Representative HTTP proof:

```text
GET /api/timeline -> 200, six independent temporal roles from the synthetic event
POST /api/ask {"question":"synthetic claim"} -> partial answer, exact C1 locator, coverage uncertainty
GET /api/hypotheses without authentication -> 401
GET /api/hypotheses with configured local authentication -> 200
```

Screenshots are stored in `artifacts/screenshots/`, including timeline desktop/mobile, source inbox desktop/mobile, case files desktop/mobile, hypothesis board, Ask, map, graph, and admin browser.

## 7. Screens and APIs implemented

The default homepage is the timeline with semantic time bands, role-specific lanes, linear within-band scaling, uncertainty intervals, an Ask overlay, and a matching accessible table. Additional surfaces cover the reviewed source inbox, source detail and rights review, human review queue, ten case files and exports, private hypothesis creation/evidence/export, deterministic Ask dossiers, the uncertainty-aware map, focused typed graph, sacred-teacher native-role comparison, and the admin browser.

APIs cover source registration/upload/transcript review, rights decisions, review transitions, chronology/anchors, claims, grounded Ask, case files/export, hypotheses/revisions/evidence/export, entity profiles and sacred-role comparison, media segments, map features and feature-gated Pleiades drafts, and graph neighborhoods/source lineage.

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
- Live external adapters feature-gated off by default.
- No credentials are stored in code, fixtures, screenshots, or this report.

## 9. Deviations and known limitations

- The ten case files and Sacred Teachers Atlas have interface/schema support but no real seed corpus. This is intentional: completing them requires manual verification of editions, locators, translations, genealogy, rights, and counterevidence.
- Metadata inspection and Pleiades import are feature-gated and were not exercised against live services in automated tests. No automated transcript retrieval exists.
- Object storage is a local private adapter; production needs a managed private object store and retention policy.
- HTTP Basic is appropriate for this isolated V1 review gate, but production multi-user work needs identity, roles, session expiry, and CSRF controls.
- Ask is deterministic lexical retrieval. It has strong grounding/refusal behavior but no semantic embedding re-ranker or prose model.
- The review queue supports safe lifecycle advancement, while detailed editorial comparison remains a human workflow rather than automated adjudication.

## 10. Next smallest implementation step

The next safe step is an editorial pilot, not more crawler code: configure production-grade identity/database/private storage, choose a very small manually verified source set, record per-edition rights and exact locators, and populate one case file plus a small Sacred Teachers comparison only after review. Deployment remains a separate founder-approved action.
