import { fileURLToPath } from "node:url";
import { createPool } from "../src/db";
import { loadLocalEnv } from "./env";

async function main(): Promise<void> {
  loadLocalEnv();
  const pool = createPool();
  try {
    const result = await pool.query<{ table_name: string; row_count: string }>(
      "SELECT table_name, row_count FROM admin_table_counts ORDER BY table_name"
    );
    process.stdout.write(`${JSON.stringify(result.rows.map((row) => ({ ...row, row_count: Number(row.row_count) })), null, 2)}\n`);
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
