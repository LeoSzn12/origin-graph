# Origin Graph release QA — 2026-07-17

## Outcome

Release gate passed for a local editorial pilot. This is not yet a production-hosting approval because the working app requires PostgreSQL/PostGIS/pgvector, private storage, secrets, and real identity infrastructure.

## Automated checks

| Check | Result |
| --- | --- |
| Next.js production build | Passed; 32 application pages generated |
| TypeScript | Passed |
| Vitest | Passed; 7 files / 24 tests |
| npm high-severity audit | Passed; 0 vulnerabilities |
| Authenticated browser proof | Passed; desktop and mobile workspaces, no page or console errors |
| Live grounded Ask | Passed; exact PBDB citations for two human-origin records |
| Fresh migrations | Passed; migrations 0001–0007 |

## Issues found and fixed

1. A PBDB bibliographic reference contained internal sentence punctuation, so the strict citation validator correctly refused the generated answer. The curated claim was replaced with one atomic statement; the complete bibliography remains in the source passage and the old claim is retained as retracted history.
2. Overlapping timeline intervals occupied one visual row and intercepted each other's clicks. The timeline now assigns overlapping intervals to separate rows and has regression tests for interval and point-event layout.
3. A superseded PBDB chronology assertion remained visible after its source claim was retracted. The curation cleanup now retracts dependent assertions and the timeline API independently excludes assertions whose source claim is not published.

## Browser journeys exercised

- Timeline bands, role filters, interval inspector, accessible chronology table, desktop and mobile layouts
- Ask question submission, answer status, citation list, insufficiency behavior
- Source inbox, source detail, new source path, data provider discovery/search
- Case-file index and Atlantis evidence ledger
- Hypothesis board, comparison route, map, graph, review queue, admin browser
- Sacred Teachers multi-select comparison and exact locator display

Current screenshot evidence is stored in `artifacts/screenshots/`.

## Known release boundary

- The pilot is bounded, not a complete corpus of all historical texts.
- Eight of ten case files contain reviewed claims; Sphinx Chronology and Sumerian King List contain approved source leads only.
- Credentialed providers remain disabled until keys and terms are supplied.
- A public production deployment needs managed database, object storage, identity/roles, secrets, and editorial operations.
- Sites can host a static product preview, but it cannot by itself host this PostgreSQL-backed Next.js research runtime without a compatible production backend.
