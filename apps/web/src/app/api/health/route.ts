import { getDatabase } from "@bootstrap/db";
import { sql } from "drizzle-orm";
import { privateJson } from "@/lib/server/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    await (await getDatabase()).execute(sql`select 1`);
    return privateJson({ status: "ok" });
  } catch {
    return privateJson({ status: "unavailable" }, 503);
  }
}
