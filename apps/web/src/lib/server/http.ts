import { AppError } from "./errors";

export const privateHeaders = {
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
};
export function privateJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: privateHeaders });
}

export async function boundedBody(request: Request, limit: number) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit))
    throw new AppError(413, "This request is too large.", "PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new AppError(
          413,
          "This request is too large.",
          "PAYLOAD_TOO_LARGE",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}

export async function readJson(
  request: Request,
  limit = 5 * 1024 * 1024,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AppError(415, "Send a JSON request.", "UNSUPPORTED_MEDIA_TYPE");
  const body = await boundedBody(request, limit);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new AppError(400, "The JSON request is invalid.", "INVALID_JSON");
  }
}
