# Origin Graph

Origin Graph is a standalone, source-grounded comparative research workspace. Its primary canvas is a chronology that preserves distinct date roles instead of collapsing claimed events, composition, witnesses, editions, observations, and natural phenomena into one date.

The repository includes the research foundation and a locally runnable application: reviewed source inbox, rights workflow, timeline, case-file shells, private Hypothesis Lab, deterministic citation-grounded Ask, uncertainty-aware map, focused graph, sacred-teacher role comparison, review queue, and admin data browser.

Only clearly labeled synthetic fixtures ship with the app. No automated YouTube/podcast retrieval, mass text ingestion, public social features, or truth-probability score is present. Live metadata adapters default off.

## Local setup

1. Copy `.env.example` to `.env.local` and set local database/admin values.
2. Start PostgreSQL: `docker compose up -d --build db`.
3. Install dependencies: `npm install`.
4. Run migrations: `npm run db:migrate`.
5. Load deterministic fixtures: `npm run db:seed`.
6. Start the app: `npm run dev`.
7. Open `/`; workspace routes such as `/sources`, `/review`, `/hypotheses`, and `/admin` require the configured HTTP Basic credentials.

`ENABLE_LIVE_ADAPTERS=false` is the safe default. Turning it on only enables bounded metadata inspection and the Pleiades draft importer; imported records still enter human review in Yellow rights state. It does not enable mass ingestion or automated transcript retrieval.

## Product surfaces

- `/` — semantic-band timeline and accessible chronology table
- `/sources` — private source inbox; manual citation, URL/DOI, transcript, and validated upload entry
- `/review` — private human review queue
- `/ask` — deterministic answers from published claims with exact citation locators
- `/case-files` — ten empty editorial shells, intentionally unpopulated until sources are verified
- `/hypotheses` — private reversible evidence boards and exports
- `/sacred-teachers` — native-role comparison interface, empty until a curated pilot is reviewed
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

For browser proof, start the built app on port 3100 and run `npm run proof:screenshots` with `ADMIN_AUTH_USER`, `ADMIN_AUTH_PASSWORD`, and optionally `CHROMIUM_EXECUTABLE`. The script checks response status and browser console/page errors while capturing desktop and mobile artifacts.

The integration suite requires `DATABASE_URL` and rebuilds only data in a dedicated test database. See [docs/FIXTURE_POLICY.md](docs/FIXTURE_POLICY.md). When a CI runner lacks PostGIS, `ALLOW_TEST_EXTENSION_STUBS=true` may be used only with a database whose name ends in `_test`; the normal migration path requires real PostGIS and pgvector.

## Editorial boundary

Modern transcripts are research leads, not verification of underlying historical claims. Unknown rights default to Yellow and block full-text publication. Published claims require approved source rights and an exact passage locator. Real case-file and Sacred Teachers content must be entered from manually verified editions with recorded rights and attribution.
