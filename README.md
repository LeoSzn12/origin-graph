# Origin Graph

Origin Graph is a standalone, source-grounded comparative research workspace. This repository currently implements the Phase 0–1 foundation only: schema, domain services, synthetic fixtures, behavioral tests, and a read-only admin data browser.

No live source adapters, Ask engine, mass ingestion, public social features, automated transcript retrieval, or truth-probability scoring are included.

## Local setup

1. Copy `.env.example` to `.env.local` and set local database/admin values.
2. Start PostgreSQL: `docker compose up -d --build db`.
3. Install dependencies: `npm install`.
4. Run migrations: `npm run db:migrate`.
5. Load deterministic fixtures: `npm run db:seed`.
6. Start the app: `npm run dev`.
7. Open `/admin` and authenticate with the locally configured HTTP Basic credentials.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run db:counts`
- `npx playwright install chromium && npm run proof:screenshots` (with the documented local admin environment variables)

The integration suite requires `DATABASE_URL` and rebuilds only data in a dedicated test database. See [docs/FIXTURE_POLICY.md](docs/FIXTURE_POLICY.md).

When a CI runner lacks PostGIS, `ALLOW_TEST_EXTENSION_STUBS=true` may be used only with a database whose name ends in `_test`. This compatibility path verifies relational constraints and services; the normal migration path still requires real PostGIS and pgvector.
