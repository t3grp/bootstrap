"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  LoaderCircle,
  MessageSquare,
  Plus,
  Save,
  Send,
  Square,
} from "lucide-react";
import type {
  Agent,
  AgentResource,
  AgentRun,
  AssignmentInput,
  ProviderStatus,
  RunEvent,
  WorkspaceSnapshot,
} from "@bootstrap/core";
import {
  changeAgentRun,
  getAgentRun,
  getAgentRuns,
  submitAssignment,
  type RunListItem,
} from "@/lib/api";
import { Button, FormError } from "./ui";
import "./agent-chat.css";

const active = (run: AgentRun) =>
  run.status === "queued" || run.status === "running";
const labels: Record<AgentRun["status"], string> = {
  queued: "Queued",
  running: "Working",
  succeeded: "Ready to review",
  cancelled: "Cancelled",
  failed: "Stopped",
  paused_budget: "Limit reached",
  reconciling: "Provider outcome uncertain",
};

function setRunLocation(id: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set("chat", "1");
  if (id) url.searchParams.set("run", id);
  else url.searchParams.delete("run");
  window.history.replaceState(window.history.state, "", url);
}

export function RunReceipt({ run }: { run: AgentRun }) {
  return (
    <details className="run-receipt">
      <summary>Sources and run history</summary>
      <dl className="run-facts">
        <div>
          <dt>Run</dt>
          <dd>{run.id}</dd>
        </div>
        <div>
          <dt>Agent / provider</dt>
          <dd>
            {run.agentName} ·{" "}
            {run.provider === "deterministic"
              ? "Deterministic test"
              : run.model}
          </dd>
        </div>
        <div>
          <dt>Usage</dt>
          <dd>
            {run.inputTokens ?? "Unknown"} input /{" "}
            {run.outputTokens ?? "Unknown"} output tokens
          </dd>
        </div>
        <div>
          <dt>Bounds</dt>
          <dd>
            {run.steps}/{run.limits.maxSteps} model steps ·{" "}
            {run.limits.maxInputTokens} input allowance ·{" "}
            {run.limits.maxOutputTokens} output tokens ·{" "}
            {run.limits.timeoutMs / 1000}s
          </dd>
        </div>
        <div>
          <dt>Recovery</dt>
          <dd>
            Attempt {run.attempt}; the original limits apply across restarts.
          </dd>
        </div>
      </dl>
      <p className="muted">
        Input admission uses a conservative UTF-8 byte estimate plus request
        overhead. Reported provider usage appears above; unknown usage is not
        treated as zero.
      </p>
      <h4>Selected source snapshots</h4>
      {run.sources.length ? (
        <ul className="run-sources">
          {run.sources.map((source) => (
            <li key={`${source.kind}:${source.id}`}>
              <strong>
                [{source.citation}] {source.label}
              </strong>
              <span>
                {source.kind} · version {source.version}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No workspace sources were selected.</p>
      )}
      <h4>Persisted events</h4>
      <ol className="run-events">
        {run.events
          .filter((event) => event.type !== "output.delta")
          .map((event) => (
            <li key={event.sequence}>
              <time dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleTimeString()}
              </time>
              <span>{event.message}</span>
            </li>
          ))}
      </ol>
    </details>
  );
}

export function SavedRunReceipt({
  workspaceId,
  runId,
}: {
  workspaceId: string;
  runId: string;
}) {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void getAgentRun(workspaceId, runId)
      .then((run) => {
        if (current) setRun(run);
      })
      .catch(() => {
        if (current)
          setError(
            "The source run could not be loaded. Reload to inspect its history.",
          );
      });
    return () => {
      current = false;
    };
  }, [workspaceId, runId]);
  return (
    <section
      className="saved-run-provenance"
      aria-label="Agent result provenance"
    >
      <div className="run-provenance-title">
        <Check size={15} />
        <strong>
          {run?.provider === "deterministic"
            ? "Saved deterministic test result"
            : "Saved agent result"}
        </strong>
      </div>
      {run ? (
        <RunReceipt run={run} />
      ) : (
        <p className="muted">
          {error ?? "Loading source references and run history…"}
        </p>
      )}
    </section>
  );
}

export function AgentChat({
  agent,
  snapshot,
  beforeSubmit,
  onSaved,
  onOpenPage,
}: {
  agent: Agent;
  snapshot: WorkspaceSnapshot;
  beforeSubmit(): Promise<boolean>;
  onSaved(): Promise<void>;
  onOpenPage(id: string): void;
}) {
  const workspaceId = snapshot.workspace.id;
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("Assignment result");
  const [projectId, setProjectId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [outputTokens, setOutputTokens] = useState(2048);
  const [timeoutSeconds, setTimeoutSeconds] = useState(120);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState("");
  const pending = useRef<{ signature: string; input: AssignmentInput } | null>(
    null,
  );
  const pendingKey = `bootstrap-assignment:${workspaceId}:${agent.id}`;
  const selectionEpoch = useRef(0);
  const busyRef = useRef(false);
  const refreshList = useCallback(async () => {
    const state = await getAgentRuns(workspaceId, agent.id);
    setProvider(state.provider);
    setRuns(state.runs);
    return state;
  }, [workspaceId, agent.id]);

  useEffect(() => {
    let current = true;
    void refreshList()
      .then(async (state) => {
        if (!current) return;
        setOutputTokens(state.provider.limits.maxOutputTokens);
        setTimeoutSeconds(state.provider.limits.timeoutMs / 1000);
        const saved = sessionStorage.getItem(pendingKey);
        if (saved) {
          try {
            const draft = JSON.parse(saved) as {
              signature: string;
              input: AssignmentInput;
            };
            pending.current = draft;
            setPrompt(draft.input.prompt);
            setTitle(draft.input.outputTitle);
            setProjectId(draft.input.projectId ?? "");
            setSelected(draft.input.resources.map((r) => `${r.kind}:${r.id}`));
            setOutputTokens(
              draft.input.limits?.maxOutputTokens ??
                state.provider.limits.maxOutputTokens,
            );
            setTimeoutSeconds(
              (draft.input.limits?.timeoutMs ??
                state.provider.limits.timeoutMs) / 1000,
            );
          } catch {
            sessionStorage.removeItem(pendingKey);
          }
        }
        const id = new URL(window.location.href).searchParams.get("run");
        if (id) {
          const restored = await getAgentRun(workspaceId, id);
          if (current && restored.agentId === agent.id) setRun(restored);
        }
      })
      .catch((error) => {
        if (current)
          setError(
            error instanceof Error
              ? error.message
              : "Could not load assignments.",
          );
      });
    return () => {
      current = false;
      selectionEpoch.current++;
    };
  }, [refreshList, workspaceId, agent.id, pendingKey]);

  const runId = run?.id;
  const isActive = !!run && active(run);
  useEffect(() => {
    if (!runId || !isActive) return;
    const epoch = selectionEpoch.current;
    const cursor = run?.events.at(-1)?.sequence ?? 0;
    const stream = new EventSource(
      `/api/agent-runs/${encodeURIComponent(runId)}/events?workspaceId=${encodeURIComponent(workspaceId)}&after=${cursor}`,
    );
    const updateFinal = async () => {
      try {
        const latest = await getAgentRun(workspaceId, runId);
        if (selectionEpoch.current !== epoch) return;
        setRun(latest);
        await refreshList();
      } catch (error) {
        if (selectionEpoch.current === epoch)
          setError(
            error instanceof Error
              ? error.message
              : "Could not load the saved run.",
          );
      }
    };
    stream.onopen = () => setConnection("");
    stream.onerror = () =>
      setConnection(
        "Reconnecting to progress… Accepted work continues on the server.",
      );
    stream.addEventListener("progress", (message) => {
      const { event } = JSON.parse((message as MessageEvent).data) as {
        event: RunEvent;
      };
      setRun((current) => {
        if (
          !current ||
          current.id !== runId ||
          event.sequence <= (current.events.at(-1)?.sequence ?? 0)
        )
          return current;
        return {
          ...current,
          status: ["run.started", "run.recovered"].includes(event.type)
            ? "running"
            : current.status,
          outputText:
            event.type === "output.reset"
              ? ""
              : event.type === "output.delta"
                ? current.outputText + event.message
                : current.outputText,
          events: [...current.events, event],
        };
      });
    });
    stream.addEventListener("terminal", () => {
      stream.close();
      setConnection("");
      void updateFinal();
    });
    stream.addEventListener("access_error", () => {
      stream.close();
      setError("Progress access could not be confirmed. Reload to reconnect.");
    });
    return () => {
      stream.close();
    };
    // The stream owns its cursor after connection; changing text must not reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, isActive, workspaceId, refreshList]);

  const choices: (AgentResource & { label: string })[] = [
    ...snapshot.pages
      .filter((p) => !p.trashedAt && agent.pageIds.includes(p.id))
      .map((p) => ({
        kind: "page" as const,
        id: p.id,
        version: String(p.revision),
        label: p.title,
      })),
    ...snapshot.tables
      .filter((t) => agent.tableIds.includes(t.id))
      .map((t) => ({
        kind: "table" as const,
        id: t.id,
        version: String(t.revision),
        label: t.name,
      })),
    ...snapshot.files
      .filter((f) => agent.fileIds.includes(f.id))
      .map((f) => ({
        kind: "file" as const,
        id: f.id,
        version: f.createdAt,
        label: f.name,
      })),
  ];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!(await beforeSubmit())) return;
      const resources = choices
        .filter((c) => selected.includes(`${c.kind}:${c.id}`))
        .map(({ label: _label, ...r }) => r);
      if (resources.length !== selected.length)
        throw new Error(
          "Some selected resources are no longer available. Review your selection.",
        );
      const payload = {
        agentId: agent.id,
        prompt,
        outputTitle: title,
        projectId: projectId || null,
        resources,
        limits: {
          maxSteps: 1,
          maxOutputTokens: outputTokens,
          timeoutMs: Math.round(timeoutSeconds * 1000),
        },
      };
      const signature = JSON.stringify(payload);
      const input =
        pending.current?.signature === signature
          ? pending.current.input
          : { ...payload, operationKey: crypto.randomUUID() };
      pending.current = { signature, input };
      // Retain the exact request/key through a lost response or reload, until admission is confirmed.
      sessionStorage.setItem(pendingKey, JSON.stringify(pending.current));
      const accepted = await submitAssignment(workspaceId, input);
      selectionEpoch.current++;
      setRun(accepted);
      setRunLocation(accepted.id);
      pending.current = null;
      sessionStorage.removeItem(pendingKey);
      await refreshList();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Submission could not be confirmed. Retry the unchanged assignment to recover its receipt.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function selectRun(id: string) {
    const epoch = ++selectionEpoch.current;
    setError(null);
    try {
      const loaded = await getAgentRun(workspaceId, id);
      if (selectionEpoch.current === epoch) {
        setRun(loaded);
        setRunLocation(id);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not open this run.",
      );
    }
  }
  async function action(action: "cancel" | "save") {
    if (!run || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const latest = await changeAgentRun(workspaceId, run.id, action);
      setRun(latest);
      if (action === "save") await onSaved();
      await refreshList();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not confirm this action.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="agent-chat">
      <header className="chat-heading">
        <div>
          <h2>
            <MessageSquare size={19} /> Work with {agent.name}
          </h2>
          <p>
            Choose context, assign one bounded task, and review the result in
            your workspace.
          </p>
        </div>
        {run && (
          <Button
            onClick={() => {
              selectionEpoch.current++;
              setRun(null);
              setRunLocation(null);
              setError(null);
            }}
            disabled={busy}
          >
            <Plus size={14} />
            New assignment
          </Button>
        )}
      </header>
      <div
        className={`provider-state ${provider?.kind === "deterministic" ? "provider-test" : ""}`}
        role="status"
      >
        {provider?.message ?? "Checking server configuration…"}
      </div>
      <div className="chat-layout">
        <aside className="run-list" aria-label="Assignment history">
          <h3>Recent assignments</h3>
          {runs.length ? (
            runs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={run?.id === item.id ? "selected" : ""}
                disabled={busy}
                onClick={() => void selectRun(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{labels[item.status]}</span>
              </button>
            ))
          ) : (
            <p className="muted">
              Your assignments and their receipts will appear here.
            </p>
          )}
        </aside>
        <div className="chat-main">
          <FormError message={error} />
          {run ? (
            <>
              <div className="run-heading">
                <h3>{run.outputTitle}</h3>
                <span className="run-status" role="status">
                  {active(run) && <LoaderCircle size={14} className="spin" />}
                  {run.resultDocumentId
                    ? "Saved to workspace"
                    : labels[run.status]}
                </span>
              </div>
              <div className="chat-message chat-message-owner">
                <span>You assigned</span>
                <p>{run.prompt}</p>
              </div>
              <div className="chat-message chat-message-agent">
                <span>
                  {run.agentName}
                  {run.provider === "deterministic"
                    ? " · Deterministic test"
                    : ` · ${run.model}`}
                </span>
                <div className="run-output" aria-label="Agent response">
                  {run.outputText ||
                    (run.status === "queued"
                      ? "Waiting for the worker. This assignment is saved and will survive a reload."
                      : active(run)
                        ? "Preparing the selected context…"
                        : "No completed output.")}
                </div>
              </div>
              {connection && (
                <p className="muted" role="status">
                  {connection}
                </p>
              )}
              {run.errorMessage && (
                <p className="run-problem" role="alert">
                  {run.errorMessage}
                </p>
              )}
              <div className="run-actions">
                {active(run) && (
                  <Button disabled={busy} onClick={() => void action("cancel")}>
                    <Square size={13} />
                    Cancel assignment
                  </Button>
                )}
                {run.status === "succeeded" && !run.resultDocumentId && (
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() => void action("save")}
                  >
                    <Save size={15} />
                    Save result to workspace
                  </Button>
                )}
                {run.resultDocumentId && (
                  <Button
                    variant="primary"
                    onClick={() => onOpenPage(run.resultDocumentId!)}
                  >
                    <FileText size={15} />
                    Open saved result
                    <ArrowUpRight size={14} />
                  </Button>
                )}
              </div>
              <RunReceipt run={run} />
            </>
          ) : (
            <form
              className="assignment-form"
              onSubmit={(event) => void submit(event)}
            >
              <label>
                Assignment
                <textarea
                  required
                  rows={5}
                  maxLength={16384}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Summarize these customer notes and suggest three next steps."
                />
              </label>
              <div className="assignment-fields">
                <label>
                  Result page title
                  <input
                    required
                    maxLength={160}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label>
                  Save within project
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                  >
                    <option value="">Workspace</option>
                    {snapshot.projects.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset className="assignment-sources">
                <legend>
                  Select resources for this assignment{" "}
                  <span>{selected.length}/8</span>
                </legend>
                <p>
                  Only these selected snapshots and the agent’s saved
                  instructions, skills, and memories are sent. Linked pages,
                  files, and tables are not followed.
                </p>
                {choices.length ? (
                  choices.map((resource) => {
                    const key = `${resource.kind}:${resource.id}`;
                    return (
                      <label key={key}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${resource.kind}: ${resource.label}`}
                          checked={selected.includes(key)}
                          disabled={
                            !selected.includes(key) && selected.length >= 8
                          }
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, key]
                                : current.filter((value) => value !== key),
                            )
                          }
                        />
                        <span>
                          {resource.label}
                          <small>
                            {resource.kind} · version {resource.version}
                          </small>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="muted">
                    Bind pages and files on the Files tab, and tables on the
                    Tables tab, then select the resources to use here. You can
                    also assign work without sources.
                  </p>
                )}
              </fieldset>
              <details className="assignment-limits">
                <summary>Execution limits · one model step</summary>
                <div className="assignment-fields">
                  <label>
                    Maximum output tokens
                    <input
                      type="number"
                      min={1}
                      max={provider?.limits.maxOutputTokens ?? 2048}
                      required
                      value={outputTokens}
                      onChange={(e) => setOutputTokens(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Time limit in seconds
                    <input
                      type="number"
                      min={0.001}
                      step={0.001}
                      max={(provider?.limits.timeoutMs ?? 120000) / 1000}
                      required
                      value={timeoutSeconds}
                      onChange={(e) =>
                        setTimeoutSeconds(Number(e.target.value))
                      }
                    />
                  </label>
                </div>
                <p className="muted">
                  Input allowance: {provider?.limits.maxInputTokens ?? "—"}{" "}
                  conservative token units. Context that exceeds it is rejected
                  before a model call. No tools, schedules, or delegation run in
                  this slice.
                </p>
              </details>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  busy ||
                  !provider?.ready ||
                  !prompt.trim() ||
                  !agent.instructions.trim()
                }
              >
                <Send size={15} />
                {busy ? "Submitting…" : "Run assignment"}
              </Button>
              {!agent.instructions.trim() && (
                <p className="muted">
                  Save instructions for this agent before assigning work.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
