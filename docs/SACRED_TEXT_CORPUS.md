# Sacred Text Corpus and Comparison

## Product boundary

The sacred-text workspace compares four primary collections:

1. Jewish Torah/Tanakh
2. Christian Bible
3. Quran
4. Bhagavad Gita

Related writings and manuscripts, including 1 Enoch and the Dead Sea Scrolls, are
stored in a separate `related-ancient` collection. Canon membership is edition- and
community-aware. The interface does not designate one Christian canon as universally
authoritative.

## Current source packages

| Edition | Structure verified | Rights policy | Current local state |
|---|---:|---|---|
| World English Bible, Protestant | 66 books; 31,098 parsed verse units | Public domain; WEB name applies only to faithful text | Downloaded; importer ready |
| World English Bible, Catholic | 73 books; 35,379 parsed verse units | Public domain; includes Deuterocanon | Downloaded; importer ready |
| JPS TaNaKH 1917 | 39 digital book divisions; 23,145 parsed verse units | Public domain | Downloaded; importer ready |
| Tanzil Quran, Uthmani | 114 surahs; 6,236 ayahs | Verbatim redistribution with attribution and Tanzil link | Downloaded; importer ready |
| Rodwell English Quran | 114 surahs | Project Gutenberg public-domain edition in the US | Downloaded; chapter importer ready |
| Arnold Bhagavad Gita | 18 chapters | Project Gutenberg public-domain edition in the US | Downloaded; chapter importer ready |
| Charles 1 Enoch | 108 chapters | Project Gutenberg public-domain edition in the US | Downloaded; chapter importer ready |

Raw source packages live under the ignored `corpus/sacred-texts/downloads/` directory.
The importers independently refetch the declared source, hash the exact bytes, store a
private snapshot, and create edition-specific passages.

## Canon handling

- Torah books are shared normalized works, not copies of Christian Old Testament data.
- Tanakh’s traditional count of 24 books is preserved even though digital verse editions
  commonly divide Samuel, Kings, Chronicles, Ezra-Nehemiah, and the Twelve into 39 files.
- Protestant, Catholic, and Ethiopian Orthodox memberships are separate filters.
- The Ethiopian canon is labeled as 81 books, but the mapped-book count remains visibly
  incomplete until reliable editions of every distinct Ethiopic work are acquired.
- 1–3 Meqabyan are not treated as the same works as 1–2 Maccabees.
- The Dead Sea Scrolls are treated as a manuscript collection, not as a single Bible.

## Similarity method

The system supports five labels:

1. Direct textual relationship
2. Shared or inherited narrative
3. Strong thematic parallel
4. General motif
5. Speculative modern interpretation

The deterministic motif scanner creates review candidates only. A vocabulary match does
not establish borrowing, common origin, historical truth, or equivalence. Modern searches
such as “aliens” expand to source-native vocabulary such as angels, Watchers, jinn, devas,
and celestial beings, but are explicitly labeled speculative.

## Load sequence

```sh
npm run db:migrate
npm run sacred:seed-catalog
npm run sacred:import -- --approved
npm run sacred:scan
```

The local PostgreSQL service must be running. Imports are idempotent by edition key,
content hash, locator, and passage hash. Upstream byte changes create a new edition
version instead of silently replacing the prior text.

## Current local corpus status

The migration, catalog seed, full-text import, and first motif scan completed
successfully against the local database on July 23, 2026.

- 96,100 source passage units were imported from the configured editions.
- 96,117 approved passages were scanned after including previously cataloged passages.
- The first conservative scan produced 5,734 review candidates and 10 draft
  cross-text parallel sets.
- Imports are idempotent and retain source, edition, locator, rights, and content-hash
  provenance.

## Known gaps

- The Ethiopian Orthodox canon is represented as an 81-book target profile. The
  catalog currently maps 75 of those 81 slots, and 1 Enoch is available in full;
  the remaining distinct works still need verified, redistributable editions.
- Dead Sea Scroll transcription rights vary; current scope is metadata-only.
- Modern copyrighted Bible, Quran, and Gita translations require explicit licenses.
- Rodwell and Arnold are historical translations. Their wording and omissions must not
  be presented as the only or definitive interpretation.
- Motif matches are review candidates, not claims that passages have the same
  historical meaning or theological interpretation.
