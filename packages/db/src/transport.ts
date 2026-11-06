/** Private container-to-Worker protocol. Never exposed as a public SQL API. */
export const DATABASE_HOST = "bootstrap-db.internal";
export const MAX_DATABASE_BODY = 8 * 1024 * 1024;
export type SqlValue = string | number | null;
export type Statement = { sql: string; params: SqlValue[] };
export interface DatabaseTransport {
  query(statement: Statement): Promise<unknown[][]>;
  batch(statements: Statement[]): Promise<void>;
}

export function remoteTransport(send: typeof fetch = fetch): DatabaseTransport {
  async function request(body: unknown) {
    const response = await send(`http://${DATABASE_HOST}/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    const result = (await response.json()) as {
      rows?: unknown[][];
      code?: string;
    };
    if (!response.ok) throw new Error(result.code || "D1_REQUEST_FAILED");
    return result.rows ?? [];
  }
  return {
    query: (statement) => request({ kind: "query", statement }),
    batch: async (statements) => {
      await request({ kind: "batch", statements });
    },
  };
}
