import { z } from "zod";
import { getDatabase } from "@bootstrap/db";
import { requireActor, requireOrigin } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateJson, readJson } from "@/lib/server/http";
import { idSchema } from "@/lib/server/validation";
import { executeCommand, getPrivateFile } from "@/lib/server/workspace";
import { removeStoredFile } from "@/lib/server/storage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request);
    const { workspaceId, command } = z
      .object({ workspaceId: idSchema, command: z.unknown() })
      .strict()
      .parse(await readJson(request));
    const db = await getDatabase();
    const deletion = z
      .object({ type: z.literal("file.delete"), id: idSchema })
      .strict()
      .safeParse(command);
    const file = deletion.success
      ? await getPrivateFile(db, actor, workspaceId, deletion.data.id)
      : null;
    const snapshot = await executeCommand(db, actor, workspaceId, command);
    if (file)
      await removeStoredFile(file.storageKey).catch(() => {
        // The metadata commit already revoked access; an orphan can be removed by a later operator cleanup.
        console.error("Bootstrap file cleanup failed after logical deletion");
      });
    return privateJson(snapshot);
  } catch (error) {
    return errorResponse(error);
  }
}
