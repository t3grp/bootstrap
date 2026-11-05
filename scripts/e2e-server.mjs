import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const data = await mkdtemp(path.join(os.tmpdir(), "bootstrap-e2e-"));
const port = process.env.E2E_PORT || "3100";
const server = fileURLToPath(
  new URL("../apps/web/.next/standalone/apps/web/server.js", import.meta.url),
);
const child = spawn(process.execPath, [server], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: "",
    NODE_ENV: "production",
    PORT: port,
    HOSTNAME: "127.0.0.1",
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
    BOOTSTRAP_SETUP_TOKEN:
      "bootstrap-local-e2e-setup-token-00000000000000000000",
    BOOTSTRAP_ALLOW_LOCAL_DATABASE: "true",
    BOOTSTRAP_DATA_DIR: data,
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
  await rm(data, { recursive: true, force: true });
  process.exit(code ?? 0);
});
