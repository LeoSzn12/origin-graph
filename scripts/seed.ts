import { fileURLToPath } from "node:url";
import { createPool } from "../src/db";
import { seedSyntheticFixtures } from "../src/fixtures/seed";
import { loadLocalEnv } from "./env";

async function main(): Promise<void> {
  loadLocalEnv();
  const pool = createPool();
  try {
    await seedSyntheticFixtures(pool);
    process.stdout.write("Synthetic Phase 1 fixtures seeded.\n");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
