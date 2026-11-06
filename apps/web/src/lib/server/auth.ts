import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase, schema } from "@bootstrap/db";
import { AppError } from "./errors";
import type { Actor } from "./workspace";

export function publicOrigin() {
  const configured =
    process.env.BETTER_AUTH_URL ||
    (process.env.NODE_ENV !== "production"
      ? "http://localhost:3000"
      : undefined);
  if (!configured)
    throw new AppError(
      503,
      "Set BETTER_AUTH_URL before starting the application.",
      "CONFIGURATION_REQUIRED",
    );
  const url = new URL(configured);
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new AppError(
      503,
      "Production requires an HTTPS application URL.",
      "CONFIGURATION_REQUIRED",
    );
  }
  return url.origin;
}

export function requireSecret(
  name: "BETTER_AUTH_SECRET" | "BOOTSTRAP_SETUP_TOKEN",
) {
  const value = process.env[name];
  if (
    !value ||
    value.length < 32 ||
    /^(replace-with|change-me|your-secret)/i.test(value)
  ) {
    throw new AppError(
      503,
      `Configure a random ${name} of at least 32 characters.`,
      "CONFIGURATION_REQUIRED",
    );
  }
  return value;
}

async function createAuth() {
  const secret = requireSecret("BETTER_AUTH_SECRET");
  const db = await getDatabase();
  const baseURL = publicOrigin();
  return betterAuth({
    appName: "Bootstrap",
    baseURL,
    secret,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
      customRules: { "/sign-in/email": { window: 60, max: 10 } },
    },
    trustedOrigins: [baseURL],
    advanced: {
      useSecureCookies: baseURL.startsWith("https:"),
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: baseURL.startsWith("https:"),
      },
    },
  });
}

const singleton = globalThis as typeof globalThis & {
  bootstrapAuth?: ReturnType<typeof createAuth>;
};
export function getAuth() {
  singleton.bootstrapAuth ??= createAuth().catch((error) => {
    singleton.bootstrapAuth = undefined;
    throw error;
  });
  return singleton.bootstrapAuth;
}

export async function requireActor(request: Request): Promise<Actor> {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result)
    throw new AppError(
      401,
      "Sign in to open your workspace.",
      "UNAUTHENTICATED",
    );
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
  };
}

export function requireOrigin(request: Request) {
  if (request.headers.get("origin") !== publicOrigin())
    throw new AppError(
      403,
      "This request must come from the application.",
      "ORIGIN_MISMATCH",
    );
}
