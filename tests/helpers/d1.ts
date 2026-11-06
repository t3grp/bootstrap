import { Miniflare } from "miniflare";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { handlePrivateDatabase } from "../../apps/cloudflare/database";
import {
  DATABASE_HOST,
  remoteTransport,
} from "../../packages/db/src/transport";

/** Actual workerd D1 binding, reached through the same private handler as production. */
export async function startD1() {
  const runtime = new Miniflare({
    workers: [
      {
        config: {
          name: "database-tests",
          compatibilityDate: "2026-11-06",
          manifest: {
            mainModule: "test.mjs",
            modules: {
              "test.mjs": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response('test'); } }",
              },
            },
          },
          env: { DB: { type: "d1", name: `test-${randomUUID()}` } },
        },
      },
    ],
    cf: false,
    telemetry: { enabled: false },
  });
  const binding = await runtime.getD1Database("DB");
  try {
    const migration = await readFile(
      new URL("../../packages/db/migrations/0001_d1.sql", import.meta.url),
      "utf8",
    );
    await binding.batch(
      migration
        .split("--> statement-breakpoint")
        .filter((sql) => sql.trim())
        .map((sql) => binding.prepare(sql)),
    );
  } catch (error) {
    await runtime.dispose();
    throw error;
  }
  const send: typeof fetch = async (input, init) =>
    handlePrivateDatabase(
      new Request(input, init),
      binding as unknown as Parameters<typeof handlePrivateDatabase>[1],
    );
  const server = createServer(async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const result = await send(`http://${DATABASE_HOST}${request.url}`, {
        method: request.method,
        headers: { "content-type": "application/json" },
        body: Buffer.concat(chunks),
      });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      response.writeHead(500);
      response.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test server address");
  return {
    binding,
    send,
    transport: remoteTransport(send),
    origin: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await runtime.dispose();
    },
  };
}
