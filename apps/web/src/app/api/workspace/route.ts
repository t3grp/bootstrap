import { getDatabase } from "@bootstrap/db";
import { requireActor } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateJson } from "@/lib/server/http";
import { getSnapshot } from "@/lib/server/workspace";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    return privateJson(
      await getSnapshot(
        await getDatabase(),
        actor,
        new URL(request.url).searchParams.get("workspaceId") || undefined,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
