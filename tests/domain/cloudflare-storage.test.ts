import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Miniflare } from "miniflare";
import { randomUUID } from "node:crypto";
import { handlePrivateFile } from "../../apps/cloudflare/storage";
import {
  FILE_STORAGE_HOST,
  MAX_FILE_BYTES,
} from "../../packages/core/src/file-storage";
import {
  readStoredFile,
  removeStoredFile,
  writeStoredFile,
} from "../../apps/web/src/lib/server/storage";

describe("Cloudflare private file storage", () => {
  let runtime: Miniflare;
  let bucket: Parameters<typeof handlePrivateFile>[1];
  beforeAll(async () => {
    runtime = new Miniflare({
      workers: [
        {
          config: {
            name: "storage-tests",
            compatibilityDate: "2026-11-06",
            manifest: {
              mainModule: "test.mjs",
              modules: {
                "test.mjs": {
                  type: "esm",
                  contents:
                    "export default { fetch() { return new Response('test'); } }",
                },
              },
            },
            env: { FILES: { type: "r2", name: `test-files-${randomUUID()}` } },
          },
        },
      ],
      cf: false,
      telemetry: { enabled: false },
    });
    bucket = (await runtime.getR2Bucket("FILES")) as unknown as typeof bucket;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  afterAll(async () => runtime?.dispose());

  const url = (key: string) => `http://${FILE_STORAGE_HOST}/files/${key}`;
  const request = (key: string, init?: RequestInit) =>
    handlePrivateFile(new Request(url(key), init), bucket);

  it("round-trips Node uploads through the actual R2 binding and deletes idempotently", async () => {
    vi.stubEnv("BOOTSTRAP_FILE_STORAGE", "cloudflare-r2");
    vi.stubGlobal("fetch", (input: string, init?: RequestInit) =>
      handlePrivateFile(new Request(input, init), bucket),
    );
    const file = await writeStoredFile(
      new File(["private founder notes"], "notes.txt", { type: "text/plain" }),
    );
    expect((await readStoredFile(file.storageKey)).toString()).toBe(
      "private founder notes",
    );
    expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect((await bucket.head(`files/${file.storageKey}`))?.size).toBe(
      file.size,
    );
    await removeStoredFile(file.storageKey);
    await removeStoredFile(file.storageKey);
    expect(await bucket.get(`files/${file.storageKey}`)).toBeNull();
    await expect(readStoredFile(file.storageKey)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("uses an atomic R2 precondition so existing bytes cannot be overwritten", async () => {
    const key = randomUUID();
    expect(
      (await request(key, { method: "PUT", body: "original" })).status,
    ).toBe(201);
    expect(
      (await request(key, { method: "PUT", body: "replacement" })).status,
    ).toBe(412);
    const result = await request(key);
    expect(await result.text()).toBe("original");
    expect(result.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects invalid keys, paths, hostnames, queries and methods", async () => {
    const key = randomUUID();
    for (const path of ["../secret", "-".repeat(36), `${key}?other=true`])
      expect((await request(path)).status).toBe(404);
    expect(
      (
        await handlePrivateFile(
          new Request(`http://public.example/files/${key}`),
          bucket,
        )
      ).status,
    ).toBe(404);
    expect((await request(key, { method: "POST" })).status).toBe(405);
    expect((await request(key)).status).toBe(404);
  });

  it("enforces the upload limit independently of Content-Length", async () => {
    const key = randomUUID();
    expect(
      (
        await request(key, {
          method: "PUT",
          headers: { "Content-Length": String(MAX_FILE_BYTES + 1) },
          body: "x",
        })
      ).status,
    ).toBe(413);
    expect(
      (
        await request(key, {
          method: "PUT",
          headers: { "Content-Length": "1" },
          body: new Uint8Array(MAX_FILE_BYTES + 1),
        })
      ).status,
    ).toBe(413);
    expect(await bucket.get(`files/${key}`)).toBeNull();
  });

  it("fails closed for a misspelled storage configuration", async () => {
    vi.stubEnv("BOOTSTRAP_FILE_STORAGE", "cloudfare-r2");
    await expect(writeStoredFile(new File(["data"], "a.txt"))).rejects.toThrow(
      "Unsupported BOOTSTRAP_FILE_STORAGE",
    );
  });

  it("does not fall back to ephemeral files when R2 is unavailable", async () => {
    vi.stubEnv("BOOTSTRAP_FILE_STORAGE", "cloudflare-r2");
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(null, { status: 503 })),
    );
    await expect(
      writeStoredFile(new File(["data"], "a.txt")),
    ).rejects.toMatchObject({ status: 503 });
  });
});
