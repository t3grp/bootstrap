import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

export { schema };
export type Database = PgliteDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type QueryDatabase = Database | Transaction;

export type DatabaseConnection = {
  db: Database;
  kind: "postgres" | "pglite";
  close: () => Promise<void>;
};

function findRepositoryRoot() {
  let directory = process.cwd();
  for (let depth = 0; depth < 6; depth++) {
    if (
      existsSync(
        path.join(directory, "packages/db/migrations/meta/_journal.json"),
      )
    )
      return directory;
    directory = path.dirname(directory);
  }
  throw new Error(
    "Cannot find database migrations. Run Bootstrap from its repository root or set BOOTSTRAP_MIGRATIONS_DIR.",
  );
}

export function dataDirectory() {
  // Operator data is external runtime state, never an application build asset.
  return path.resolve(
    /* turbopackIgnore: true */ process.env.BOOTSTRAP_DATA_DIR ||
      path.join(findRepositoryRoot(), ".bootstrap"),
  );
}

/** A single connection owns local PGlite. Production uses a normal PostgreSQL pool. */
export async function createDatabase(
  options: { url?: string; directory?: string; memory?: boolean } = {},
): Promise<DatabaseConnection> {
  const migrationsFolder =
    process.env.BOOTSTRAP_MIGRATIONS_DIR ||
    path.join(findRepositoryRoot(), "packages/db/migrations");
  if (options.memory && options.url)
    throw new Error("An in-memory test database cannot also use DATABASE_URL.");
  // Explicit local test/development storage must never fall through to an inherited production URL.
  const databaseUrl =
    options.memory || options.directory !== undefined
      ? options.url
      : (options.url ?? process.env.DATABASE_URL);
  if (databaseUrl) {
    const pool = new Pool({ connectionString: databaseUrl, max: 10 });
    const db = drizzlePostgres(pool, { schema });
    try {
      // Migration is serialized across Node processes, including a scaled production startup.
      const migrationClient = await pool.connect();
      try {
        await migrationClient.query("SELECT pg_advisory_lock(86421750)");
        await migratePostgres(drizzlePostgres(migrationClient, { schema }), {
          migrationsFolder,
        });
      } finally {
        try {
          await migrationClient.query("SELECT pg_advisory_unlock(86421750)");
        } finally {
          migrationClient.release();
        }
      }
    } catch (error) {
      await pool.end();
      throw error;
    }
    // Both adapters use the same PostgreSQL dialect and transaction/query API.
    return {
      db: db as unknown as Database,
      kind: "postgres",
      close: () => pool.end(),
    };
  }
  if (
    process.env.NODE_ENV === "production" &&
    !options.memory &&
    process.env.BOOTSTRAP_ALLOW_LOCAL_DATABASE !== "true"
  ) {
    throw new Error(
      "DATABASE_URL is required in production. Local PGlite is for a single-process development instance.",
    );
  }
  const directory = options.memory
    ? undefined
    : options.directory || path.join(dataDirectory(), "postgres");
  if (directory) await mkdir(directory, { recursive: true, mode: 0o700 });
  const client = new PGlite(directory);
  const db = drizzlePglite(client, { schema });
  try {
    await migratePglite(db, { migrationsFolder });
  } catch (error) {
    await client.close();
    throw error;
  }
  return { db, kind: "pglite", close: () => client.close() };
}

const singleton = globalThis as typeof globalThis & {
  bootstrapDatabase?: Promise<DatabaseConnection>;
};
export function getConnection() {
  singleton.bootstrapDatabase ??= createDatabase().catch((error) => {
    singleton.bootstrapDatabase = undefined;
    throw error;
  });
  return singleton.bootstrapDatabase;
}
export async function getDatabase() {
  return (await getConnection()).db;
}
