import { getConnection } from "../../../packages/db/src/index";
import { runAgentWorker } from "../../web/src/lib/server/agent-worker";

if (
  process.env.BOOTSTRAP_DATABASE !== "cloudflare-d1" &&
  !process.env.BOOTSTRAP_DATA_DIR
)
  throw new Error(
    "The separate worker requires D1 or a persistent BOOTSTRAP_DATA_DIR shared with the web app.",
  );
const connection = await getConnection();
const controller = new AbortController();
process.once("SIGTERM", () => controller.abort());
process.once("SIGINT", () => controller.abort());
console.log(
  "Bootstrap agent worker started; queued assignments use their persisted provider and limits.",
);
try {
  await runAgentWorker(connection.db, controller.signal);
} finally {
  await connection.close();
}
