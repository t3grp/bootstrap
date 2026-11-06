import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { databaseFromTransport, schema } from "@bootstrap/db";
import {
  DATABASE_HOST,
  MAX_DATABASE_BODY,
} from "../../packages/db/src/transport";
import { startD1 } from "../helpers/d1";

describe("D1 atomic plans and private database boundary", () => {
  let runtime: Awaited<ReturnType<typeof startD1>>;
  beforeAll(async () => {
    runtime = await startD1();
  });
  afterAll(async () => {
    await runtime?.close();
  });

  it("rolls back earlier writes when a later constraint fails", async () => {
    const db = databaseFromTransport(runtime.transport);
    const id = randomUUID();
    await expect(
      db.atomic(async (tx) => {
        await tx
          .insert(schema.user)
          .values({ id, name: "Rollback", email: `${id}@example.test` });
        await tx
          .insert(schema.instance)
          .values({ id: "primary", ownerId: "missing-owner" });
      }),
    ).rejects.toThrow();
    expect(
      await db.select().from(schema.user).where(eq(schema.user.id, id)),
    ).toHaveLength(0);
  });

  it("retries stale reads after a write from an independent client", async () => {
    const first = databaseFromTransport(runtime.transport);
    const second = databaseFromTransport(runtime.transport);
    const id = randomUUID();
    await first.insert(schema.workspaces).values({ id, name: "original" });
    let attempts = 0;
    await first.atomic(async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, id));
      if (++attempts === 1)
        await second
          .update(schema.workspaces)
          .set({ name: "concurrent" })
          .where(eq(schema.workspaces.id, id));
      await tx
        .update(schema.workspaces)
        .set({ name: `${row.name}-accepted` })
        .where(eq(schema.workspaces.id, id));
    });
    expect(attempts).toBe(2);
    expect(
      (
        await first
          .select()
          .from(schema.workspaces)
          .where(eq(schema.workspaces.id, id))
      )[0].name,
    ).toBe("concurrent-accepted");
  });

  it("never retries an ambiguous transport failure after a commit", async () => {
    let batches = 0;
    const db = databaseFromTransport({
      query: runtime.transport.query,
      batch: async (statements) => {
        batches++;
        await runtime.transport.batch(statements);
        throw new Error("Connection lost after commit");
      },
    });
    const id = randomUUID();
    await expect(
      db.atomic(async (tx) => {
        await tx
          .insert(schema.workspaces)
          .values({ id, name: "Committed once" });
      }),
    ).rejects.toThrow("Connection lost");
    expect(batches).toBe(1);
    expect(
      await db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, id)),
    ).toHaveLength(1);
  });

  it("rejects read-after-write plans without persisting staged changes", async () => {
    const db = databaseFromTransport(runtime.transport);
    const id = randomUUID();
    await expect(
      db.atomic(async (tx) => {
        await tx.insert(schema.workspaces).values({ id, name: "Uncommitted" });
        await tx.select().from(schema.workspaces);
      }),
    ).rejects.toThrow();
    expect(
      await db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, id)),
    ).toHaveLength(0);
  });

  it("rejects public hosts, invalid paths, methods and malformed SQL payloads", async () => {
    const payload = {
      kind: "query",
      statement: { sql: "SELECT 1", params: [] },
    };
    const post = (url: string, body = payload) =>
      runtime.send(url, { method: "POST", body: JSON.stringify(body) });
    expect((await post("https://public.example/query")).status).toBe(404);
    expect((await post(`http://${DATABASE_HOST}/other`)).status).toBe(404);
    expect((await runtime.send(`http://${DATABASE_HOST}/query`)).status).toBe(
      405,
    );
    expect(
      (
        await post(`http://${DATABASE_HOST}/query`, {
          ...payload,
          statement: { sql: "DROP TABLE user", params: [] },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await runtime.send(`http://${DATABASE_HOST}/query`, {
          method: "POST",
          body: "not json",
        })
      ).status,
    ).toBe(400);
    expect(
      (await post(`http://${DATABASE_HOST}/query`)).headers.get(
        "cache-control",
      ),
    ).toBe("private, no-store");
  });

  it("enforces the request limit even with a forged Content-Length", async () => {
    const response = await runtime.send(`http://${DATABASE_HOST}/query`, {
      method: "POST",
      body: "x".repeat(MAX_DATABASE_BODY + 1),
      headers: { "content-length": "1" },
    });
    expect(response.status).toBe(413);
  });
});
