import { z } from "zod";
import { getDatabase } from "@bootstrap/db";
import { requireActor, requireOrigin } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateJson, readJson } from "@/lib/server/http";
import { idSchema } from "@/lib/server/validation";
import {
  cancelAgentRun,
  getAgentRun,
  saveAgentResult,
} from "@/lib/server/agent-execution";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireActor(request);
    const workspaceId = idSchema.parse(
      new URL(request.url).searchParams.get("workspaceId"),
    );
    return privateJson(
      await getAgentRun(
        await getDatabase(),
        actor,
        workspaceId,
        (await context.params).id,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request);
    const workspaceId = idSchema.parse(
      new URL(request.url).searchParams.get("workspaceId"),
    );
    const { action } = z
      .object({ action: z.enum(["cancel", "save"]) })
      .strict()
      .parse(await readJson(request, 1024));
    const operation = action === "cancel" ? cancelAgentRun : saveAgentResult;
    return privateJson(
      await operation(
        await getDatabase(),
        actor,
        workspaceId,
        (await context.params).id,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
