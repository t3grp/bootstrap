import { setTimeout as delay } from "node:timers/promises";
import { getDatabase } from "@bootstrap/db";
import { requireActor } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/errors";
import { privateHeaders } from "@/lib/server/http";
import { idSchema } from "@/lib/server/validation";
import { getAgentRun } from "@/lib/server/agent-execution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request);
    const params = new URL(request.url).searchParams;
    const workspaceId = idSchema.parse(params.get("workspaceId"));
    const runId = idSchema.parse((await context.params).id);
    const rawCursor =
      request.headers.get("last-event-id") ?? params.get("after") ?? "0";
    if (!/^\d{1,9}$/.test(rawCursor))
      throw new AppError(400, "Invalid event cursor.");
    let cursor = Number(rawCursor);
    const db = await getDatabase();
    await getAgentRun(db, actor, workspaceId, runId); // Fail with HTTP status before streaming.
    let stopped = false;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const started = Date.now();
        try {
          while (
            !stopped &&
            !request.signal.aborted &&
            Date.now() - started < 45_000
          ) {
            // Session and workspace checks repeat so a long connection cannot retain revoked access.
            const currentActor = await requireActor(request);
            const run = await getAgentRun(db, currentActor, workspaceId, runId);
            if (stopped || request.signal.aborted) break;
            for (const event of run.events.filter(
              (event) => event.sequence > cursor,
            )) {
              controller.enqueue(
                encoder.encode(
                  `id: ${event.sequence}\nevent: progress\ndata: ${JSON.stringify({ event, status: run.status })}\n\n`,
                ),
              );
              cursor = event.sequence;
            }
            if (!["queued", "running"].includes(run.status)) {
              controller.enqueue(
                encoder.encode(
                  `event: terminal\ndata: ${JSON.stringify({ status: run.status })}\n\n`,
                ),
              );
              break;
            }
            controller.enqueue(encoder.encode(": keepalive\n\n"));
            await delay(500, undefined, { signal: request.signal });
          }
        } catch {
          if (!stopped && !request.signal.aborted)
            controller.enqueue(
              encoder.encode(
                'event: access_error\ndata: {"error":"Progress access could not be confirmed. Reload to reconnect."}\n\n',
              ),
            );
        } finally {
          if (!stopped) controller.close();
        }
      },
      cancel() {
        stopped = true;
      },
    });
    return new Response(body, {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
