import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool, transaction } from "../src/db";
import { loadLocalEnv } from "./env";

const migrationDirectory = fileURLToPath(new URL("../db/migrations", import.meta.url));

const extensionStubs = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE DOMAIN geometry AS jsonb;
  CREATE DOMAIN vector AS real[];
  CREATE FUNCTION ST_Equals(left_geometry geometry, right_geometry geometry)
    RETURNS boolean LANGUAGE sql IMMUTABLE AS 'SELECT left_geometry::jsonb = right_geometry::jsonb';
  CREATE FUNCTION ST_GeomFromText(wkt text, srid integer)
    RETURNS geometry LANGUAGE sql IMMUTABLE
    AS 'SELECT jsonb_build_object(''wkt'', wkt, ''srid'', srid)::geometry';
  CREATE FUNCTION ST_MakePoint(x double precision, y double precision)
    RETURNS geometry LANGUAGE sql IMMUTABLE
    AS 'SELECT jsonb_build_object(''type'', ''Point'', ''coordinates'', jsonb_build_array(x, y))::geometry';
  CREATE FUNCTION ST_SetSRID(input_geometry geometry, srid integer)
    RETURNS geometry LANGUAGE sql IMMUTABLE
    AS 'SELECT (input_geometry::jsonb || jsonb_build_object(''srid'', srid))::geometry';
  CREATE FUNCTION ST_AsGeoJSON(input_geometry geometry)
    RETURNS text LANGUAGE sql IMMUTABLE
    AS 'SELECT (input_geometry::jsonb - ''srid'')::text';
`;

function testCompatibleSql(file: string, sql: string): string {
  if (file === "0001_extensions.sql") return extensionStubs;
  if (file === "0002_domain_schema.sql") {
    return sql
      .replaceAll("geometry(Geometry, 4326)", "geometry")
      .replaceAll("vector(1536)", "real[]")
      .replace("CREATE INDEX places_geom_idx ON places USING gist (geometry);", "CREATE INDEX places_geom_idx ON places (id);")
      .replace("CREATE INDEX places_public_geom_idx ON places USING gist (public_geometry);", "CREATE INDEX places_public_geom_idx ON places (id);");
  }
  return sql;
}

export async function migrate(direction: "up" | "down" = "up"): Promise<string[]> {
  const pool = createPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const allowTestStubs = process.env.ALLOW_TEST_EXTENSION_STUBS === "true";
    if (allowTestStubs) {
      const database = await pool.query<{ name: string }>("SELECT current_database() AS name");
      if (!database.rows[0].name.endsWith("_test")) {
        throw new Error("ALLOW_TEST_EXTENSION_STUBS may only be used with a database ending in _test");
      }
    }

    const allFiles = (await readdir(migrationDirectory)).sort();
    const upFiles = allFiles.filter((name) => /^\d+_.+\.sql$/.test(name) && !name.endsWith(".down.sql"));
    const applied = new Set(
      (await pool.query<{ name: string }>("SELECT name FROM schema_migrations ORDER BY name")).rows.map((row) => row.name)
    );

    if (direction === "down") {
      const latest = [...applied].sort().at(-1);
      if (!latest) return [];
      const downFile = latest.replace(/\.sql$/, ".down.sql");
      if (!allFiles.includes(downFile)) throw new Error(`No rollback migration for ${latest}`);
      await transaction(pool, async (client) => {
        await client.query(await readFile(path.join(migrationDirectory, downFile), "utf8"));
        await client.query("DELETE FROM schema_migrations WHERE name = $1", [latest]);
      });
      return [`reverted ${latest}`];
    }

    const output: string[] = [];
    for (const file of upFiles) {
      if (applied.has(file)) continue;
      await transaction(pool, async (client) => {
        const sourceSql = await readFile(path.join(migrationDirectory, file), "utf8");
        await client.query(allowTestStubs ? testCompatibleSql(file, sourceSql) : sourceSql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      });
      output.push(`applied ${file}`);
    }
    return output;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadLocalEnv();
  const direction = process.argv[2] === "down" ? "down" : "up";
  migrate(direction)
    .then((lines) => process.stdout.write(`${lines.length ? lines.join("\n") : "database already current"}\n`))
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
