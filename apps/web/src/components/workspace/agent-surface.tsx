"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Database,
  File,
  FileText,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  Agent,
  AgentPatch,
  WorkspaceCommand,
  WorkspaceSnapshot,
} from "@bootstrap/core";
import {
  Button,
  EmptyState,
  FormError,
  StatusBadge,
  Tabs,
  initials,
} from "./ui";
import { AgentChat } from "./agent-chat";

const tabs = [
  "Instructions",
  "Skills",
  "Routines",
  "Memories",
  "Files",
  "Tables",
  "Assignments",
] as const;
type Tab = (typeof tabs)[number];
type Mutate = (command: WorkspaceCommand) => Promise<WorkspaceSnapshot>;

export function AgentSurface({
  agent,
  snapshot,
  mutate,
  registerGuard,
  onDeleted,
  onSavedResult,
  onOpenPage,
}: {
  agent: Agent;
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  registerGuard?(guard: (() => Promise<boolean>) | null): void;
  onDeleted?(): void;
  onSavedResult(): Promise<void>;
  onOpenPage(id: string): void;
}) {
  const [tab, setTab] = useState<Tab>("Instructions");
  const [draft, setDraft] = useState(agent);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const saving = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    if (params.has("chat") || params.has("run")) setTab("Assignments");
  }, []);
  function update(patch: AgentPatch) {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    setDirty(true);
  }
  const save = useCallback((): Promise<boolean> => {
    if (saving.current) return saving.current;
    const flush = (async () => {
      setBusy(true);
      setError(null);
      try {
        while (dirtyRef.current) {
          const submitted = draftRef.current;
          const patch: AgentPatch = {
            name: submitted.name.trim(),
            role: submitted.role,
            description: submitted.description,
            instructions: submitted.instructions,
            skills: submitted.skills,
            routines: submitted.routines,
            memories: submitted.memories,
            fileIds: submitted.fileIds,
            tableIds: submitted.tableIds,
            pageIds: submitted.pageIds,
            color: submitted.color,
          };
          const next = await mutate({
            type: "agent.update",
            id: submitted.id,
            patch,
          });
          if (draftRef.current === submitted) {
            dirtyRef.current = false;
            setDirty(false);
            const saved = next.agents.find((item) => item.id === submitted.id);
            if (saved) {
              draftRef.current = saved;
              setDraft(saved);
            }
          }
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save agent.");
        return false;
      } finally {
        setBusy(false);
      }
    })();
    saving.current = flush;
    void flush.finally(() => {
      saving.current = null;
    });
    return flush;
  }, [mutate]);
  useEffect(() => {
    registerGuard?.(save);
    return () => registerGuard?.(null);
  }, [registerGuard, save]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  async function remove() {
    if (
      !window.confirm(
        `Delete “${agent.name}” and its saved configuration? Tasks assigned to this agent will become unassigned.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await mutate({ type: "agent.delete", id: agent.id });
      dirtyRef.current = false;
      setDirty(false);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete agent.");
    } finally {
      setBusy(false);
    }
  }
  const toggle = (key: "fileIds" | "tableIds" | "pageIds", id: string) =>
    update({
      [key]: draft[key].includes(id)
        ? draft[key].filter((value) => value !== id)
        : [...draft[key], id],
    });
  return (
    <div className="collection-page agent-page">
      <div className="agent-profile-heading">
        <div
          className="agent-avatar"
          style={{ "--agent-color": draft.color } as React.CSSProperties}
        >
          {initials(draft.name)}
        </div>
        <div>
          <span className="eyebrow">Your team</span>
          <h1>{draft.name}</h1>
          <p>{draft.role || "A specialist for your business"}</p>
        </div>
        <StatusBadge tone="violet">Configured</StatusBadge>
      </div>
      <div className="agent-availability">
        <Sparkles size={17} />
        <p>
          <strong>A place for your agent’s working context.</strong> Save their
          instructions and resources, then open Assignments to work together.
          Scheduled runs and connected tools are not active.
        </p>
      </div>
      <Tabs<Tab>
        items={tabs}
        active={tab}
        onChange={(next) => {
          if (next === "Assignments") {
            void save().then((saved) => {
              if (saved) {
                const url = new URL(window.location.href);
                url.searchParams.set("chat", "1");
                window.history.replaceState(window.history.state, "", url);
                setTab(next);
              }
            });
          } else {
            const url = new URL(window.location.href);
            url.searchParams.delete("chat");
            url.searchParams.delete("run");
            window.history.replaceState(window.history.state, "", url);
            setTab(next);
          }
        }}
        label="Agent properties"
      />
      <div className="agent-property-panel" role="tabpanel" aria-label={tab}>
        {tab === "Assignments" && (
          <AgentChat
            agent={draft}
            snapshot={snapshot}
            beforeSubmit={save}
            onSaved={onSavedResult}
            onOpenPage={onOpenPage}
          />
        )}
        {tab === "Instructions" && (
          <div className="form-layout form-layout-inline">
            <div className="form-columns">
              <label>
                Name
                <input
                  value={draft.name}
                  maxLength={100}
                  onChange={(event) => update({ name: event.target.value })}
                />
              </label>
              <label>
                Role
                <input
                  placeholder="e.g. Customer researcher"
                  value={draft.role}
                  maxLength={200}
                  onChange={(event) => update({ role: event.target.value })}
                />
              </label>
            </div>
            <label>
              About this agent
              <textarea
                rows={2}
                value={draft.description}
                placeholder="What part of the business will this agent help with?"
                onChange={(event) =>
                  update({ description: event.target.value })
                }
              />
            </label>
            <label>
              Working instructions
              <textarea
                className="instructions-input"
                rows={12}
                value={draft.instructions}
                placeholder={
                  "Define the outcome, how to work, and what a good result looks like.\n\nInclude boundaries, preferred sources, and when to ask you."
                }
                onChange={(event) =>
                  update({ instructions: event.target.value })
                }
              />
            </label>
            <p className="form-hint">
              Instructions and resource bindings are saved configuration. They
              do not authorize actions in external services.
            </p>
          </div>
        )}
        {tab === "Skills" && (
          <TextEntries
            title="Reusable procedures"
            description="Write the procedures this agent should follow, one per line. Versioned executable skills will be added with the runtime."
            value={draft.skills}
            placeholder="Summarize customer interviews with source references"
            onChange={(skills) => update({ skills })}
          />
        )}
        {tab === "Routines" && (
          <TextEntries
            title="Recurring work"
            description="Plan recurring assignments here, one per line. These plans are not scheduled or running yet."
            value={draft.routines}
            placeholder="Every Monday: prepare a summary of customer feedback"
            onChange={(routines) => update({ routines })}
          />
        )}
        {tab === "Memories" && (
          <TextEntries
            title="Things to remember"
            description="Add facts and preferences you want this agent to know, one per line. These are your notes, not inferred facts."
            value={draft.memories}
            placeholder="Our primary customers are solo founders in Southeast Asia"
            onChange={(memories) => update({ memories })}
          />
        )}
        {tab === "Files" && (
          <div className="resource-binding">
            <div className="property-intro">
              <h2>Pages and files</h2>
              <p>
                Bind the pages and files this agent may read. Each assignment
                selects a subset; saving its removal revokes future access.
                Originals remain in your workspace.
              </p>
            </div>
            {snapshot.pages.filter((page) => !page.trashedAt).length === 0 &&
            snapshot.files.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Your resources will appear here"
                description="Create a page or upload a file, then choose what this agent can use."
              />
            ) : (
              <>
                <h3>Pages</h3>
                {snapshot.pages
                  .filter((page) => !page.trashedAt)
                  .map((page) => (
                    <label className="binding-row" key={page.id}>
                      <input
                        type="checkbox"
                        checked={draft.pageIds.includes(page.id)}
                        onChange={() => toggle("pageIds", page.id)}
                      />
                      <FileText size={17} />
                      <span>{page.title || "Untitled"}</span>
                      <small>Page</small>
                    </label>
                  ))}
                <h3>Files</h3>
                {snapshot.files.map((file) => (
                  <label className="binding-row" key={file.id}>
                    <input
                      type="checkbox"
                      checked={draft.fileIds.includes(file.id)}
                      onChange={() => toggle("fileIds", file.id)}
                    />
                    <File size={17} />
                    <span>{file.name}</span>
                    <small>File</small>
                  </label>
                ))}
              </>
            )}
          </div>
        )}
        {tab === "Tables" && (
          <div className="resource-binding">
            <div className="property-intro">
              <h2>Structured information</h2>
              <p>
                Bind the workspace tables this agent may read. Each assignment
                selects a subset. Changes remain visible wherever a table is
                referenced.
              </p>
            </div>
            {snapshot.tables.length === 0 ? (
              <EmptyState
                icon={Database}
                title="No tables yet"
                description="Create a workspace table first, then choose it here."
              />
            ) : (
              snapshot.tables.map((table) => (
                <label className="binding-row" key={table.id}>
                  <input
                    type="checkbox"
                    checked={draft.tableIds.includes(table.id)}
                    onChange={() => toggle("tableIds", table.id)}
                  />
                  <Database size={17} />
                  <span>{table.name}</span>
                  <small>{table.rows.length} rows</small>
                </label>
              ))
            )}
          </div>
        )}
      </div>
      {tab !== "Assignments" && (
        <div className="agent-save-bar">
          <Button
            variant="quiet"
            className="danger-text"
            disabled={busy}
            onClick={() => void remove()}
          >
            <Trash2 size={14} />
            Delete agent
          </Button>
          <div>
            <FormError message={error} />
            <span className="muted">
              {busy
                ? "Saving configuration…"
                : dirty
                  ? "You have unsaved changes"
                  : "Configuration saved"}
            </span>
          </div>
          <Button
            variant="primary"
            disabled={!dirty || busy || !draft.name.trim()}
            onClick={() => void save()}
          >
            <Save size={15} />
            {busy ? "Saving…" : "Save agent"}
          </Button>
        </div>
      )}
    </div>
  );
}

function TextEntries({
  title,
  description,
  value,
  placeholder,
  onChange,
}: {
  title: string;
  description: string;
  value: string[];
  placeholder: string;
  onChange(value: string[]): void;
}) {
  return (
    <div className="property-intro">
      <h2>{title}</h2>
      <p>{description}</p>
      <label className="sr-only" htmlFor={`agent-${title}`}>
        {title}
      </label>
      <textarea
        id={`agent-${title}`}
        className="property-textarea"
        rows={12}
        value={value.join("\n")}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.split("\n"))}
      />
    </div>
  );
}
