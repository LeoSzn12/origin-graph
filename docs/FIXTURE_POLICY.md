# Fixture policy

All automated fixtures are explicitly synthetic, deterministic, and prefixed with `SYNTHETIC`. They test structure and behavior only; they are not historical evidence and contain no attributed quotations or asserted real-world dates.

The ten required case-file records are empty editorial shells. Their titles and core questions come from the build packet, but no sources, quotations, claims, or conclusions are fabricated. Real seed data requires manual source, locator, edition, chronology, and rights verification in a later phase.

Tests must not call external APIs. Each integration run uses a dedicated database, applies migrations from zero, seeds deterministic records, and clears only that test database.
