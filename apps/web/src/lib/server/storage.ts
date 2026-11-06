import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDirectory } from "@bootstrap/db";
import {
  FILE_STORAGE_HOST,
  FILE_STORAGE_KEY,
} from "../../../../../packages/core/src/file-storage";
import { AppError } from "./errors";
import { boundedBody } from "./http";
import { LIMITS } from "./validation";

function validateKey(key: string) {
  if (!FILE_STORAGE_KEY.test(key))
    throw new Error("Invalid internal storage key");
}

function useCloudflareStorage() {
  const storage = process.env.BOOTSTRAP_FILE_STORAGE || "local";
  if (storage !== "local" && storage !== "cloudflare-r2")
    throw new Error("Unsupported BOOTSTRAP_FILE_STORAGE configuration.");
  return storage === "cloudflare-r2";
}

async function cloudflareFile(key: string, init?: RequestInit) {
  validateKey(key);
  // This virtual host is intercepted inside the Cloudflare container. It is
  // never a public file route and needs no R2 credentials in the Node process.
  const response = await fetch(`http://${FILE_STORAGE_HOST}/files/${key}`, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404)
    throw new AppError(404, "The stored file could not be found.");
  if (!response.ok)
    throw new AppError(503, "Private file storage is unavailable.");
  return response;
}

function storedPath(key: string) {
  validateKey(key);
  return path.join(dataDirectory(), "files", key);
}

export async function writeStoredFile(file: File) {
  if (file.size > LIMITS.fileBytes)
    throw new AppError(
      413,
      "Files can be up to 10 MB in this version.",
      "FILE_TOO_LARGE",
    );
  const name = file.name
    .replace(/^.*[\\/]/, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
  if (!name) throw new AppError(400, "Give this file a name.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const storageKey = randomUUID();
  if (useCloudflareStorage()) {
    await cloudflareFile(storageKey, {
      method: "PUT",
      body: new Uint8Array(bytes),
    });
  } else {
    const destination = storedPath(storageKey);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await writeFile(destination, bytes, { mode: 0o600, flag: "wx" });
  }
  return {
    id: randomUUID(),
    name,
    mimeType: /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(file.type)
      ? file.type
      : "application/octet-stream",
    size: bytes.length,
    storageKey,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function readStoredFile(key: string) {
  if (useCloudflareStorage()) {
    const response = await cloudflareFile(key);
    return Buffer.from(await boundedBody(response, LIMITS.fileBytes));
  }
  return readFile(storedPath(key));
}
export async function removeStoredFile(key: string) {
  if (useCloudflareStorage()) {
    await cloudflareFile(key, { method: "DELETE" });
    return;
  }
  try {
    await unlink(storedPath(key));
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
}

export function attachmentDisposition(name: string) {
  const ascii =
    name.replace(/[^a-zA-Z0-9 ._-]/g, "_").slice(0, 150) || "download";
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
