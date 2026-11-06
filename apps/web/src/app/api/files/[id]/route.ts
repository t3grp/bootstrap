import { getDatabase } from "@bootstrap/db";
import { requireActor } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateHeaders } from "@/lib/server/http";
import { attachmentDisposition, readStoredFile } from "@/lib/server/storage";
import { idSchema } from "@/lib/server/validation";
import { getPrivateFile } from "@/lib/server/workspace";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request);
    const workspaceId = idSchema.parse(
      new URL(request.url).searchParams.get("workspaceId"),
    );
    const { id } = await context.params;
    const file = await getPrivateFile(
      await getDatabase(),
      actor,
      workspaceId,
      id,
    );
    const bytes = await readStoredFile(file.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": attachmentDisposition(file.name),
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
