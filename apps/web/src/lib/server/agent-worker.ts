import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { and, asc, eq, gt, lte, or } from "drizzle-orm";
import { schema, type Database, type Transaction } from "@bootstrap/db";
import { AppError } from "./errors";
import {
  configuredProvider,
  providerSettings,
  type ModelProvider,
  type ProviderChunk,
} from "./agent-provider";
import {
  addRunEvent,
  loadRun,
  modelInput,
  revalidateRunAccess,
  runScope,
  stopRun,
  type RunJob,
} from "./agent-execution";

const { agentRuns, agentAssignments, agentMessages, workspaces } = schema;
export const LEASE_MS = 15_000;
export type Lease = {
  workspaceId: string;
  runId: string;
  workerId: string;
  epoch: number;
};
const terminal = new Set([
  "succeeded",
  "cancelled",
  "failed",
  "paused_budget",
  "reconciling",
]);

async function lock(tx: Transaction, workspaceId: string) {
  await tx
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
}
function owns(job: RunJob, lease: Lease) {
  return (
    job.run.status === "running" &&
    job.run.epoch === lease.epoch &&
    job.run.leaseOwner === lease.workerId &&
    !!job.run.leaseExpiresAt &&
    job.run.leaseExpiresAt.getTime() > Date.now()
  );
}

/** Durable run rows are the bounded queue. The atomic revision guard also fences concurrent claims. */
export async function claimAgentRun(
  db: Database,
  workerId: string,
): Promise<Lease | null> {
  const now = new Date();
  const candidates = await db
    .select({ id: agentRuns.id, workspaceId: agentRuns.workspaceId })
    .from(agentRuns)
    .where(
      or(
        eq(agentRuns.status, "queued"),
        and(
          eq(agentRuns.status, "running"),
          lte(agentRuns.leaseExpiresAt, now),
        ),
      ),
    )
    .orderBy(asc(agentRuns.createdAt))
    .limit(32);
  for (const candidate of candidates) {
    const claim = await db.atomic(async (tx) => {
      await lock(tx, candidate.workspaceId);
      const job = await loadRun(tx, candidate.workspaceId, candidate.id);
      const run = job.run;
      if (
        terminal.has(run.status) ||
        (run.status === "running" &&
          run.leaseExpiresAt &&
          run.leaseExpiresAt > new Date())
      )
        return null;
      if (
        run.checkpoint === "dispatching" &&
        run.provider !== "deterministic"
      ) {
        await stopRun(
          tx,
          job,
          "reconciling",
          "PROVIDER_OUTCOME_UNKNOWN",
          "The worker stopped during a live model request. Its usage or response may be incomplete. The request was not replayed; inspect the provider before explicitly starting new work.",
        );
        return null;
      }
      if (
        run.checkpoint !== "generated" &&
        run.deadlineAt &&
        run.deadlineAt <= new Date()
      ) {
        await stopRun(
          tx,
          job,
          "failed",
          "TIMEOUT",
          "The original assignment deadline elapsed. Recovery does not reset its time limit.",
        );
        return null;
      }
      if (run.attempt >= 3) {
        await stopRun(
          tx,
          job,
          "paused_budget",
          "RECOVERY_LIMIT",
          "The run reached its three-attempt recovery limit.",
        );
        return null;
      }
      const [active] = await tx
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(
          and(
            eq(agentRuns.workspaceId, run.workspaceId),
            eq(agentRuns.status, "running"),
            gt(agentRuns.leaseExpiresAt, new Date()),
          ),
        )
        .limit(1);
      if (active) return null;
      const lease: Lease = {
        workspaceId: run.workspaceId,
        runId: run.id,
        workerId,
        epoch: run.epoch + 1,
      };
      await tx
        .update(agentRuns)
        .set({
          status: "running",
          epoch: lease.epoch,
          attempt: run.attempt + 1,
          leaseOwner: workerId,
          leaseExpiresAt: new Date(Date.now() + LEASE_MS),
          deadlineAt:
            run.deadlineAt ?? new Date(Date.now() + run.limits.timeoutMs),
          ...(run.checkpoint === "dispatching" ? { outputText: "" } : {}),
        })
        .where(runScope(run.workspaceId, run.id));
      await tx
        .update(agentAssignments)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(
          and(
            eq(agentAssignments.workspaceId, run.workspaceId),
            eq(agentAssignments.id, job.assignment.id),
          ),
        );
      await addRunEvent(
        tx,
        run.workspaceId,
        run.id,
        run.attempt ? "run.recovered" : "run.started",
        run.attempt
          ? `Recovered attempt ${run.attempt + 1} from ${run.checkpoint}. The original limits and run identity are retained.`
          : "Worker claimed the assignment.",
      );
      if (run.checkpoint === "dispatching")
        await addRunEvent(
          tx,
          run.workspaceId,
          run.id,
          "output.reset",
          "Replaying the same deterministic test step; incomplete fixture output was cleared.",
        );
      return lease;
    });
    if (claim) return claim;
  }
  return null;
}

export async function prepareAgentStep(
  db: Database,
  lease: Lease,
  provider: ModelProvider,
) {
  return db.atomic(async (tx) => {
    await lock(tx, lease.workspaceId);
    const job = await loadRun(tx, lease.workspaceId, lease.runId);
    if (!owns(job, lease)) return null;
    if (job.run.checkpoint === "generated") return job;
    await revalidateRunAccess(tx, job);
    if (
      job.run.providerFingerprint !== provider.fingerprint ||
      job.run.provider !== provider.kind ||
      job.run.model !== provider.model
    )
      throw new AppError(
        409,
        "The configured model changed after this assignment was admitted. Start a new assignment to use the new configuration.",
        "PROVIDER_CHANGED",
      );
    if (job.run.deadlineAt!.getTime() <= Date.now())
      throw new AppError(
        409,
        "The assignment time limit was reached.",
        "TIMEOUT",
      );
    const replay =
      job.run.checkpoint === "dispatching" && provider.kind === "deterministic";
    if (!replay && job.run.steps >= job.run.limits.maxSteps)
      throw new AppError(
        409,
        "The model step limit was reached.",
        "STEP_LIMIT",
      );
    const steps = job.run.steps + (replay ? 0 : 1);
    await tx
      .update(agentRuns)
      .set({ checkpoint: "dispatching", steps })
      .where(runScope(lease.workspaceId, lease.runId));
    await addRunEvent(
      tx,
      lease.workspaceId,
      lease.runId,
      "step.started",
      `Model step ${steps}/${job.run.limits.maxSteps}; ${provider.kind === "deterministic" ? "deterministic fixture" : "live provider"}.`,
    );
    return {
      ...job,
      run: { ...job.run, checkpoint: "dispatching" as const, steps },
    };
  });
}

async function pulse(db: Database, lease: Lease) {
  return db.atomic(async (tx) => {
    await lock(tx, lease.workspaceId);
    const job = await loadRun(tx, lease.workspaceId, lease.runId);
    if (!owns(job, lease)) return false;
    try {
      await revalidateRunAccess(tx, job);
      if (job.run.deadlineAt!.getTime() <= Date.now())
        throw new AppError(
          409,
          "The assignment time limit was reached. Already dispatched model usage may still be charged.",
          "TIMEOUT",
        );
    } catch (error) {
      await stopRun(
        tx,
        job,
        "failed",
        error instanceof AppError ? error.code : "ACCESS_REVOKED",
        error instanceof AppError
          ? error.message
          : "Current workspace access could not be confirmed.",
      );
      return false;
    }
    await tx
      .update(agentRuns)
      .set({ leaseExpiresAt: new Date(Date.now() + LEASE_MS) })
      .where(runScope(lease.workspaceId, lease.runId));
    return true;
  });
}

async function appendOutput(
  db: Database,
  lease: Lease,
  text: string,
  outputText: string,
) {
  return db.atomic(async (tx) => {
    await lock(tx, lease.workspaceId);
    const job = await loadRun(tx, lease.workspaceId, lease.runId);
    if (!owns(job, lease)) return false;
    if (job.run.deadlineAt!.getTime() <= Date.now())
      throw new AppError(
        409,
        "The assignment time limit was reached.",
        "TIMEOUT",
      );
    await tx
      .update(agentRuns)
      .set({ outputText })
      .where(runScope(lease.workspaceId, lease.runId));
    await addRunEvent(tx, lease.workspaceId, lease.runId, "output.delta", text);
    return true;
  });
}

export async function checkpointAgentResult(
  db: Database,
  lease: Lease,
  outputText: string,
  usage: { inputTokens: number | null; outputTokens: number | null },
) {
  return db.atomic(async (tx) => {
    await lock(tx, lease.workspaceId);
    const job = await loadRun(tx, lease.workspaceId, lease.runId);
    if (!owns(job, lease)) return false;
    await revalidateRunAccess(tx, job);
    if (job.run.deadlineAt!.getTime() <= Date.now())
      throw new AppError(
        409,
        "The assignment time limit was reached.",
        "TIMEOUT",
      );
    if (
      (usage.inputTokens ?? 0) > job.run.limits.maxInputTokens ||
      (usage.outputTokens ?? 0) > job.run.limits.maxOutputTokens
    )
      throw new AppError(
        409,
        "The provider reported usage above this assignment’s token limit. No further model step will run.",
        "TOKEN_LIMIT",
      );
    await tx
      .update(agentRuns)
      .set({
        checkpoint: "generated",
        outputText,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      })
      .where(runScope(lease.workspaceId, lease.runId));
    await addRunEvent(
      tx,
      lease.workspaceId,
      lease.runId,
      "result.checkpointed",
      "Completed model output and usage were saved durably before finalizing the result.",
    );
    return true;
  });
}

export async function finishAgentRun(db: Database, lease: Lease) {
  return db.atomic(async (tx) => {
    await lock(tx, lease.workspaceId);
    const job = await loadRun(tx, lease.workspaceId, lease.runId);
    if (!owns(job, lease) || job.run.checkpoint !== "generated") return false;
    await tx
      .insert(agentMessages)
      .values({
        workspaceId: lease.workspaceId,
        id: randomUUID(),
        threadId: job.assignment.threadId,
        runId: lease.runId,
        role: "assistant",
        content: job.run.outputText,
      })
      .onConflictDoNothing();
    await tx
      .update(agentRuns)
      .set({
        status: "succeeded",
        leaseOwner: null,
        leaseExpiresAt: null,
        finishedAt: new Date(),
      })
      .where(runScope(lease.workspaceId, lease.runId));
    await tx
      .update(agentAssignments)
      .set({ status: "needs_review", updatedAt: new Date() })
      .where(
        and(
          eq(agentAssignments.workspaceId, lease.workspaceId),
          eq(agentAssignments.id, job.assignment.id),
        ),
      );
    await addRunEvent(
      tx,
      lease.workspaceId,
      lease.runId,
      "run.succeeded",
      "Result ready for review. Save it as a new workspace page when you are satisfied.",
    );
    return true;
  });
}

export async function executeAgentLease(
  db: Database,
  lease: Lease,
  options: { provider?: ModelProvider; signal?: AbortSignal } = {},
) {
  const controller = new AbortController();
  const shutdown = () => controller.abort(new Error("Worker stopping"));
  options.signal?.addEventListener("abort", shutdown, { once: true });
  let heartbeat: ReturnType<typeof setTimeout> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  let iterator: AsyncIterator<ProviderChunk> | undefined;
  const beat = async () => {
    if (done) return;
    try {
      if (!(await pulse(db, lease))) controller.abort(new Error("Run stopped"));
    } catch {
      controller.abort(new Error("Lease could not be renewed"));
    }
    if (!done && !controller.signal.aborted)
      heartbeat = setTimeout(() => void beat(), 500);
  };
  try {
    const initial = await loadRun(db, lease.workspaceId, lease.runId);
    if (initial.run.checkpoint === "generated") {
      await finishAgentRun(db, lease);
      return;
    }
    const settings = providerSettings();
    if (!options.provider && !settings.ready)
      throw new AppError(503, settings.message, "CONFIGURATION_REQUIRED");
    const provider = options.provider ?? (await configuredProvider(settings));
    const job = await prepareAgentStep(db, lease, provider);
    if (!job) return;
    if (options.signal?.aborted) {
      shutdown();
      return;
    }
    timeout = setTimeout(
      () =>
        controller.abort(
          new AppError(
            409,
            "The assignment time limit was reached. In-flight usage may still be charged.",
            "TIMEOUT",
          ),
        ),
      Math.max(1, job.run.deadlineAt!.getTime() - Date.now()),
    );
    heartbeat = setTimeout(() => void beat(), 500);
    const input = modelInput(
      job.run.agentConfiguration,
      job.assignment.prompt,
      job.run.context,
    );
    let output = "",
      pending = "",
      lastFlush = Date.now();
    let finish: {
      inputTokens: number | null;
      outputTokens: number | null;
      reason: string;
    } | null = null;
    iterator = provider
      .stream({
        ...input,
        maxOutputTokens: job.run.limits.maxOutputTokens,
        requestId: job.run.requestId,
        signal: controller.signal,
      })
      [Symbol.asyncIterator]();
    while (true) {
      controller.signal.throwIfAborted();
      if (Date.now() >= job.run.deadlineAt!.getTime())
        throw new AppError(
          409,
          "The assignment time limit was reached.",
          "TIMEOUT",
        );
      // A misbehaving adapter cannot hold a worker forever after cancellation or timeout.
      let rejectAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(controller.signal.reason);
        controller.signal.addEventListener("abort", rejectAbort, {
          once: true,
        });
      });
      let part;
      try {
        part = await Promise.race([iterator.next(), aborted]);
      } finally {
        if (rejectAbort)
          controller.signal.removeEventListener("abort", rejectAbort);
      }
      if (part.done) break;
      if (part.value.type === "finish") {
        finish = part.value;
        continue;
      }
      if (finish) throw new Error("Provider emitted text after completion");
      if (
        Buffer.byteLength(output) + Buffer.byteLength(part.value.text) >
        Math.min(64_000, job.run.limits.maxOutputTokens * 4)
      )
        throw new AppError(
          409,
          "The result reached its bounded output size. Partial output is retained for inspection.",
          "OUTPUT_LIMIT",
        );
      output += part.value.text;
      pending += part.value.text;
      if (Buffer.byteLength(pending) >= 256 || Date.now() - lastFlush >= 300) {
        if (!(await appendOutput(db, lease, pending, output))) return;
        pending = "";
        lastFlush = Date.now();
      }
    }
    if (pending && !(await appendOutput(db, lease, pending, output))) return;
    if (!finish || !output.trim())
      throw new Error("Provider returned no completed result");
    if (finish.reason === "length")
      throw new AppError(
        409,
        "The model reached the output token limit. Partial output remains inspectable; it is not a completed result.",
        "OUTPUT_LIMIT",
      );
    if (finish.reason !== "stop")
      throw new Error("Provider did not complete the requested text response");
    if (await checkpointAgentResult(db, lease, output, finish))
      await finishAgentRun(db, lease);
  } catch (error) {
    if (options.signal?.aborted) return; // Leave checkpoint and lease for restart recovery.
    await db.atomic(async (tx) => {
      await lock(tx, lease.workspaceId);
      const job = await loadRun(tx, lease.workspaceId, lease.runId);
      if (!owns(job, lease)) return;
      const known = error instanceof AppError;
      const code = known ? error.code : "PROVIDER_FAILED";
      const budget = ["STEP_LIMIT", "TOKEN_LIMIT", "OUTPUT_LIMIT"].includes(
        code,
      );
      const uncertain =
        !known &&
        job.run.provider !== "deterministic" &&
        job.run.checkpoint === "dispatching";
      await stopRun(
        tx,
        job,
        budget ? "paused_budget" : uncertain ? "reconciling" : "failed",
        code,
        known
          ? error.message
          : uncertain
            ? "The provider response could not be confirmed. Usage may be unknown; no automatic replay was made."
            : "The provider could not complete this assignment. Partial progress remains available.",
      );
    });
  } finally {
    done = true;
    clearTimeout(heartbeat);
    clearTimeout(timeout);
    controller.abort();
    options.signal?.removeEventListener("abort", shutdown);
    // Never wait indefinitely for an adapter's cleanup after its signal was aborted.
    if (iterator?.return) void iterator.return().catch(() => undefined);
  }
}

export async function runAgentWorker(
  db: Database,
  signal: AbortSignal,
  options: {
    workerId?: string;
    provider?: ModelProvider;
    pollMs?: number;
  } = {},
) {
  const workerId = options.workerId ?? randomUUID();
  while (!signal.aborted) {
    try {
      const lease = await claimAgentRun(db, workerId);
      if (lease) {
        await executeAgentLease(db, lease, {
          provider: options.provider,
          signal,
        });
        continue;
      }
    } catch (error) {
      console.error(
        "Bootstrap worker could not process a queue item",
        error instanceof Error ? error.name : "Unknown error",
      );
    }
    try {
      await delay(options.pollMs ?? 500, undefined, { signal });
    } catch {
      break;
    }
  }
}
