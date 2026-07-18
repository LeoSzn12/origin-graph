# Origin Graph

Origin Graph is a standalone, source-grounded comparative research workspace. Its primary canvas is a chronology that preserves distinct date roles instead of collapsing claimed events, composition, witnesses, editions, observations, and natural phenomena into one date.

The repository includes the research foundation and a locally runnable application: reviewed source inbox, rights workflow, timeline, evidence-led case files, private Hypothesis Lab, citation-grounded Ask, uncertainty-aware map, focused graph, sacred-teacher role comparison, review queue, and admin data browser.

The application now includes a bounded, reviewed pilot corpus alongside clearly labeled synthetic behavioral fixtures. The pilot contains exact-locator excerpts from the World English Bible and selected Project Gutenberg editions, plus reviewed metadata or records from Crossref, NOAA/WDS, PBDB, Pleiades, Wikidata, Wikipedia/Wikisource discovery, and library/archive catalogs. It is not a claim to contain every world text. No automated YouTube/podcast retrieval, indiscriminate mass ingestion, public social features, or truth-probability score is present.

## Local setup

1. Copy `.env.example` to `.env.local` and set local database/admin values.
2. Start PostgreSQL: `docker compose up -d --build db`.
3. Install dependencies: `npm install`.
4. Run migrations: `npm run db:migrate`.
5. Load deterministic fixtures: `npm run db:seed`.
6. Start the app: `npm run dev`.
7. Open `/`; workspace routes such as `/sources`, `/review`, `/hypotheses`, and `/admin` require the configured HTTP Basic credentials.

`ENABLE_LIVE_ADAPTERS=false` is the safe default for arbitrary URL inspection. Provider adapters remain bounded, preserve provenance, and stage candidates for review. They do not enable mass ingestion or automated transcript retrieval.

The Data Sources screen exposes 25 governed providers. Ten have bounded no-key/reference search implementations, two more are configured for controlled use, and credentialed providers remain disabled until their environment credentials are supplied. Results remain external candidates until a human stages and promotes them into source drafts.

## Product surfaces

- `/` — semantic-band timeline and accessible chronology table
- `/sources` — private source inbox; manual citation, URL/DOI, transcript, and validated upload entry
- `/data-sources` — governed catalog of text, archive, archaeology, geography, scholarship, and scientific providers
- `/review` — private human review queue
- `/ask` — deterministic answers from published claims with exact citation locators
- `/case-files` — ten editorial research files; eight currently contain reviewed pilot claims and all ten retain approved source leads
- `/hypotheses` — private reversible evidence boards and exports
- `/sacred-teachers` — accessible native-role comparison for Moses, Jesus, Muhammad, the Buddha, and Confucius
- `/map` — reviewed geometry with literary-place suppression and sensitive-site generalization
- `/graph` — focused typed neighborhoods, not a hairball
- `/admin` — read-only data browser

## Background work and private storage

URL and DOI records are queued in PostgreSQL. Run `npm run worker:once` to process one inspection job when live adapters are explicitly enabled. Uploads and fetched snapshots are written beneath `storage/private` with restrictive permissions and have no direct public route.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
npm run db:counts
```

For browser proof, start the app and run `npm run proof:screenshots` with `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PROOF_BASE_URL`, and optionally `CHROMIUM_EXECUTABLE`. The script checks response status and browser console/page errors while capturing desktop and mobile artifacts.

The integration suite requires `DATABASE_URL` and rebuilds only data in a dedicated test database. See [docs/FIXTURE_POLICY.md](docs/FIXTURE_POLICY.md). When a CI runner lacks PostGIS, `ALLOW_TEST_EXTENSION_STUBS=true` may be used only with a database whose name ends in `_test`; the normal migration path requires real PostGIS and pgvector.

## Editorial boundary

Modern transcripts are research leads, not verification of underlying historical claims. Unknown rights default to Yellow and block full-text publication. Published claims require approved source rights and an exact passage locator. Public-domain status is edition- and jurisdiction-specific; every imported edition retains its rights note, stable URL, locator, content hash, and source family.
