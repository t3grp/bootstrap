import { existsSync } from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import {
  remoteTransport,
  type DatabaseTransport,
  type Statement,
} from "./transport";

export { schema };
export type QueryDatabase = Omit<
  SqliteRemoteDatabase<typeof schema>,
  "transaction" | "batch"
>;
export type Transaction = QueryDatabase;
export type Database = QueryDatabase & {
  /** Read first, then enqueue writes; all writes commit in one guarded D1 batch.
   * The callback can be retried. It must not perform external side effects. */
  atomic<T>(plan: (tx: Transaction) => Promise<T>): Promise<T>;
};
export type DatabaseConnection = {
  db: Database;
  kind: "d1" | "sqlite";
  close: () => Promise<void>;
};

function findRepositoryRoot() {
  let directory = process.cwd();
  for (let depth = 0; depth < 6; depth++) {
    if (existsSync(path.join(directory, "packages/db/migrations/0001_d1.sql")))
      return directory;
    directory = path.dirname(directory);
  }
  throw new Error(
    "Cannot find SQLite migrations. Set BOOTSTRAP_MIGRATIONS_DIR or run from the repository root.",
  );
}
export function dataDirectory() {
  return path.resolve(
    /* turbopackIgnore: true */ process.env.BOOTSTRAP_DATA_DIR ||
      path.join(findRepositoryRoot(), ".bootstrap"),
  );
}
function errorIncludes(error: unknown, text: string): boolean {
  return (
    error instanceof Error &&
    (error.message.includes(text) || errorIncludes(error.cause, text))
  );
}

/** D1 has atomic batches, not interactive BEGIN/COMMIT transactions.
 * Revision triggers fence all reads used to build a batch. A CHECK failure
 * aborts the entire batch before any application write. Only this known,
 * definitely-rolled-back conflict is retried: an ambiguous network failure
 * after a possible commit is never automatically replayed.
 */
export function databaseFromTransport(transport: DatabaseTransport): Database {
  const query = async (statement: Statement, method: string) => {
    const rows = await transport.query(statement);
    return { rows: method === "get" ? rows[0]! : rows };
  };
  const db = drizzle((sql, params, method) => query({ sql, params }, method), {
    schema,
  });
  const revision = async () => {
    const [[value]] = await transport.query({
      sql: "SELECT version FROM bootstrap_database_revision WHERE id = 1",
      params: [],
    });
    if (!Number.isSafeInteger(value))
      throw new Error("Invalid database revision");
    return value as number;
  };
  return Object.assign(db, {
    async atomic<T>(plan: (tx: Transaction) => Promise<T>): Promise<T> {
      for (let attempt = 0; attempt < 12; attempt++) {
        const expected = await revision();
        const writes: Statement[] = [];
        let closed = false;
        const tx = drizzle(
          async (sql, params, method) => {
            if (closed) throw new Error("Atomic plan already closed");
            if (/^\s*select\b/i.test(sql)) {
              if (writes.length)
                throw new Error(
                  "Atomic plans must finish all reads before enqueuing writes",
                );
              return query({ sql, params }, method);
            }
            if (method !== "run" || !/^\s*(insert|update|delete)\b/i.test(sql))
              throw new Error(
                "Atomic writes cannot use RETURNING or transaction control",
              );
            writes.push({ sql, params });
            return { rows: [] };
          },
          { schema },
        );
        let value: T;
        try {
          value = await plan(tx);
        } catch (error) {
          closed = true;
          // A concurrent write can also invalidate a validation failure.
          if ((await revision()) !== expected) continue;
          throw error;
        }
        closed = true;
        if (!writes.length) {
          if ((await revision()) === expected) return value;
          continue;
        }
        try {
          await transport.batch([
            {
              sql: "INSERT INTO bootstrap_transaction_guard (id, valid) VALUES (1, (SELECT version = ? FROM bootstrap_database_revision WHERE id = 1)) ON CONFLICT(id) DO UPDATE SET valid = excluded.valid",
              params: [expected],
            },
            ...writes,
          ]);
          return value;
        } catch (error) {
          if (
            !errorIncludes(error, "bootstrap_revision_match") &&
            !errorIncludes(error, "D1_REVISION_CONFLICT")
          )
            throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(5 * (attempt + 1), 40)),
        );
      }
      throw new Error(
        "DATABASE_BUSY: concurrent changes prevented a consistent commit; retry the operation",
      );
    },
  });
}

export async function createDatabase(
  options: {
    directory?: string;
    memory?: boolean;
    transport?: DatabaseTransport;
  } = {},
): Promise<DatabaseConnection> {
  if (
    options.transport ||
    (!options.memory &&
      !options.directory &&
      process.env.BOOTSTRAP_DATABASE === "cloudflare-d1")
  ) {
    return {
      db: databaseFromTransport(options.transport ?? remoteTransport()),
      kind: "d1",
      close: async () => {},
    };
  }
  if (!options.memory && !options.directory && process.env.DATABASE_URL)
    throw new Error(
      "Bootstrap now uses D1/SQLite. Export existing PostgreSQL data before upgrading; DATABASE_URL is no longer used.",
    );
  if (
    process.env.NODE_ENV === "production" &&
    !options.memory &&
    process.env.BOOTSTRAP_ALLOW_LOCAL_DATABASE !== "true"
  )
    throw new Error(
      "Production requires cloudflare-d1 or explicitly enabled SQLite on a persistent volume.",
    );
  const { DatabaseSync } = await import("node:sqlite");
  const directory = options.memory
    ? undefined
    : options.directory || dataDirectory();
  if (directory) await mkdir(directory, { recursive: true, mode: 0o700 });
  if (
    directory &&
    existsSync(path.join(directory, "postgres")) &&
    !existsSync(path.join(directory, "workspace.sqlite"))
  )
    throw new Error(
      "Existing PGlite data needs an explicit export and conversion before upgrading to SQLite; the original data has been left untouched.",
    );
  const client = new DatabaseSync(
    directory ? path.join(directory, "workspace.sqlite") : ":memory:",
  );
  try {
    client.exec(
      "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;",
    );
    client.exec(
      "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
    const folder =
      process.env.BOOTSTRAP_MIGRATIONS_DIR ||
      path.join(findRepositoryRoot(), "packages/db/migrations");
    for (const name of (await readdir(/* turbopackIgnore: true */ folder))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const source = await readFile(
        /* turbopackIgnore: true */ path.join(folder, name),
        "utf8",
      );
      client.exec("BEGIN IMMEDIATE");
      try {
        if (
          !client
            .prepare("SELECT id FROM d1_migrations WHERE name = ?")
            .get(name)
        ) {
          client.exec(source);
          client
            .prepare("INSERT INTO d1_migrations (name) VALUES (?)")
            .run(name);
        }
        client.exec("COMMIT");
      } catch (error) {
        client.exec("ROLLBACK");
        throw error;
      }
    }
    const transport: DatabaseTransport = {
      query: async ({ sql, params }) => {
        const statement = client.prepare(sql);
        statement.setReturnArrays(true);
        return statement.all(...params) as unknown as unknown[][];
      },
      batch: async (statements) => {
        client.exec("BEGIN IMMEDIATE");
        try {
          for (const { sql, params } of statements)
            client.prepare(sql).run(...params);
          client.exec("COMMIT");
        } catch (error) {
          client.exec("ROLLBACK");
          throw error;
        }
      },
    };
    return {
      db: databaseFromTransport(transport),
      kind: "sqlite",
      close: async () => {
        client.close();
      },
    };
  } catch (error) {
    client.close();
    throw error;
  }
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
