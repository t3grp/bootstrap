import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase, schema, type DatabaseConnection } from "@bootstrap/db";
import { initializeOwner } from "../../apps/web/src/lib/server/setup";
import { requireSecret } from "../../apps/web/src/lib/server/auth";

let connection: DatabaseConnection;
const setupToken = randomBytes(32).toString("hex");
beforeAll(async () => {
  vi.stubEnv("BOOTSTRAP_SETUP_TOKEN", setupToken);
  vi.stubEnv("BETTER_AUTH_SECRET", randomBytes(32).toString("hex"));
  connection = await createDatabase({ memory: true });
});
afterAll(async () => {
  await connection?.close();
  vi.unstubAllEnvs();
});

describe("first-owner bootstrap", () => {
  it("rejects an invalid deployment token and admits only one of two simultaneous owners", async () => {
    const input = {
      name: "Founder",
      email: "founder@example.test",
      password: "A-long-local-test-password",
      workspaceName: "My business",
      setupToken,
    };
    await expect(
      initializeOwner({ ...input, setupToken: "incorrect" }, connection.db),
    ).rejects.toMatchObject({ status: 403, code: "INVALID_SETUP_TOKEN" });
    expect(await connection.db.select().from(schema.user)).toHaveLength(0);
    const results = await Promise.allSettled([
      initializeOwner(input, connection.db),
      initializeOwner(
        { ...input, email: "second-owner@example.test" },
        connection.db,
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (
        results.find(
          (result) => result.status === "rejected",
        ) as PromiseRejectedResult
      ).reason,
    ).toMatchObject({ status: 409, code: "ALREADY_INITIALIZED" });
    expect(await connection.db.select().from(schema.user)).toHaveLength(1);
    expect(await connection.db.select().from(schema.account)).toHaveLength(1);
    expect(await connection.db.select().from(schema.instance)).toHaveLength(1);
    expect(await connection.db.select().from(schema.workspaces)).toHaveLength(
      1,
    );
    await expect(initializeOwner(input, connection.db)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("rejects the distributed environment placeholders instead of using them as credentials", () => {
    const prior = process.env.BETTER_AUTH_SECRET;
    process.env.BETTER_AUTH_SECRET =
      "replace-with-a-random-secret-at-least-32-characters";
    try {
      expect(() => requireSecret("BETTER_AUTH_SECRET")).toThrow(
        /Configure a random/,
      );
    } finally {
      process.env.BETTER_AUTH_SECRET = prior;
    }
  });
});
