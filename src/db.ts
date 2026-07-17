import { Pool, type PoolClient, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

let sharedPool: Pool | undefined;

export function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  return value;
}

export function createPool(config: PoolConfig = {}): Pool {
  return new Pool({ connectionString: databaseUrl(), max: 10, ...config });
}

export function db(): Pool {
  sharedPool ??= createPool();
  return sharedPool;
}

export async function closeDb(): Promise<void> {
  if (sharedPool) await sharedPool.end();
  sharedPool = undefined;
}

export type DbExecutor = Pick<Pool | PoolClient, "query">;

export async function rows<T extends QueryResultRow>(
  executor: DbExecutor,
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = (await executor.query(text, values)) as QueryResult<T>;
  return result.rows;
}

export async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
