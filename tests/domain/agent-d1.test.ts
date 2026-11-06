import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { and, eq } from "drizzle-orm";
import { createDatabase, schema, type DatabaseConnection } from "@bootstrap/db";
import type { AssignmentInput } from "@bootstrap/core";
import {
  createWorkspace,
  executeCommand,
} from "../../apps/web/src/lib/server/workspace";
import {
  admitAssignment,
  getAgentRun,
  saveAgentResult,
} from "../../apps/web/src/lib/server/agent-execution";
import {
  claimAgentRun,
  executeAgentLease,
} from "../../apps/web/src/lib/server/agent-worker";
import {
  deterministicProvider,
  providerSettings,
} from "../../apps/web/src/lib/server/agent-provider";

import { startD1 } from "../helpers/d1";
let runtime: Awaited<ReturnType<typeof startD1>>;
let fixtureDirectory: string;
let preload: string;
const owner = {
  id: randomUUID(),
  name: "D1 owner",
  email: `d1-${randomUUID()}@example.test`,
};
const settings = providerSettings({
  BOOTSTRAP_MODEL_PROVIDER: "deterministic",
  BOOTSTRAP_ENABLE_TEST_PROVIDER: "true",
});
let a: DatabaseConnection,
  b: DatabaseConnection,
  workspaceId: string,
  input: AssignmentInput;
let isolatedBundle: string | undefined;
const children = new Set<ChildProcess>();
async function stop(child: ChildProcess, signal: NodeJS.Signals = "SIGTERM") {
  if (child.exitCode === null && child.signalCode === null) {
    const exit = once(child, "exit");
    child.kill(signal);
    await exit;
  }
  children.delete(child);
}
function worker(delayMs: number) {
  const args =
    process.env.BOOTSTRAP_TEST_BUILT_WORKER === "true"
      ? [path.join(isolatedBundle!, "worker.mjs")]
      : ["--import", "tsx", path.resolve("apps/worker/src/index.ts")];
  const child = spawn(process.execPath, ["--import", preload, ...args], {
    cwd: isolatedBundle ?? process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_PATH: "",
      DATABASE_URL: "",
      BOOTSTRAP_DATABASE: "cloudflare-d1",
      BOOTSTRAP_MODEL_PROVIDER: "deterministic",
      BOOTSTRAP_ENABLE_TEST_PROVIDER: "true",
      BOOTSTRAP_MODEL_API_KEY: "",
      BOOTSTRAP_MODEL_ID: "",
      BOOTSTRAP_MODEL_BASE_URL: "",
      BOOTSTRAP_TEST_PROVIDER_DELAY_MS: String(delayMs),
    },
  });
  let diagnostic = "";
  child.stderr?.on("data", (chunk) => {
    diagnostic = (diagnostic + String(chunk)).slice(-3000);
  });
  children.add(child);
  return { child, diagnostic: () => diagnostic };
}

describe("D1 concurrency and real worker restart", () => {
  beforeAll(async () => {
    runtime = await startD1();
    fixtureDirectory = await mkdtemp(
      path.join(os.tmpdir(), "bootstrap-d1-worker-"),
    );
    preload = path.join(fixtureDirectory, "private-d1.mjs");
    await writeFile(
      preload,
      `const original = globalThis.fetch;
      globalThis.fetch = (input, init) => original(
        typeof input === 'string' && input.startsWith('http://bootstrap-db.internal/')
          ? input.replace('http://bootstrap-db.internal', ${JSON.stringify(runtime.origin)}) : input, init);
    `,
    );
    a = await createDatabase({ transport: runtime.transport });
    b = await createDatabase({ transport: runtime.transport });
    await a.db.insert(schema.user).values(owner);
    if (process.env.BOOTSTRAP_TEST_BUILT_WORKER === "true") {
      isolatedBundle = await mkdtemp(
        path.join(os.tmpdir(), "bootstrap-worker-bundle-"),
      );
      await cp(path.resolve("apps/web/.next/standalone"), isolatedBundle, {
        recursive: true,
        verbatimSymlinks: true,
      });
    }
  });
  beforeEach(async () => {
    await a.db.delete(schema.workspaces);
    workspaceId = await a.db.atomic((tx) =>
      createWorkspace(tx, owner.id, "D1 integration"),
    );
    const state = await executeCommand(a.db, owner, workspaceId, {
      type: "agent.create",
      name: "D1 researcher",
    });
    const agentId = state.agents[0].id;
    await executeCommand(a.db, owner, workspaceId, {
      type: "agent.update",
      id: agentId,
      patch: { instructions: "Produce a short reviewable result." },
    });
    input = {
      operationKey: randomUUID(),
      agentId,
      prompt: "Write a founder checklist.",
      outputTitle: "D1 result",
      resources: [],
    };
  });
  afterAll(async () => {
    for (const child of children) await stop(child, "SIGKILL");
    await a?.close();
    await b?.close();
    await runtime?.close();
    if (fixtureDirectory)
      await rm(fixtureDirectory, { recursive: true, force: true });
    if (isolatedBundle)
      await rm(isolatedBundle, { recursive: true, force: true });
  });

  it("serializes admission, worker claims, and result acceptance across independent clients", async () => {
    const [first, replay] = await Promise.all([
      admitAssignment(a.db, owner, workspaceId, input, settings),
      admitAssignment(b.db, owner, workspaceId, input, settings),
    ]);
    expect(first.id).toBe(replay.id);
    const claims = await Promise.all([
      claimAgentRun(a.db, "a"),
      claimAgentRun(b.db, "b"),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await executeAgentLease(a.db, claims.find(Boolean)!, {
      provider: deterministicProvider(),
    });
    const [saved, duplicate] = await Promise.all([
      saveAgentResult(a.db, owner, workspaceId, first.id),
      saveAgentResult(b.db, owner, workspaceId, first.id),
    ]);
    expect(saved.resultDocumentId).toBe(duplicate.resultDocumentId);
    const results = await a.db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.sourceRunId, first.id));
    expect(results).toHaveLength(1);
    expect(saved.messages).toHaveLength(2);
    expect(saved.steps).toBe(1);
  });

  it("kills a worker during streaming and recovers one deterministic result in a new process", async () => {
    const accepted = await admitAssignment(
      a.db,
      owner,
      workspaceId,
      input,
      settings,
    );
    const first = worker(500);
    await vi.waitFor(
      async () => {
        expect(first.child.exitCode, first.diagnostic()).toBeNull();
        const run = await getAgentRun(a.db, owner, workspaceId, accepted.id);
        expect(run.status).toBe("running");
        expect(run.events.some((event) => event.type === "output.delta")).toBe(
          true,
        );
      },
      { timeout: 15000, interval: 100 },
    );
    await stop(first.child, "SIGKILL");
    // Advance only the persisted lease boundary instead of sleeping through a full lease.
    await a.db
      .update(schema.agentRuns)
      .set({ leaseExpiresAt: new Date(Date.now() - 1000) })
      .where(
        and(
          eq(schema.agentRuns.workspaceId, workspaceId),
          eq(schema.agentRuns.id, accepted.id),
        ),
      );
    const second = worker(0);
    await vi.waitFor(
      async () => {
        expect(second.child.exitCode, second.diagnostic()).toBeNull();
        expect(
          (await getAgentRun(b.db, owner, workspaceId, accepted.id)).status,
        ).toBe("succeeded");
      },
      { timeout: 15000, interval: 100 },
    );
    await stop(second.child);
    const run = await getAgentRun(a.db, owner, workspaceId, accepted.id);
    expect(run.attempt).toBe(2);
    expect(run.steps).toBe(1);
    expect(
      run.messages.filter((message) => message.role === "assistant"),
    ).toHaveLength(1);
    expect(run.events.some((event) => event.type === "output.reset")).toBe(
      true,
    );
    const saved = await saveAgentResult(a.db, owner, workspaceId, run.id);
    expect(
      (await saveAgentResult(b.db, owner, workspaceId, run.id))
        .resultDocumentId,
    ).toBe(saved.resultDocumentId);
  }, 45000);
});
