import { startD1 } from "../tests/helpers/d1.ts";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const data = await mkdtemp(path.join(os.tmpdir(), "bootstrap-e2e-"));
const port = process.env.E2E_PORT || "3100";
const database = await startD1();
const preload = path.join(data, "private-d1.mjs");
await writeFile(
  preload,
  `const original = globalThis.fetch;
  globalThis.fetch = (input, init) => original(
    typeof input === 'string' && input.startsWith('http://bootstrap-db.internal/')
      ? input.replace('http://bootstrap-db.internal', ${JSON.stringify(database.origin)}) : input, init);
`,
);
const server = fileURLToPath(
  new URL("../apps/web/.next/standalone/apps/web/server.js", import.meta.url),
);
const child = spawn(process.execPath, ["--import", preload, server], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: "",
    BOOTSTRAP_DATABASE: "cloudflare-d1",
    NODE_ENV: "production",
    PORT: port,
    HOSTNAME: "127.0.0.1",
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
    BOOTSTRAP_SETUP_TOKEN:
      "bootstrap-local-e2e-setup-token-00000000000000000000",
    BOOTSTRAP_ALLOW_LOCAL_DATABASE: "false",
    BOOTSTRAP_DATA_DIR: data,
    BOOTSTRAP_AGENT_WORKER: "embedded",
    BOOTSTRAP_MODEL_PROVIDER: "deterministic",
    BOOTSTRAP_ENABLE_TEST_PROVIDER: "true",
    BOOTSTRAP_TEST_PROVIDER_DELAY_MS: "180",
    BOOTSTRAP_MODEL_API_KEY: "",
    BOOTSTRAP_MODEL_ID: "",
    BOOTSTRAP_MODEL_BASE_URL: "",
    BOOTSTRAP_AGENT_MAX_INPUT_TOKENS: "16000",
    BOOTSTRAP_AGENT_MAX_OUTPUT_TOKENS: "2048",
    BOOTSTRAP_AGENT_TIMEOUT_MS: "120000",
  },
});
let closing = false;
async function close(signal = "SIGTERM") {
  if (closing) return;
  closing = true;
  child.kill(signal);
}
process.on("SIGTERM", () => void close());
process.on("SIGINT", () => void close("SIGINT"));
child.on("exit", async (code) => {
  await database.close();
  await rm(data, { recursive: true, force: true });
  process.exit(code ?? 0);
});
