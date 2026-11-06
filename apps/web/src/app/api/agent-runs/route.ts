import { getDatabase } from "@bootstrap/db";
import { requireActor, requireOrigin } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateJson, readJson } from "@/lib/server/http";
import { idSchema } from "@/lib/server/validation";
import { requireWorkspace } from "@/lib/server/workspace";
import { admitAssignment, listAgentRuns } from "@/lib/server/agent-execution";
import { providerStatus } from "@/lib/server/agent-provider";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const params = new URL(request.url).searchParams;
    const workspaceId = idSchema.parse(params.get("workspaceId"));
    const db = await getDatabase();
    await requireWorkspace(db, actor.id, workspaceId);
    const agentId = params.get("agentId");
    return privateJson({
      provider: providerStatus(),
      runs: agentId ? await listAgentRuns(db, actor, workspaceId, agentId) : [],
    });
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
      await admitAssignment(
        await getDatabase(),
        actor,
        workspaceId,
        await readJson(request, 32_768),
      ),
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
