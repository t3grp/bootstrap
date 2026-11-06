import {
  DATABASE_HOST,
  MAX_DATABASE_BODY,
  type Statement,
} from "../../packages/db/src/transport";

function statement(value: unknown): value is Statement {
  if (!value || typeof value !== "object") return false;
  const item = value as Statement;
  return (
    typeof item.sql === "string" &&
    item.sql.length <= 100_000 &&
    /^\s*(select|insert|update|delete)\b/i.test(item.sql) &&
    Array.isArray(item.params) &&
    item.params.length <= 100 &&
    item.params.every(
      (value) =>
        value === null ||
        typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value)),
    )
  );
}
function errorCode(error: unknown): string {
  if (!(error instanceof Error)) return "D1_QUERY_FAILED";
  if (error.message.includes("bootstrap_revision_match"))
    return "D1_REVISION_CONFLICT";
  if (error.message.includes("UNIQUE constraint"))
    return "D1_UNIQUE_CONSTRAINT";
  return error.cause ? errorCode(error.cause) : "D1_QUERY_FAILED";
}

/** Invoked only by the Container's private outbound handler, never public fetch. */
export async function handlePrivateDatabase(
  request: Request,
  database: D1Database,
) {
  const url = new URL(request.url);
  const headers = { "cache-control": "private, no-store" };
  if (
    url.hostname !== DATABASE_HOST ||
    url.pathname !== "/query" ||
    url.search ||
    url.port
  )
    return new Response(null, { status: 404, headers });
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers });
  if (!request.body) return new Response(null, { status: 400, headers });
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DATABASE_BODY) {
      await reader.cancel();
      return new Response(null, { status: 413, headers });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: { kind?: string; statement?: unknown; statements?: unknown[] };
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return new Response(null, { status: 400, headers });
  }
  if (!body || typeof body !== "object")
    return new Response(null, { status: 400, headers });
  const single = body.kind === "query" && statement(body.statement);
  const batch =
    body.kind === "batch" &&
    Array.isArray(body.statements) &&
    body.statements.length > 0 &&
    body.statements.length <= 4096 &&
    body.statements.every(statement);
  if (!single && !batch) return new Response(null, { status: 400, headers });
  try {
    // A new primary-first session for each RPC avoids stale replica reads.
    const session = database.withSession("first-primary");
    const prepare = (value: Statement) =>
      session.prepare(value.sql).bind(...value.params);
    if (single) {
      const rows = await prepare(body.statement as Statement).raw();
      return Response.json({ rows }, { headers });
    }
    await session.batch((body.statements as Statement[]).map(prepare));
    return Response.json({ rows: [] }, { headers });
  } catch (error) {
    const code = errorCode(error);
    return Response.json(
      { code },
      { status: code === "D1_REVISION_CONFLICT" ? 409 : 500, headers },
    );
  }
}
