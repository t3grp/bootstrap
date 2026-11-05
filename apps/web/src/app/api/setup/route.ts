import { getDatabase } from "@bootstrap/db";
import { requireOrigin } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateJson, readJson } from "@/lib/server/http";
import { initializeOwner } from "@/lib/server/setup";
import { ownerExists } from "@/lib/server/workspace";

export const runtime = "nodejs";
export async function GET() {
  try {
    return privateJson({
      initialized: await ownerExists(await getDatabase()),
      requiresSetupToken: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    return privateJson(
      await initializeOwner(await readJson(request, 16_384)),
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
