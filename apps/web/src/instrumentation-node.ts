import { getDatabase } from "@bootstrap/db";
import { runAgentWorker } from "./lib/server/agent-worker";

export function startEmbeddedWorker() {
  const mode =
    process.env.BOOTSTRAP_AGENT_WORKER ??
    (process.env.BOOTSTRAP_DATABASE === "cloudflare-d1"
      ? "external"
      : "embedded");
  if (mode !== "embedded") return;
  const singleton = globalThis as typeof globalThis & {
    bootstrapAgentWorker?: AbortController;
  };
  if (singleton.bootstrapAgentWorker) return;
  const controller = new AbortController();
  singleton.bootstrapAgentWorker = controller;
  // Local SQLite can run the worker inside the web process for easy development.
  void getDatabase()
    .then((db) => runAgentWorker(db, controller.signal))
    .catch((error) => {
      console.error(
        "Bootstrap embedded worker stopped",
        error instanceof Error ? error.name : "Unknown error",
      );
      singleton.bootstrapAgentWorker = undefined;
    });
  process.once("SIGTERM", () => controller.abort());
  process.once("SIGINT", () => controller.abort());
}
