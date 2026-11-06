import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getDatabase, schema, type Database } from "@bootstrap/db";
import { AppError } from "./errors";
import { requireSecret } from "./auth";
import { setupSchema } from "./validation";
import { createWorkspace, ownerExists } from "./workspace";

const rateState = globalThis as typeof globalThis & {
  bootstrapSetupRate?: { startedAt: number; attempts: number };
};
function checkSetupRate() {
  const now = Date.now();
  if (
    !rateState.bootstrapSetupRate ||
    now - rateState.bootstrapSetupRate.startedAt > 60_000
  )
    rateState.bootstrapSetupRate = { startedAt: now, attempts: 0 };
  if (++rateState.bootstrapSetupRate.attempts > 10)
    throw new AppError(
      429,
      "Too many setup attempts. Try again in a minute.",
      "RATE_LIMITED",
    );
}
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("D1_UNIQUE_CONSTRAINT") ||
      isUniqueViolation(error.cause))
  );
}

export async function initializeOwner(input: unknown, database?: Database) {
  checkSetupRate();
  const expectedToken = requireSecret("BOOTSTRAP_SETUP_TOKEN");
  requireSecret("BETTER_AUTH_SECRET");
  const values = setupSchema.parse(input);
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(values.setupToken), hash(expectedToken)))
    throw new AppError(
      403,
      "The setup token is incorrect.",
      "INVALID_SETUP_TOKEN",
    );
  const db = database ?? (await getDatabase());
  if (await ownerExists(db))
    throw new AppError(
      409,
      "This instance already has an owner. Sign in instead.",
      "ALREADY_INITIALIZED",
    );
  const password = await hashPassword(values.password);
  try {
    return await db.atomic(async (tx) => {
      const ownerId = randomUUID();
      await tx.insert(schema.user).values({
        id: ownerId,
        name: values.name,
        email: values.email,
        emailVerified: false,
      });
      // The fixed primary key is the atomic first-owner gate. A losing transaction rolls back everything.
      await tx.insert(schema.instance).values({ id: "primary", ownerId });
      await tx.insert(schema.account).values({
        id: randomUUID(),
        userId: ownerId,
        accountId: ownerId,
        providerId: "credential",
        password,
      });
      const workspaceId = await createWorkspace(
        tx,
        ownerId,
        values.workspaceName,
      );
      return { initialized: true, workspaceId };
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new AppError(
        409,
        "This instance already has an owner. Sign in instead.",
        "ALREADY_INITIALIZED",
      );
    throw error;
  }
}
