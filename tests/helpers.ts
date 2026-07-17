import type { Pool } from "pg";
import { createPool } from "@/db";
import { seedSyntheticFixtures } from "@/fixtures/seed";

export function testPool(): Pool {
  return createPool({ max: 4 });
}

export async function resetTestData(pool: Pool): Promise<void> {
  const database = await pool.query<{ name: string }>("SELECT current_database() AS name");
  if (!database.rows[0].name.endsWith("_test")) {
    throw new Error(`Refusing to reset non-test database: ${database.rows[0].name}`);
  }
  await pool.query(`TRUNCATE TABLE
    audit_events, reviews, case_file_objects, case_files, evidence_items, hypotheses,
    source_relationships, connection_source_claims, connections, temporal_assertions,
    media_segments, entity_role_assertions, claims, motifs, events, entities, passages,
    witnesses, places, canonical_statuses, source_editions, works
    RESTART IDENTITY CASCADE`);
  await seedSyntheticFixtures(pool);
}
