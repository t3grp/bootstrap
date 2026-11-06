import { getConnection } from "../../../packages/db/src/index";
import { runAgentWorker } from "../../web/src/lib/server/agent-worker";

if (!process.env.DATABASE_URL)
  throw new Error(
    "The separate worker requires DATABASE_URL. Local PGlite uses the embedded web worker.",
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
