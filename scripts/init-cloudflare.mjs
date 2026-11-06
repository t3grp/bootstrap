import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const publicUrl = process.env.BOOTSTRAP_PUBLIC_URL;
if (!databaseUrl || !/^postgres(?:ql)?:\/\//.test(databaseUrl))
  throw new Error(
    "Set DATABASE_URL to the dedicated external PostgreSQL connection.",
  );
if (!publicUrl)
  throw new Error("Set BOOTSTRAP_PUBLIC_URL to the deployment's HTTPS origin.");
const origin = new URL(publicUrl);
if (origin.protocol !== "https:" || origin.href !== `${origin.origin}/`)
  throw new Error(
    "BOOTSTRAP_PUBLIC_URL must be an HTTPS origin without a path or query.",
  );

const destination = path.resolve(".data/cloudflare-secrets.json");
await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
await writeFile(
  destination,
  JSON.stringify(
    {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_URL: origin.origin,
      BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
      BOOTSTRAP_SETUP_TOKEN: randomBytes(32).toString("hex"),
    },
    null,
    2,
  ) + "\n",
  { flag: "wx", mode: 0o600 },
);
console.log(
  `Created ${destination}. Keep it private; reuse these secrets on redeployment.`,
);
console.log(
  "The owner setup token is the BOOTSTRAP_SETUP_TOKEN field in this file.",
);
