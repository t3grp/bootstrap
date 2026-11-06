import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
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
import { and, eq, sql } from "drizzle-orm";
import {
  createDatabase,
  schema,
  type Database,
  type DatabaseConnection,
} from "@bootstrap/db";
import type { AssignmentInput, PageContent } from "@bootstrap/core";
import {
  addPrivateFile,
  createWorkspace,
  executeCommand,
  getSnapshot,
  type Actor,
} from "../../apps/web/src/lib/server/workspace";
import { writeStoredFile } from "../../apps/web/src/lib/server/storage";
import {
  admitAssignment,
  cancelAgentRun,
  getAgentRun,
  loadRun,
  saveAgentResult,
} from "../../apps/web/src/lib/server/agent-execution";
import {
  claimAgentRun,
  checkpointAgentResult,
  executeAgentLease,
  finishAgentRun,
  prepareAgentStep,
  type Lease,
} from "../../apps/web/src/lib/server/agent-worker";
import {
  configuredProvider,
  deterministicProvider,
  providerSettings,
  providerStatus,
  type ModelProvider,
  type ProviderInput,
} from "../../apps/web/src/lib/server/agent-provider";

const owner: Actor = {
  id: randomUUID(),
  name: "Owner",
  email: "agent-owner@example.test",
};
const other: Actor = {
  id: randomUUID(),
  name: "Other",
  email: "agent-other@example.test",
};
const settings = providerSettings({
  BOOTSTRAP_MODEL_PROVIDER: "deterministic",
  BOOTSTRAP_ENABLE_TEST_PROVIDER: "true",
});
let connection: DatabaseConnection,
  db: Database,
  workspaceId: string,
  foreignWorkspaceId: string;
const body = (text: string): PageContent => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { id: randomUUID() },
      content: [{ type: "text", text }],
    },
  ],
});

async function setup(database: Database, actor = owner) {
  const workspaceId = await database.transaction((tx) =>
    createWorkspace(tx, actor.id, "Agent test"),
  );
  let snapshot = await executeCommand(database, actor, workspaceId, {
    type: "agent.create",
    name: "Researcher",
  });
  const agentId = snapshot.agents[0].id;
  const pageId = snapshot.pages[0].id;
  snapshot = await executeCommand(database, actor, workspaceId, {
    type: "page.update",
    id: pageId,
    revision: 1,
    patch: {
      title: "Selected customer notes",
      content: body("Customers asked for a calmer weekly review."),
    },
  });
  await executeCommand(database, actor, workspaceId, {
    type: "agent.update",
    id: agentId,
    patch: {
      instructions: "Summarize only the selected evidence.",
      pageIds: [pageId],
      memories: ["The founder prefers concise next steps."],
    },
  });
  const input: AssignmentInput = {
    operationKey: randomUUID(),
    agentId,
    prompt: "Suggest the next step.",
    outputTitle: "Customer follow-up",
    resources: [
      { kind: "page", id: pageId, version: String(snapshot.pages[0].revision) },
    ],
  };
  return { workspaceId, input, pageId, agentId };
}
function provider(stream: ModelProvider["stream"]): ModelProvider {
  return { ...deterministicProvider(), stream };
}
async function expire(database: Database, lease: Lease) {
  await database
    .update(schema.agentRuns)
    .set({ leaseExpiresAt: new Date(Date.now() - 1000) })
    .where(
      and(
        eq(schema.agentRuns.workspaceId, lease.workspaceId),
        eq(schema.agentRuns.id, lease.runId),
      ),
    );
}

beforeAll(async () => {
  connection = await createDatabase({ memory: true });
  db = connection.db;
  await db.insert(schema.user).values([owner, other]);
  await db.insert(schema.instance).values({ id: "primary", ownerId: owner.id });
});
beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE workspaces CASCADE`);
  workspaceId = (await setup(db)).workspaceId;
  foreignWorkspaceId = await db.transaction((tx) =>
    createWorkspace(tx, other.id, "Private other workspace"),
  );
});
afterAll(async () => {
  await connection?.close();
});
async function inputFor(ws = workspaceId) {
  const state = await getSnapshot(db, owner, ws);
  return {
    operationKey: randomUUID(),
    agentId: state.agents[0].id,
    prompt: "Summarize the selected customer notes.",
    outputTitle: "Customer next steps",
    resources: [
      {
        kind: "page",
        id: state.pages[0].id,
        version: String(state.pages[0].revision),
      },
    ],
  } satisfies AssignmentInput;
}

describe("agent assignment admission and scope", () => {
  it("keeps missing credentials honest while manual work remains usable", async () => {
    const missing = providerSettings({
      BOOTSTRAP_MODEL_PROVIDER: "openai-compatible",
      BOOTSTRAP_MODEL_ID: "test-model",
    });
    expect(missing.ready).toBe(false);
    expect(providerStatus({}).kind).toBe("unconfigured");
    expect(
      providerStatus({ BOOTSTRAP_MODEL_PROVIDER: "deterministic" }).ready,
    ).toBe(false);
    await expect(
      admitAssignment(db, owner, workspaceId, await inputFor(), missing),
    ).rejects.toMatchObject({ code: "CONFIGURATION_REQUIRED" });
    const state = await executeCommand(db, owner, workspaceId, {
      type: "page.create",
      title: "Manual work still available",
    });
    expect(
      state.pages.some((page) => page.title === "Manual work still available"),
    ).toBe(true);
    const configured = providerStatus({
      BOOTSTRAP_MODEL_PROVIDER: "openai-compatible",
      BOOTSTRAP_MODEL_ID: "test",
      BOOTSTRAP_MODEL_BASE_URL: "https://provider.example.test/v1",
      BOOTSTRAP_MODEL_API_KEY: "fixture-secret-never-dispatched",
    });
    expect(configured.ready).toBe(true);
    expect(JSON.stringify(configured)).not.toContain("fixture-secret");
    expect(JSON.stringify(configured)).not.toContain("provider.example.test");
    expect(providerStatus({ BOOTSTRAP_AGENT_TIMEOUT_MS: "NaN" }).ready).toBe(
      false,
    );
  });

  it("admits one durable assignment for concurrent identical submissions and rejects changed reuse", async () => {
    const input = await inputFor();
    const [first, second] = await Promise.all([
      admitAssignment(db, owner, workspaceId, input, settings),
      admitAssignment(db, owner, workspaceId, input, settings),
    ]);
    expect(first.id).toBe(second.id);
    expect(await db.select().from(schema.agentThreads)).toHaveLength(1);
    expect(await db.select().from(schema.agentAssignments)).toHaveLength(1);
    expect(await db.select().from(schema.agentMessages)).toHaveLength(1);
    await expect(
      admitAssignment(
        db,
        owner,
        workspaceId,
        { ...input, prompt: "Changed request" },
        settings,
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(
      (
        await admitAssignment(
          db,
          owner,
          workspaceId,
          input,
          providerSettings({}),
        )
      ).id,
    ).toBe(first.id);
  });

  it("rejects other owners, cross-workspace agents/resources, and unbound sources", async () => {
    const input = await inputFor();
    await expect(
      admitAssignment(db, other, workspaceId, input, settings),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      admitAssignment(db, owner, foreignWorkspaceId, input, settings),
    ).rejects.toMatchObject({ status: 404 });
    const foreignPage = (await getSnapshot(db, other, foreignWorkspaceId))
      .pages[0];
    await expect(
      admitAssignment(
        db,
        owner,
        workspaceId,
        {
          ...input,
          resources: [{ kind: "page", id: foreignPage.id, version: "1" }],
        },
        settings,
      ),
    ).rejects.toMatchObject({ code: "RESOURCE_NOT_GRANTED" });
    const state = await executeCommand(db, owner, workspaceId, {
      type: "page.create",
      title: "Unbound",
    });
    const unbound = state.pages.find((p) => p.title === "Unbound")!;
    await expect(
      admitAssignment(
        db,
        owner,
        workspaceId,
        {
          ...input,
          resources: [{ kind: "page", id: unbound.id, version: "1" }],
        },
        settings,
      ),
    ).rejects.toMatchObject({ code: "RESOURCE_NOT_GRANTED" });
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      input,
      settings,
    );
    for (const operation of [getAgentRun, cancelAgentRun, saveAgentResult])
      await expect(
        operation(db, other, workspaceId, accepted.id),
      ).rejects.toMatchObject({ status: 404 });
    await expect(
      getAgentRun(db, owner, foreignWorkspaceId, accepted.id),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("sends only explicit snapshots, omits embedded references, and pins instructions", async () => {
    const input = await inputFor();
    let state = await executeCommand(db, owner, workspaceId, {
      type: "page.create",
      title: "Private secret page",
    });
    const privatePage = state.pages.find(
      (p) => p.title === "Private secret page",
    )!;
    state = await executeCommand(db, owner, workspaceId, {
      type: "page.update",
      id: privatePage.id,
      revision: 1,
      patch: { content: body("SECRET_UNSELECTED_917") },
    });
    const selectedPage = state.pages.find(
      (p) => p.id === input.resources[0].id,
    )!;
    await executeCommand(db, owner, workspaceId, {
      type: "page.update",
      id: selectedPage.id,
      revision: selectedPage.revision,
      patch: {
        content: {
          type: "doc",
          content: [
            ...body("Selected public customer note.").content,
            {
              type: "childPage",
              attrs: { id: randomUUID(), pageId: privatePage.id },
            },
          ],
        },
      },
    });
    await executeCommand(db, owner, workspaceId, {
      type: "agent.update",
      id: input.agentId,
      patch: { pageIds: [selectedPage.id, privatePage.id] },
    });
    const admitted = await admitAssignment(
      db,
      owner,
      workspaceId,
      {
        ...input,
        resources: [
          { ...input.resources[0], version: String(selectedPage.revision + 1) },
        ],
      },
      settings,
    );
    await executeCommand(db, owner, workspaceId, {
      type: "agent.update",
      id: input.agentId,
      patch: { instructions: "CHANGED_AFTER_ADMISSION" },
    });
    let received: ProviderInput | undefined;
    const mock = provider(async function* (input) {
      received = input;
      yield { type: "text", text: "Use the customer note [S1]." };
      yield {
        type: "finish",
        inputTokens: 25,
        outputTokens: 8,
        reason: "stop",
      };
    });
    await executeAgentLease(db, (await claimAgentRun(db, "worker"))!, {
      provider: mock,
    });
    expect(received!.prompt).toContain("Selected public customer note");
    expect(received!.prompt).not.toContain("SECRET_UNSELECTED");
    expect(received!.prompt).not.toContain(privatePage.id);
    expect(received!.system).not.toContain("CHANGED_AFTER_ADMISSION");
    expect(
      (await getAgentRun(db, owner, workspaceId, admitted.id)).status,
    ).toBe("succeeded");
  });

  it("rejects stale resource selection and oversized input before any model step", async () => {
    const input = await inputFor();
    await expect(
      admitAssignment(
        db,
        owner,
        workspaceId,
        { ...input, resources: [{ ...input.resources[0], version: "1" }] },
        settings,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
    await expect(
      admitAssignment(
        db,
        owner,
        workspaceId,
        { ...input, limits: { maxInputTokens: 100 } },
        settings,
      ),
    ).rejects.toMatchObject({ code: "INPUT_LIMIT" });
    expect(await db.select().from(schema.agentRuns)).toHaveLength(0);
    await expect(
      admitAssignment(
        db,
        owner,
        workspaceId,
        { ...input, limits: { maxSteps: 2 } },
        settings,
      ),
    ).rejects.toThrow();
  });

  it("reads a selected canonical table without following its file cells", async () => {
    const input = await inputFor();
    const state = await executeCommand(db, owner, workspaceId, {
      type: "table.create",
      name: "Customer table",
    });
    const table = state.tables[0];
    const columnId = table.columns[0].id;
    await executeCommand(db, owner, workspaceId, {
      type: "table.update",
      id: table.id,
      revision: table.revision,
      patch: {
        rows: [
          { id: randomUUID(), cells: { [columnId]: "Chosen table customer" } },
        ],
      },
    });
    await executeCommand(db, owner, workspaceId, {
      type: "agent.update",
      id: input.agentId,
      patch: { tableIds: [table.id] },
    });
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      {
        ...input,
        resources: [
          { kind: "table", id: table.id, version: String(table.revision + 1) },
        ],
      },
      settings,
    );
    const job = await loadRun(db, workspaceId, accepted.id);
    expect(job.run.context).toContain("Chosen table customer");
    expect(job.run.context).not.toContain(
      "Customers asked for a calmer weekly review",
    );
    expect(job.run.sources[0].kind).toBe("table");
  });

  it("reads private UTF-8 files by authorized ID and rejects unsupported formats", async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "bootstrap-agent-file-"),
    );
    const priorDirectory = process.env.BOOTSTRAP_DATA_DIR;
    process.env.BOOTSTRAP_DATA_DIR = directory;
    try {
      const input = await inputFor();
      const file = await writeStoredFile(
        new File(["Selected private text file."], "notes.txt", {
          type: "text/plain",
        }),
      );
      await addPrivateFile(db, owner, workspaceId, file);
      const unsupported = await writeStoredFile(
        new File(["binary fixture"], "scan.pdf", { type: "application/pdf" }),
      );
      await addPrivateFile(db, owner, workspaceId, unsupported);
      await executeCommand(db, owner, workspaceId, {
        type: "agent.update",
        id: input.agentId,
        patch: { fileIds: [file.id, unsupported.id] },
      });
      const state = await getSnapshot(db, owner, workspaceId);
      const version = state.files.find((f) => f.id === file.id)!.createdAt;
      const accepted = await admitAssignment(
        db,
        owner,
        workspaceId,
        { ...input, resources: [{ kind: "file", id: file.id, version }] },
        settings,
      );
      expect(
        (await loadRun(db, workspaceId, accepted.id)).run.context,
      ).toContain("Selected private text file");
      expect(JSON.stringify(accepted)).not.toContain(file.storageKey);
      await expect(
        admitAssignment(
          db,
          owner,
          workspaceId,
          {
            ...input,
            operationKey: randomUUID(),
            resources: [
              {
                kind: "file",
                id: unsupported.id,
                version: state.files.find((f) => f.id === unsupported.id)!
                  .createdAt,
              },
            ],
          },
          settings,
        ),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_SOURCE" });
      await executeCommand(db, owner, workspaceId, {
        type: "file.delete",
        id: file.id,
      });
      await executeAgentLease(db, (await claimAgentRun(db, "worker"))!, {
        provider: deterministicProvider(),
      });
      expect(
        (await getAgentRun(db, owner, workspaceId, accepted.id)).status,
      ).toBe("failed");
    } finally {
      if (priorDirectory === undefined) delete process.env.BOOTSTRAP_DATA_DIR;
      else process.env.BOOTSTRAP_DATA_DIR = priorDirectory;
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each(["binding", "trash", "memory", "agent", "owner"])(
    "blocks queued dispatch after %s access changes",
    async (change) => {
      const input = await inputFor();
      const accepted = await admitAssignment(
        db,
        owner,
        workspaceId,
        input,
        settings,
      );
      if (change === "binding")
        await executeCommand(db, owner, workspaceId, {
          type: "agent.update",
          id: input.agentId,
          patch: { pageIds: [] },
        });
      if (change === "trash")
        await executeCommand(db, owner, workspaceId, {
          type: "page.trash",
          id: input.resources[0].id,
          revision: Number(input.resources[0].version),
        });
      if (change === "memory")
        await executeCommand(db, owner, workspaceId, {
          type: "agent.update",
          id: input.agentId,
          patch: { memories: [] },
        });
      if (change === "agent")
        await executeCommand(db, owner, workspaceId, {
          type: "agent.delete",
          id: input.agentId,
        });
      if (change === "owner")
        await db
          .delete(schema.memberships)
          .where(
            and(
              eq(schema.memberships.workspaceId, workspaceId),
              eq(schema.memberships.userId, owner.id),
            ),
          );
      const stream = vi.fn(deterministicProvider().stream);
      await executeAgentLease(db, (await claimAgentRun(db, "worker"))!, {
        provider: provider(stream),
      });
      expect(stream).not.toHaveBeenCalled();
      expect((await loadRun(db, workspaceId, accepted.id)).run.status).toBe(
        "failed",
      );
    },
  );
});

describe("bounded work and persisted results", () => {
  it("completes the full path and saves exactly one page without overwriting selected sources", async () => {
    const input = await inputFor();
    const original = (await getSnapshot(db, owner, workspaceId)).pages[0];
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      input,
      settings,
    );
    await executeAgentLease(db, (await claimAgentRun(db, "worker"))!, {
      provider: deterministicProvider(),
    });
    const completed = await getAgentRun(db, owner, workspaceId, accepted.id);
    expect(completed).toMatchObject({
      status: "succeeded",
      assignmentStatus: "needs_review",
      steps: 1,
      attempt: 1,
    });
    expect(completed.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(completed.outputText).toContain("no AI model was called");
    expect(completed.events.some((e) => e.type === "output.delta")).toBe(true);
    expect(completed.sources).toMatchObject([
      { id: original.id, version: String(original.revision), citation: "S1" },
    ]);
    const [saved, repeated] = await Promise.all([
      saveAgentResult(db, owner, workspaceId, accepted.id),
      saveAgentResult(db, owner, workspaceId, accepted.id),
    ]);
    expect(saved.resultDocumentId).toBe(repeated.resultDocumentId);
    const snapshot = await getSnapshot(db, owner, workspaceId);
    expect(
      snapshot.pages.filter((p) => p.sourceRunId === accepted.id),
    ).toHaveLength(1);
    expect(snapshot.pages.find((p) => p.id === original.id)).toEqual(original);
    const output = snapshot.pages.find((p) => p.id === saved.resultDocumentId)!;
    expect(
      output.content.content.some(
        (node) => node.content?.[0]?.text === completed.outputText,
      ),
    ).toBe(true);
    await executeCommand(db, owner, workspaceId, {
      type: "page.trash",
      id: output.id,
      revision: output.revision,
    });
    expect(
      (await saveAgentResult(db, owner, workspaceId, accepted.id))
        .resultDocumentId,
    ).toBe(output.id);
  });

  it("cancels queued work and rejects saving incomplete output", async () => {
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      await inputFor(),
      settings,
    );
    await cancelAgentRun(db, owner, workspaceId, accepted.id);
    expect(await claimAgentRun(db, "worker")).toBeNull();
    await expect(
      saveAgentResult(db, owner, workspaceId, accepted.id),
    ).rejects.toMatchObject({ code: "RESULT_NOT_READY" });
  });

  it("fences cancellation against an in-flight completion", async () => {
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      await inputFor(),
      settings,
    );
    let started!: () => void, release!: () => void;
    const dispatch = new Promise<void>((resolve) => {
      started = resolve;
    });
    const response = new Promise<void>((resolve) => {
      release = resolve;
    });
    const execution = executeAgentLease(
      db,
      (await claimAgentRun(db, "worker"))!,
      {
        provider: provider(async function* () {
          started();
          await response;
          yield { type: "text", text: "A late response must not win." };
          yield {
            type: "finish",
            inputTokens: 1,
            outputTokens: 1,
            reason: "stop",
          };
        }),
      },
    );
    await dispatch;
    await cancelAgentRun(db, owner, workspaceId, accepted.id);
    release();
    await execution;
    const final = await getAgentRun(db, owner, workspaceId, accepted.id);
    expect(final.status).toBe("cancelled");
    expect(final.messages).toHaveLength(1);
    expect(final.resultDocumentId).toBeNull();
  });

  it("aborts a stalled provider at the original timeout", async () => {
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      { ...(await inputFor()), limits: { timeoutMs: 80 } },
      settings,
    );
    let release!: () => void;
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });
    await executeAgentLease(db, (await claimAgentRun(db, "worker"))!, {
      provider: provider(async function* () {
        await stalled;
        yield { type: "text", text: "Too late" };
      }),
    });
    release();
    expect(
      await getAgentRun(db, owner, workspaceId, accepted.id),
    ).toMatchObject({ status: "failed", errorCode: "TIMEOUT" });
  });

  it.each(["output", "usage", "step"])(
    "stops at the %s limit and retains an inspectable receipt",
    async (limit) => {
      const accepted = await admitAssignment(
        db,
        owner,
        workspaceId,
        { ...(await inputFor()), limits: { maxOutputTokens: 16 } },
        settings,
      );
      if (limit === "step")
        await db
          .update(schema.agentRuns)
          .set({ steps: 1 })
          .where(eq(schema.agentRuns.id, accepted.id));
      const stream = vi.fn(async function* () {
        yield {
          type: "text" as const,
          text: limit === "output" ? "x".repeat(100) : "Partial result",
        };
        yield {
          type: "finish" as const,
          inputTokens: 1,
          outputTokens: 20,
          reason: "stop",
        };
      });
      await executeAgentLease(db, (await claimAgentRun(db, "worker"))!, {
        provider: provider(stream),
      });
      const run = await getAgentRun(db, owner, workspaceId, accepted.id);
      expect(run.status).toBe("paused_budget");
      expect(run.messages).toHaveLength(1);
      if (limit === "step") expect(stream).not.toHaveBeenCalled();
    },
  );

  it("prevents generated summaries from bypassing a revoked original source", async () => {
    const input = await inputFor();
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      input,
      settings,
    );
    await executeAgentLease(db, (await claimAgentRun(db, "worker"))!, {
      provider: deterministicProvider(),
    });
    const saved = await saveAgentResult(db, owner, workspaceId, accepted.id);
    await executeCommand(db, owner, workspaceId, {
      type: "agent.update",
      id: input.agentId,
      patch: { pageIds: [saved.resultDocumentId!] },
    });
    await expect(
      admitAssignment(
        db,
        owner,
        workspaceId,
        {
          ...input,
          operationKey: randomUUID(),
          resources: [
            { kind: "page", id: saved.resultDocumentId!, version: "1" },
          ],
        },
        settings,
      ),
    ).rejects.toMatchObject({ code: "RESOURCE_NOT_GRANTED" });
  });
});

describe("worker recovery and fencing", () => {
  it("claims once and rejects a stale worker after lease recovery", async () => {
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      await inputFor(),
      settings,
    );
    const claims = await Promise.all([
      claimAgentRun(db, "worker-a"),
      claimAgentRun(db, "worker-b"),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first = claims.find(Boolean)!;
    await expire(db, first);
    const recovered = (await claimAgentRun(db, "worker-c"))!;
    expect(recovered.epoch).toBeGreaterThan(first.epoch);
    expect(
      await prepareAgentStep(db, first, deterministicProvider()),
    ).toBeNull();
    expect(
      await checkpointAgentResult(db, first, "stale", {
        inputTokens: 1,
        outputTokens: 1,
      }),
    ).toBe(false);
    await executeAgentLease(db, recovered, {
      provider: deterministicProvider(),
    });
    expect(
      (await getAgentRun(db, owner, workspaceId, accepted.id)).attempt,
    ).toBe(2);
  });

  it("does not replay an ambiguous live dispatch after restart", async () => {
    const live = providerSettings({
      BOOTSTRAP_MODEL_PROVIDER: "openai-compatible",
      BOOTSTRAP_MODEL_BASE_URL: "https://never-called.example.test/v1",
      BOOTSTRAP_MODEL_API_KEY: "not-a-real-key",
      BOOTSTRAP_MODEL_ID: "fixture-model",
    });
    const accepted = await admitAssignment(
      db,
      owner,
      workspaceId,
      await inputFor(),
      live,
    );
    const lease = (await claimAgentRun(db, "worker-a"))!;
    const mock: ModelProvider = {
      ...deterministicProvider(),
      kind: "openai-compatible",
      model: live.model!,
      fingerprint: live.fingerprint,
    };
    await prepareAgentStep(db, lease, mock);
    await expire(db, lease);
    expect(await claimAgentRun(db, "worker-b")).toBeNull();
    expect(
      await getAgentRun(db, owner, workspaceId, accepted.id),
    ).toMatchObject({
      status: "reconciling",
      steps: 1,
      errorCode: "PROVIDER_OUTCOME_UNKNOWN",
    });
  });

  it("reopens disk state and finalizes a checkpoint without another provider call or duplicate result", async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "bootstrap-agent-recovery-"),
    );
    let local: DatabaseConnection | undefined;
    try {
      local = await createDatabase({ directory });
      await local.db.insert(schema.user).values(owner);
      const fixture = await setup(local.db);
      const accepted = await admitAssignment(
        local.db,
        owner,
        fixture.workspaceId,
        fixture.input,
        settings,
      );
      const first = (await claimAgentRun(local.db, "worker-before-restart"))!;
      await prepareAgentStep(local.db, first, deterministicProvider());
      await checkpointAgentResult(
        local.db,
        first,
        "Durable completed result [S1].",
        { inputTokens: 20, outputTokens: 8 },
      );
      await expire(local.db, first);
      await local.close();
      local = await createDatabase({ directory });
      const second = (await claimAgentRun(local.db, "worker-after-restart"))!;
      const stream = vi.fn(deterministicProvider().stream);
      await executeAgentLease(local.db, second, { provider: provider(stream) });
      expect(stream).not.toHaveBeenCalled();
      expect(await finishAgentRun(local.db, first)).toBe(false);
      const [saved, again] = await Promise.all([
        saveAgentResult(local.db, owner, fixture.workspaceId, accepted.id),
        saveAgentResult(local.db, owner, fixture.workspaceId, accepted.id),
      ]);
      expect(saved.resultDocumentId).toBe(again.resultDocumentId);
      expect(saved.messages).toHaveLength(2);
      await local.close();
      local = await createDatabase({ directory });
      expect(
        (await getAgentRun(local.db, owner, fixture.workspaceId, accepted.id))
          .resultDocumentId,
      ).toBe(saved.resultDocumentId);
      expect(await claimAgentRun(local.db, "worker-third")).toBeNull();
      expect(
        (await getSnapshot(local.db, owner, fixture.workspaceId)).pages.filter(
          (p) => p.sourceRunId === accepted.id,
        ),
      ).toHaveLength(1);
    } finally {
      await local?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
