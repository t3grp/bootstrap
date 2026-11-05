"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Expand,
  FileText,
  FolderInput,
  LoaderCircle,
  Plus,
  Save,
  Shrink,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type {
  Page,
  PageContent,
  PagePatch,
  WorkspaceCommand,
  WorkspaceSnapshot,
  WorkspaceTable,
} from "@bootstrap/core";
import { PageEditor } from "@/components/editor/page-editor";
import { ApiError, getWorkspace } from "@/lib/api";
import { Button, Dialog, FormError, IconButton, dateLabel } from "./ui";

type Mutate = (command: WorkspaceCommand) => Promise<WorkspaceSnapshot>;
type SaveState = "saved" | "unsaved" | "saving" | "error" | "conflict";

export function PageSurface({
  page,
  snapshot,
  mutate,
  navigatePage,
  navigateTable,
  createChild,
  onTrashed,
  registerGuard,
  persistTable,
  onReloadSnapshot,
}: {
  page: Page;
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  navigatePage(id: string): void;
  navigateTable(id: string): void;
  createChild(id: string): void;
  onTrashed(): void;
  registerGuard(guard: (() => Promise<boolean>) | null): void;
  persistTable(table: WorkspaceTable): void;
  onReloadSnapshot(snapshot: WorkspaceSnapshot): void;
}) {
  const [draft, setDraft] = useState(page);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [parent, setParent] = useState(page.parentId || "");
  const [actionBusy, setActionBusy] = useState(false);
  const draftRef = useRef(page);
  const revision = useRef(page.revision);
  const dirty = useRef(false);
  const conflict = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(true);
  const latestServer = useRef(page);
  latestServer.current = page;
  const patch = useCallback((value: PagePatch) => {
    const next = { ...draftRef.current, ...value };
    draftRef.current = next;
    dirty.current = true;
    setDraft(next);
    if (!conflict.current) setSaveState("unsaved");
  }, []);

  const save = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    if (conflict.current) return Promise.resolve(false);
    const flush = (async () => {
      while (dirty.current && !conflict.current && mounted.current) {
        const submitted = draftRef.current;
        setSaveState("saving");
        setError(null);
        try {
          const result = await mutate({
            type: "page.update",
            id: submitted.id,
            revision: revision.current,
            patch: {
              title: submitted.title.trim() || "Untitled",
              icon: submitted.icon,
              content: submitted.content,
              parentId: submitted.parentId,
              projectId: submitted.projectId,
              kind: submitted.kind,
              favorite: submitted.favorite,
              fullWidth: submitted.fullWidth,
              sortOrder: submitted.sortOrder,
            },
          });
          const saved = result.pages.find((item) => item.id === submitted.id);
          if (!saved) throw new Error("The saved page could not be loaded.");
          revision.current = saved.revision;
          latestServer.current = saved;
          if (draftRef.current === submitted) {
            dirty.current = false;
            draftRef.current = saved;
            if (mounted.current) {
              setDraft(saved);
              setSaveState("saved");
            }
          } else if (mounted.current) setSaveState("unsaved");
        } catch (err) {
          const isConflict = err instanceof ApiError && err.status === 409;
          conflict.current = isConflict;
          if (mounted.current) {
            setSaveState(isConflict ? "conflict" : "error");
            setError(
              isConflict
                ? "This page has a newer revision. Your edits are kept here, ready to recover."
                : err instanceof Error
                  ? err.message
                  : "Could not save. Your draft is still here.",
            );
          }
          return false;
        }
      }
      return !dirty.current;
    })();
    inFlight.current = flush;
    void flush.finally(() => {
      inFlight.current = null;
    });
    return flush;
  }, [mutate]);

  useEffect(() => {
    if (!dirty.current && !inFlight.current) {
      draftRef.current = page;
      revision.current = page.revision;
      setDraft(page);
    }
  }, [page]);
  useEffect(() => {
    if (!dirty.current || conflict.current) return;
    const timer = window.setTimeout(() => void save(), 700);
    return () => window.clearTimeout(timer);
  }, [draft, save]);
  useEffect(() => {
    registerGuard(save);
    return () => registerGuard(null);
  }, [registerGuard, save]);
  useEffect(() => {
    mounted.current = true;
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  function downloadDraft() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schemaVersion: 1,
            type: "bootstrap-page-draft",
            page: draftRef.current,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draftRef.current.title || "Untitled"}-draft.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function loadLatest() {
    if (
      !window.confirm(
        "Load the latest saved revision? Download your draft first if you want to keep these unsaved edits.",
      )
    )
      return;
    setActionBusy(true);
    try {
      const result = await getWorkspace(snapshot.workspace.id);
      const found = result.pages.find(
        (item) => item.id === page.id && !item.trashedAt,
      );
      if (!found)
        throw new Error(
          "This page is no longer available. Download your draft to keep it.",
        );
      draftRef.current = found;
      revision.current = found.revision;
      dirty.current = false;
      conflict.current = false;
      setDraft(found);
      setSaveState("saved");
      setError(null);
      onReloadSnapshot(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load the latest page.",
      );
    } finally {
      setActionBusy(false);
    }
  }
  async function exportPage(format: "json" | "markdown") {
    if (!(await save())) return;
    setActionBusy(true);
    try {
      const response = await fetch(
        `/api/export?workspaceId=${encodeURIComponent(snapshot.workspace.id)}&type=page&id=${encodeURIComponent(page.id)}&format=${format}`,
      );
      if (!response.ok)
        throw new Error("Could not export this page. Try again.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${draftRef.current.title || "Untitled"}.${format === "json" ? "json" : "md"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export the page.",
      );
    } finally {
      setActionBusy(false);
    }
  }
  async function trash() {
    const children = snapshot.pages.filter(
      (item) => !item.trashedAt && isDescendant(item, page.id, snapshot.pages),
    ).length;
    if (
      !window.confirm(
        `Move “${draftRef.current.title || "Untitled"}”${children ? ` and its ${children} nested ${children === 1 ? "page" : "pages"}` : ""} to Trash? Linked tables and files will stay in your workspace.`,
      )
    )
      return;
    if (!(await save())) return;
    setActionBusy(true);
    try {
      await mutate({
        type: "page.trash",
        id: page.id,
        revision: revision.current,
      });
      onTrashed();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not move page to Trash.",
      );
    } finally {
      setActionBusy(false);
    }
  }
  async function move(event: FormEvent) {
    event.preventDefault();
    const selectedParent = snapshot.pages.find((item) => item.id === parent);
    patch({
      parentId: parent || null,
      ...(selectedParent ? { projectId: selectedParent.projectId } : {}),
    });
    if (await save()) setMoveOpen(false);
  }
  const parents = snapshot.pages.filter(
    (item) =>
      !item.trashedAt &&
      item.id !== page.id &&
      !isDescendant(item, page.id, snapshot.pages),
  );
  const children = snapshot.pages.filter(
    (item) => !item.trashedAt && item.parentId === page.id,
  );
  const parentPage = snapshot.pages.find((item) => item.id === draft.parentId);
  return (
    <article
      className={`page-surface ${draft.fullWidth ? "page-full-width" : ""}`}
    >
      <div className="page-utility-bar">
        <div
          className={`save-state save-${saveState}`}
          role="status"
          aria-live="polite"
        >
          {saveState === "saved" ? (
            <Check size={13} />
          ) : saveState === "saving" ? (
            <LoaderCircle size={13} className="spinning" />
          ) : saveState === "conflict" || saveState === "error" ? (
            <TriangleAlert size={13} />
          ) : (
            <span className="unsaved-dot" />
          )}
          <span>
            {saveState === "saved"
              ? "All changes saved"
              : saveState === "saving"
                ? "Saving…"
                : saveState === "unsaved"
                  ? "Unsaved changes"
                  : saveState === "conflict"
                    ? "Revision conflict"
                    : "Could not save"}
          </span>
        </div>
        <div className="page-utility-actions">
          <IconButton
            label={
              draft.favorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={draft.favorite}
            onClick={() => patch({ favorite: !draft.favorite })}
          >
            <Star
              size={16}
              fill={draft.favorite ? "currentColor" : "none"}
              className={draft.favorite ? "favorite-star" : ""}
            />
          </IconButton>
          <IconButton
            label={draft.fullWidth ? "Use reading width" : "Use full width"}
            aria-pressed={draft.fullWidth}
            onClick={() => patch({ fullWidth: !draft.fullWidth })}
          >
            {draft.fullWidth ? <Shrink size={16} /> : <Expand size={16} />}
          </IconButton>
          <details className="page-actions-menu">
            <summary className="button button-quiet">
              Actions
              <ChevronDown size={13} />
            </summary>
            <div className="page-actions-popover">
              <button
                type="button"
                onClick={() => {
                  setParent(draft.parentId || "");
                  setMoveOpen(true);
                }}
              >
                <FolderInput size={15} />
                Move page
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void exportPage("markdown")}
              >
                <ArrowDownToLine size={15} />
                Export Markdown
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void exportPage("json")}
              >
                <ArrowDownToLine size={15} />
                Export native JSON
              </button>
              <button
                type="button"
                className="danger-text"
                disabled={actionBusy}
                onClick={() => void trash()}
              >
                <Trash2 size={15} />
                Move to Trash
              </button>
            </div>
          </details>
        </div>
      </div>
      {error && (
        <div
          className={`save-recovery ${saveState === "conflict" ? "save-recovery-conflict" : ""}`}
          role="alert"
        >
          <TriangleAlert size={18} />
          <div>
            <strong>
              {saveState === "conflict"
                ? "Let’s keep both versions safe"
                : "Your draft is still here"}
            </strong>
            <p>{error}</p>
            <div className="recovery-actions">
              {saveState !== "conflict" && (
                <Button onClick={() => void save()}>Try saving again</Button>
              )}
              <Button onClick={downloadDraft}>Download draft</Button>
              {saveState === "conflict" && (
                <Button disabled={actionBusy} onClick={() => void loadLatest()}>
                  Load latest revision
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="page-canvas">
        {parentPage && (
          <button
            type="button"
            className="parent-page-link"
            onClick={() => navigatePage(parentPage.id)}
          >
            <FileText size={13} />
            {parentPage.title}
            <ChevronRight size={13} />
          </button>
        )}
        <div className="page-icon-line">
          <label className="page-icon-input" title="Page icon">
            <span className="sr-only">Page icon</span>
            <input
              aria-label="Page icon"
              value={draft.icon}
              placeholder="◻"
              maxLength={12}
              onChange={(event) => patch({ icon: event.target.value })}
            />
          </label>
          <span className="page-kind">
            {draft.kind === "scratchpad"
              ? "Scratchpad"
              : draft.kind === "note"
                ? "Note"
                : "Page"}
          </span>
        </div>
        <textarea
          className="page-title"
          aria-label="Page title"
          rows={1}
          placeholder="Untitled"
          maxLength={200}
          value={draft.title}
          onChange={(event) => {
            patch({ title: event.target.value.replace(/\n/g, "") });
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              document.querySelector<HTMLElement>(".tiptap")?.focus();
            }
          }}
        />
        <div className="page-metadata">
          <span>Edited {dateLabel(page.updatedAt)}</span>
          <span className="meta-dot">·</span>
          <span>Revision {revision.current}</span>
          <select
            aria-label="Page project"
            value={draft.projectId || ""}
            onChange={(event) =>
              patch({ projectId: event.target.value || null })
            }
          >
            <option value="">No project</option>
            {snapshot.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <PageEditor
          key={page.id}
          content={draft.content}
          onChange={(content: PageContent) => patch({ content })}
          tables={snapshot.tables}
          files={snapshot.files}
          pages={snapshot.pages.filter((item) => !item.trashedAt)}
          workspaceId={snapshot.workspace.id}
          onOpenPage={navigatePage}
          onOpenTable={navigateTable}
          onTableChange={persistTable}
        />
        {children.length > 0 && (
          <div className="child-pages">
            <h2>Inside this page</h2>
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => navigatePage(child.id)}
              >
                <FileText size={17} />
                <span>{child.title || "Untitled"}</span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="add-child-page"
          onClick={() => createChild(page.id)}
        >
          <Plus size={15} />
          Add a nested page
        </button>
      </div>
      <Dialog
        open={moveOpen}
        title="Move page"
        description="Choose where this page belongs. Its link will stay the same."
        onClose={() => setMoveOpen(false)}
      >
        <form className="form-layout" onSubmit={move}>
          <label>
            Parent page
            <select
              autoFocus
              value={parent}
              onChange={(event) => setParent(event.target.value)}
            >
              <option value="">Workspace root</option>
              {parents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || "Untitled"}
                </option>
              ))}
            </select>
          </label>
          <FormError message={error} />
          <footer className="form-footer">
            <Button onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saveState === "saving"}
            >
              Move page
            </Button>
          </footer>
        </form>
      </Dialog>
    </article>
  );
}

function isDescendant(page: Page, ancestorId: string, pages: Page[]) {
  const seen = new Set<string>();
  let parentId = page.parentId;
  while (parentId && !seen.has(parentId)) {
    if (parentId === ancestorId) return true;
    seen.add(parentId);
    parentId = pages.find((item) => item.id === parentId)?.parentId || null;
  }
  return false;
}
