import { getDatabase } from "@bootstrap/db";
import { requireActor, requireOrigin } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/errors";
import { boundedBody, privateJson } from "@/lib/server/http";
import { removeStoredFile, writeStoredFile } from "@/lib/server/storage";
import { idSchema, LIMITS } from "@/lib/server/validation";
import {
  addPrivateFile,
  getPrivateFile,
  getSnapshot,
  requireWorkspace,
} from "@/lib/server/workspace";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request);
    const workspaceId = idSchema.parse(
      new URL(request.url).searchParams.get("workspaceId"),
    );
    const db = await getDatabase();
    await requireWorkspace(db, actor.id, workspaceId);
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data;"))
      throw new AppError(415, "Upload a file using multipart form data.");
    const bytes = await boundedBody(request, LIMITS.fileBytes + 65_536);
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { "Content-Type": contentType },
      }).formData();
    } catch {
      throw new AppError(400, "The file upload could not be read.");
    }
    const uploaded = form.get("file");
    if (
      !(uploaded instanceof File) ||
      form.getAll("file").length !== 1 ||
      [...form.keys()].some((key) => key !== "file")
    )
      throw new AppError(400, "Upload one file at a time.");
    const file = await writeStoredFile(uploaded);
    try {
      await addPrivateFile(db, actor, workspaceId, file);
    } catch (error) {
      // A connection can fail after COMMIT. Delete bytes only if a fresh database read confirms
      // the metadata is absent; an inaccessible orphan is preferable to destroying saved content.
      try {
        await getPrivateFile(db, actor, workspaceId, file.id);
      } catch (verificationError) {
        if (
          verificationError instanceof AppError &&
          verificationError.status === 404
        )
          await removeStoredFile(file.storageKey);
      }
      throw error;
    }
    return privateJson(await getSnapshot(db, actor, workspaceId), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
