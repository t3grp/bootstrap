import { spawn } from "node:child_process";

for (const name of [
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BOOTSTRAP_SETUP_TOKEN",
]) {
  if (!process.env[name]) throw new Error(`${name} is required on Cloudflare.`);
}
if (process.env.BOOTSTRAP_DATABASE !== "cloudflare-d1")
  throw new Error("Cloudflare requires durable D1 database storage.");
if (new URL(process.env.BETTER_AUTH_URL).protocol !== "https:")
  throw new Error("BETTER_AUTH_URL must be an HTTPS origin on Cloudflare.");
if (process.env.BOOTSTRAP_FILE_STORAGE !== "cloudflare-r2")
  throw new Error("Cloudflare requires durable private R2 file storage.");

const children = [
  spawn(process.execPath, ["apps/web/server.js"], { stdio: "inherit" }),
  spawn(process.execPath, ["worker.mjs"], { stdio: "inherit" }),
];
let stopping = false;
let exitCode = 0;
let deadline;
function stop(code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  deadline = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
    process.exit(exitCode || 1);
  }, 10_000);
  deadline.unref();
}
for (const child of children) {
  child.once("error", () => stop(1));
  child.once("exit", () => {
    // A missing worker must never leave a healthy-looking web-only container.
    if (!stopping) stop(1);
    if (
      children.every(
        (process) => process.exitCode !== null || process.signalCode !== null,
      )
    ) {
      clearTimeout(deadline);
      process.exit(exitCode);
    }
  });
}
process.once("SIGTERM", () => stop(0));
process.once("SIGINT", () => stop(0));
