import { getDatabase } from "@bootstrap/db";
import { runAgentWorker } from "./lib/server/agent-worker";

export function startEmbeddedWorker() {
  const mode =
    process.env.BOOTSTRAP_AGENT_WORKER ??
    (process.env.DATABASE_URL ? "external" : "embedded");
  if (mode !== "embedded") return;
  const singleton = globalThis as typeof globalThis & {
    bootstrapAgentWorker?: AbortController;
  };
  if (singleton.bootstrapAgentWorker) return;
  const controller = new AbortController();
  singleton.bootstrapAgentWorker = controller;
  // Local PGlite shares the web process and its single database connection.
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
