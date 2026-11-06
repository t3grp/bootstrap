import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const supervisor = fileURLToPath(
  new URL("../../scripts/cloudflare-supervisor.mjs", import.meta.url),
);
const env = {
  ...process.env,
  BOOTSTRAP_DATABASE: "cloudflare-d1",
  BETTER_AUTH_URL: "https://bootstrap.example",
  BETTER_AUTH_SECRET: "test-secret-unused-by-fixtures",
  BOOTSTRAP_SETUP_TOKEN: "test-token-unused-by-fixtures",
  BOOTSTRAP_FILE_STORAGE: "cloudflare-r2",
};

describe("Cloudflare process supervisor", () => {
  it("terminates the web process when the worker crashes", async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "bootstrap-supervisor-"),
    );
    let child;
    try {
      await mkdir(path.join(directory, "apps/web"), { recursive: true });
      await writeFile(
        path.join(directory, "apps/web/server.js"),
        `
        const fs = require('node:fs');
        process.on('SIGTERM', () => { fs.writeFileSync('web-stopped', 'yes'); process.exit(0); });
        fs.writeFileSync('web-ready', 'yes');
        setInterval(() => {}, 100);
      `,
      );
      await writeFile(
        path.join(directory, "worker.mjs"),
        `
        import { existsSync } from 'node:fs';
        setInterval(() => { if (existsSync('web-ready')) process.exit(7); }, 20);
      `,
      );
      child = spawn(process.execPath, [supervisor], {
        cwd: directory,
        env,
        stdio: "ignore",
      });
      const [code] = await once(child, "exit");
      expect(code).toBe(1);
      expect(await readFile(path.join(directory, "web-stopped"), "utf8")).toBe(
        "yes",
      );
    } finally {
      child?.kill("SIGTERM");
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuses to start without durable D1 configuration", async () => {
    const child = spawn(process.execPath, [supervisor], {
      env: { ...env, BOOTSTRAP_DATABASE: "" },
      stdio: "ignore",
    });
    const [code] = await once(child, "exit");
    expect(code).toBe(1);
  });

  it("refuses ephemeral upload storage on Cloudflare", async () => {
    const child = spawn(process.execPath, [supervisor], {
      env: { ...env, BOOTSTRAP_FILE_STORAGE: "local" },
      stdio: "ignore",
    });
    const [code] = await once(child, "exit");
    expect(code).toBe(1);
  });
});
