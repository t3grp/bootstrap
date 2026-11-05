import { getAuth, requireOrigin } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/errors";
import { privateHeaders, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
const allowedGet = new Set(["/api/auth/get-session"]);
const allowedPost = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/sign-out",
  "/api/auth/change-password",
]);
export async function GET(request: Request) {
  if (!allowedGet.has(new URL(request.url).pathname))
    return new Response(null, { status: 404 });
  try {
    const response = await (await getAuth()).handler(request);
    for (const [key, value] of Object.entries(privateHeaders))
      response.headers.set(key, value);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  if (!allowedPost.has(new URL(request.url).pathname))
    return new Response(null, { status: 404 });
  try {
    requireOrigin(request);
    const body = await readJson(request, 16_384);
    const response = await (
      await getAuth()
    ).handler(
      new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(body),
      }),
    );
    for (const [key, value] of Object.entries(privateHeaders))
      response.headers.set(key, value);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
