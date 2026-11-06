import { TABLE_VIEW_LIMITS } from "@bootstrap/core";
import { getDatabase } from "@bootstrap/db";
import { requireActor, requireOrigin } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateJson, readJson } from "@/lib/server/http";
import { idSchema } from "@/lib/server/validation";
import { createTableView, listTableViews } from "@/lib/server/table-views";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const params = new URL(request.url).searchParams;
    return privateJson(
      await listTableViews(
        await getDatabase(),
        actor,
        idSchema.parse(params.get("workspaceId")),
        idSchema.parse(params.get("tableId")),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request);
    const workspaceId = idSchema.parse(
      new URL(request.url).searchParams.get("workspaceId"),
    );
    return privateJson(
      await createTableView(
        await getDatabase(),
        actor,
        workspaceId,
        await readJson(request, TABLE_VIEW_LIMITS.requestBytes),
      ),
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
