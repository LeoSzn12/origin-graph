# Sacred-text corpus

`manifest.json` is the source and rights ledger for the sacred-text comparison corpus.
Raw downloads are stored in `downloads/` and intentionally ignored by Git. The database
importer retains exact source URLs, content hashes, edition labels, integrity rules, and
private source snapshots.

Initial automatic imports:

- `web-protestant-2025`: public-domain modern English Protestant Bible.
- `web-catholic-2025`: public-domain modern English Catholic Bible with Deuterocanon.
- `jps-tanakh-1917`: public-domain Jewish Tanakh translation.

The Quran, Bhagavad Gita, Ethiopian additional books, and Dead Sea Scrolls require
different parsers and/or source-specific rights handling. They stay visibly incomplete
until an approved edition is imported. A catalog entry never implies that full text is
present.

Commands:

```sh
npm run db:migrate
npm run sacred:seed-catalog
npm run sacred:import -- jps-tanakh-1917 web-protestant-2025 web-catholic-2025
```

The migration, catalog seed, full import, and first motif scan have been run
successfully in the local development database. Re-running an import is safe and
idempotent.

Tanzil Arabic Quran text must remain verbatim and must retain the Tanzil attribution
and link. Tanzil translations have separate noncommercial terms and are not included
by the automatic importer.
