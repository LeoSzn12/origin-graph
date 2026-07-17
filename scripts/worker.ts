import { createPool } from "../src/db";
import { SourceInputService } from "../src/ingestion/source-input-service";
import { loadLocalEnv } from "./env";

async function main(): Promise<void> {
  loadLocalEnv();
  const pool = createPool();
  try {
    const processed = await new SourceInputService(pool).processNextInspection(`worker-${process.pid}`);
    process.stdout.write(processed ? `Processed source input ${processed}\n` : "No inspection jobs queued.\n");
  } finally { await pool.end(); }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
