import {
  FILE_STORAGE_HOST,
  FILE_STORAGE_KEY,
  MAX_FILE_BYTES,
} from "../../packages/core/src/file-storage";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function reply(status: number) {
  return new Response(null, { status, headers: privateHeaders });
}

/** Only registered as a container outbound handler; never called by public fetch. */
export async function handlePrivateFile(request: Request, bucket: R2Bucket) {
  const url = new URL(request.url);
  const key = url.pathname.slice("/files/".length);
  if (
    url.hostname !== FILE_STORAGE_HOST ||
    !url.pathname.startsWith("/files/") ||
    url.search ||
    !FILE_STORAGE_KEY.test(key)
  )
    return reply(404);

  const objectKey = `files/${key}`;
  if (request.method === "GET") {
    const object = await bucket.get(objectKey);
    if (!object) return reply(404);
    if (object.size > MAX_FILE_BYTES) {
      await object.body.cancel();
      return reply(413);
    }
    return new Response(object.body, {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(object.size),
      },
    });
  }
  if (request.method === "DELETE") {
    await bucket.delete(objectKey);
    return reply(204);
  }
  if (request.method !== "PUT")
    return new Response(null, {
      status: 405,
      headers: { ...privateHeaders, Allow: "GET, PUT, DELETE" },
    });

  const declared = request.headers.get("content-length");
  if (
    declared &&
    (!/^\d+$/.test(declared) || Number(declared) > MAX_FILE_BYTES)
  )
    return reply(413);
  // Enforce the same limit even for chunked/incorrectly declared uploads.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_FILE_BYTES) {
          await reader.cancel();
          return reply(413);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader?.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const object = await bucket.put(objectKey, body, {
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: "application/octet-stream" },
  });
  return reply(object ? 201 : 412);
}
