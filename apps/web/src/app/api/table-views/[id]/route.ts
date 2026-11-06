import { TABLE_VIEW_LIMITS } from "@bootstrap/core";
import { getDatabase } from "@bootstrap/db";
import { requireActor, requireOrigin } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateJson, readJson } from "@/lib/server/http";
import { idSchema } from "@/lib/server/validation";
import {
  deleteTableView,
  getTableView,
  updateTableView,
} from "@/lib/server/table-views";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const workspace = (request: Request) =>
  idSchema.parse(new URL(request.url).searchParams.get("workspaceId"));

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireActor(request);
    return privateJson(
      await getTableView(
        await getDatabase(),
        actor,
        workspace(request),
        (await context.params).id,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request);
    return privateJson(
      await updateTableView(
        await getDatabase(),
        actor,
        workspace(request),
        (await context.params).id,
        await readJson(request, TABLE_VIEW_LIMITS.requestBytes),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request);
    return privateJson(
      await deleteTableView(
        await getDatabase(),
        actor,
        workspace(request),
        (await context.params).id,
        await readJson(request, 1024),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
