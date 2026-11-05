"use client";

/* Bootstrap's independent workspace composition follows the compact shell and inset surfaces of
 * t3UI AffectUI app-shell-frame.css, inspected at 66ff17008ebf30e73e7662234e3f14660f8a5c14.
 * Catalogue fixtures, simulated interactions, and private dependencies are not included. */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  File,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelRight,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  StickyNote,
  Table2,
  Trash2,
  Unplug,
  Upload,
  X,
} from "lucide-react";
import type {
  Agent,
  EditorNode,
  Page,
  Project,
  WorkspaceCommand,
  WorkspaceSnapshot,
  WorkspaceTable,
} from "@bootstrap/core";
import {
  ApiError,
  command as sendCommand,
  getWorkspace,
  signOut,
  uploadFile,
} from "@/lib/api";
import { TableGrid } from "@/components/tables/table-grid";
import { AgentSurface } from "./agent-surface";
import { PageSurface } from "./page-surface";
import { TaskList } from "./task-list";
import {
  AcknowledgedTableRevisions,
  confirmedSaveRevision,
} from "./save-revisions";
import {
  Button,
  Dialog,
  EmptyState,
  FormError,
  IconButton,
  SectionHeading,
  StatusBadge,
  Tabs,
  dateLabel,
  fileSize,
  initials,
} from "./ui";

type View =
  | "everything"
  | "today"
  | "pages"
  | "projects"
  | "tables"
  | "files"
  | "team"
  | "connections"
  | "settings"
  | "trash";
type Selection =
  | { kind: View; id?: never }
  | { kind: "page" | "project" | "table" | "agent"; id: string };
type CreateDialog =
  | { kind: "project"; project?: Project }
  | { kind: "table" }
  | { kind: "agent" }
  | { kind: "workspace" }
  | null;
type Mutate = (command: WorkspaceCommand) => Promise<WorkspaceSnapshot>;
const labels: Record<Selection["kind"], string> = {
  everything: "Everything",
  today: "Today",
  pages: "Pages",
  page: "Page",
  projects: "Projects",
  project: "Project",
  tables: "Tables",
  table: "Table",
  files: "Files",
  team: "Team",
  agent: "Agent",
  connections: "Connections",
  settings: "Settings",
  trash: "Trash",
};
const routeNames: Record<string, Selection["kind"]> = {
  pages: "page",
  projects: "project",
  tables: "table",
  team: "agent",
};

export function WorkspaceApp({
  initialSnapshot,
}: {
  initialSnapshot: WorkspaceSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const snapshotRef = useRef(initialSnapshot);
  const [selected, setSelected] = useState<Selection>({ kind: "everything" });
  const selectedRef = useRef(selected);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [createDialog, setCreateDialog] = useState<CreateDialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const uploadingRef = useRef<string | null>(null);
  const [tableDrafts, setTableDrafts] = useState<
    Record<string, WorkspaceTable>
  >({});
  const tableDraftsRef = useRef<Record<string, WorkspaceTable>>({});
  const tableRevisions = useRef<Record<string, number>>({});
  const acknowledgedTableRevisions = useRef(new AcknowledgedTableRevisions());
  const [tableErrors, setTableErrors] = useState<Record<string, string>>({});
  const tableErrorsRef = useRef<Record<string, string>>({});
  const tableSaves = useRef<Partial<Record<string, Promise<boolean>>>>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const beforeLeave = useRef<(() => Promise<boolean>) | null>(null);
  const navDialog = useRef<HTMLDialogElement>(null);
  const contextDialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const narrow = useMediaQuery("(max-width: 1050px)");
  const mobile = useMediaQuery("(max-width: 760px)");
  selectedRef.current = selected;
  const registerGuard = useCallback(
    (guard: (() => Promise<boolean>) | null) => {
      beforeLeave.current = guard;
    },
    [],
  );
  const applySnapshot = useCallback((next: WorkspaceSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);
  const mutate = useCallback(
    (action: WorkspaceCommand): Promise<WorkspaceSnapshot> => {
      const workspaceId = snapshotRef.current.workspace.id;
      const next = queue.current
        .catch(() => undefined)
        .then(() => sendCommand(workspaceId, action))
        .then((result) => {
          if (
            snapshotRef.current.workspace.id === workspaceId ||
            action.type === "workspace.create"
          )
            applySnapshot(result);
          return result;
        });
      queue.current = next;
      return next;
    },
    [applySnapshot],
  );

  const saveTable = useCallback(
    (id: string): Promise<boolean> => {
      const existingSave = tableSaves.current[id];
      if (existingSave) return existingSave;
      if (tableErrorsRef.current[id]) return Promise.resolve(false);
      const saving = (async () => {
        while (tableDraftsRef.current[id]) {
          const submitted = tableDraftsRef.current[id];
          const submittedRevision = tableRevisions.current[id];
          try {
            const next = await mutate({
              type: "table.update",
              id,
              revision: submittedRevision,
              patch: {
                name: submitted.name,
                description: submitted.description,
                columns: submitted.columns,
                rows: submitted.rows,
              },
            });
            const saved = next.tables.find((table) => table.id === id);
            if (!saved) throw new Error("The saved table could not be loaded.");
            const acknowledgedRevision = confirmedSaveRevision(
              submittedRevision,
              saved.revision,
            );
            acknowledgedTableRevisions.current.recordSuccessfulWrite(
              next.workspace.id,
              saved.id,
              submittedRevision,
            );
            tableRevisions.current[id] = acknowledgedRevision;
            if (tableDraftsRef.current[id] === submitted) {
              delete tableDraftsRef.current[id];
              setTableDrafts({ ...tableDraftsRef.current });
            }
          } catch (err) {
            const message =
              err instanceof ApiError && err.status === 409
                ? "This table has a newer revision. Download your draft before loading the latest table."
                : err instanceof Error
                  ? err.message
                  : "Could not save table.";
            tableErrorsRef.current[id] = message;
            setTableErrors({ ...tableErrorsRef.current });
            setNotice(
              `“${submitted.name}” could not be saved. Your draft is kept in Tables.`,
            );
            return false;
          }
        }
        return true;
      })();
      tableSaves.current[id] = saving;
      void saving.finally(() => {
        delete tableSaves.current[id];
      });
      return saving;
    },
    [mutate],
  );
  const persistTable = useCallback(
    (table: WorkspaceTable) => {
      if (!tableDraftsRef.current[table.id])
        tableRevisions.current[table.id] =
          acknowledgedTableRevisions.current.forDraft(
            snapshotRef.current.workspace.id,
            table,
          );
      tableDraftsRef.current[table.id] = table;
      setTableDrafts({ ...tableDraftsRef.current });
      void saveTable(table.id);
    },
    [saveTable],
  );

  const openResourceDialog = useCallback(
    async (value: CreateDialog) => {
      if (!value) {
        setCreateDialog(null);
        return;
      }
      if (beforeLeave.current && !(await beforeLeave.current())) return;
      if (value.kind === "workspace") {
        const pending = await Promise.all(
          Object.keys(tableDraftsRef.current).map(saveTable),
        );
        if (pending.some((result) => !result)) {
          setNotice(
            "Save or recover your table drafts before creating another workspace.",
          );
          return;
        }
      }
      setDrawerOpen(false);
      setContextOpen(false);
      setCreateDialog(value);
    },
    [saveTable],
  );

  const navigate = useCallback(async (next: Selection, writeHistory = true) => {
    if (beforeLeave.current && !(await beforeLeave.current())) return false;
    setSelected(next);
    setDrawerOpen(false);
    setSearchOpen(false);
    if (writeHistory)
      window.history.pushState(
        {},
        "",
        viewUrl(snapshotRef.current.workspace.id, next),
      );
    document.querySelector(".workspace-main")?.scrollTo({ top: 0 });
    return true;
  }, []);
  const changeWorkspace = useCallback(
    async (id: string, writeHistory = true) => {
      if (id === snapshotRef.current.workspace.id) return true;
      if (beforeLeave.current && !(await beforeLeave.current())) return false;
      const pending = await Promise.all(
        Object.keys(tableDraftsRef.current).map(saveTable),
      );
      if (pending.some((result) => !result)) {
        setNotice(
          "Save or recover your table drafts before changing workspaces.",
        );
        return false;
      }
      try {
        await queue.current.catch(() => undefined);
        const next = await getWorkspace(id);
        applySnapshot(next);
        setSelected({ kind: "everything" });
        setDrawerOpen(false);
        if (writeHistory)
          window.history.pushState({}, "", viewUrl(id, { kind: "everything" }));
        return true;
      } catch (err) {
        setNotice(
          err instanceof Error ? err.message : "Could not open workspace.",
        );
        return false;
      }
    },
    [applySnapshot, saveTable],
  );

  useEffect(() => {
    const route = parseRoute(window.location.pathname);
    if (route) setSelected(route.selection);
    else
      window.history.replaceState(
        {},
        "",
        viewUrl(initialSnapshot.workspace.id, { kind: "everything" }),
      );
    const onPopState = async () => {
      const next = parseRoute(window.location.pathname);
      if (!next) return;
      const switched = await changeWorkspace(next.workspaceId, false);
      const navigated = switched && (await navigate(next.selection, false));
      if (!navigated)
        window.history.replaceState(
          {},
          "",
          viewUrl(snapshotRef.current.workspace.id, selectedRef.current),
        );
    };
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (Object.keys(tableDraftsRef.current).length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [changeWorkspace, initialSnapshot.workspace.id, navigate]);
  useEffect(() => {
    if (!mobile) setDrawerOpen(false);
  }, [mobile]);
  useEffect(() => {
    const dialog = navDialog.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);
  useEffect(() => {
    const dialog = contextDialog.current;
    if (!dialog) return;
    if (narrow && contextOpen && !dialog.open) dialog.showModal();
    if ((!contextOpen || !narrow) && dialog.open) dialog.close();
  }, [contextOpen, narrow]);

  async function createPage(
    parentId: string | null = null,
    projectId: string | null = null,
    kind: Page["kind"] = "page",
  ) {
    if (beforeLeave.current && !(await beforeLeave.current())) return;
    if (kind === "scratchpad") {
      const existing = snapshotRef.current.pages.find(
        (page) => page.kind === "scratchpad" && !page.trashedAt,
      );
      if (existing) {
        await navigate({ kind: "page", id: existing.id });
        return;
      }
    }
    const previousIds = new Set(
      snapshotRef.current.pages.map((page) => page.id),
    );
    try {
      const next = await mutate({
        type: "page.create",
        title:
          kind === "scratchpad"
            ? "Scratchpad"
            : kind === "note"
              ? "Untitled note"
              : "Untitled",
        parentId,
        projectId,
        kind,
      });
      const created = next.pages.find((page) => !previousIds.has(page.id));
      if (created) await navigate({ kind: "page", id: created.id });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not create page.");
    }
  }
  async function upload(file: globalThis.File) {
    const workspaceId = snapshotRef.current.workspace.id;
    setUploading(file.name);
    setNotice(null);
    try {
      const uploadRequest = queue.current
        .catch(() => undefined)
        .then(() => uploadFile(workspaceId, file));
      queue.current = uploadRequest;
      const next = await uploadRequest;
      if (snapshotRef.current.workspace.id === workspaceId) {
        applySnapshot(next);
        setNotice(`Uploaded “${file.name}”. It is available in Files.`);
      }
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function recoverTable(id: string) {
    if (
      !window.confirm(
        "Load the latest saved table? Download your draft first to keep unsaved changes.",
      )
    )
      return;
    try {
      const next = await getWorkspace(snapshotRef.current.workspace.id);
      applySnapshot(next);
      delete tableDraftsRef.current[id];
      delete tableErrorsRef.current[id];
      setTableDrafts({ ...tableDraftsRef.current });
      setTableErrors({ ...tableErrorsRef.current });
      setNotice(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not reload table.");
    }
  }
  function retryTable(id: string) {
    delete tableErrorsRef.current[id];
    setTableErrors({ ...tableErrorsRef.current });
    void saveTable(id);
  }
  async function logout() {
    if (beforeLeave.current && !(await beforeLeave.current())) return;
    const pending = await Promise.all(
      Object.keys(tableDraftsRef.current).map(saveTable),
    );
    if (pending.some((value) => !value)) {
      setNotice("Save or recover your table drafts before signing out.");
      return;
    }
    try {
      await signOut();
      window.location.assign("/");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not sign out.");
    }
  }

  const livePages = snapshot.pages.filter((page) => !page.trashedAt);
  const effectiveSnapshot = useMemo(
    () => ({
      ...snapshot,
      tables: snapshot.tables.map((table) => tableDrafts[table.id] || table),
    }),
    [snapshot, tableDrafts],
  );
  const page =
    selected.kind === "page"
      ? snapshot.pages.find(
          (page) => page.id === selected.id && !page.trashedAt,
        )
      : undefined;
  const project =
    selected.kind === "project"
      ? snapshot.projects.find((project) => project.id === selected.id)
      : undefined;
  const table =
    selected.kind === "table"
      ? effectiveSnapshot.tables.find((table) => table.id === selected.id)
      : undefined;
  const agent =
    selected.kind === "agent"
      ? snapshot.agents.find((agent) => agent.id === selected.id)
      : undefined;
  const title =
    page?.title ||
    project?.name ||
    table?.name ||
    agent?.name ||
    labels[selected.kind];
  const sidebar = (
    <Sidebar
      snapshot={snapshot}
      selected={selected}
      navigate={navigate}
      createPage={createPage}
      changeWorkspace={changeWorkspace}
      openSearch={() => setSearchOpen(true)}
      openCreate={(value) => void openResourceDialog(value)}
      closeDrawer={() => setDrawerOpen(false)}
      logout={logout}
    />
  );
  const context = (
    <AgentContext
      page={page}
      agents={snapshot.agents}
      onClose={() => setContextOpen(false)}
      onCreate={() => void openResourceDialog({ kind: "agent" })}
      onOpen={(id) => {
        setContextOpen(false);
        void navigate({ kind: "agent", id });
      }}
    />
  );
  const create = (kind: NonNullable<CreateDialog>["kind"]) => {
    void openResourceDialog({ kind } as CreateDialog);
  };
  const rootNavigate = (next: Selection) => {
    void navigate(next);
  };
  return (
    <div
      className={`workspace-shell ${contextOpen && !narrow ? "has-context" : ""}`}
    >
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        {sidebar}
      </aside>
      <dialog
        ref={navDialog}
        className="navigation-drawer"
        aria-label="Workspace navigation"
        onCancel={() => setDrawerOpen(false)}
        onClose={() => setDrawerOpen(false)}
      >
        {sidebar}
      </dialog>
      <div className="workspace-center">
        <header className="workspace-topbar">
          <IconButton
            label="Open navigation"
            className="mobile-nav-toggle"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={18} />
          </IconButton>
          <div className="breadcrumbs">
            <button
              type="button"
              onClick={() => void navigate({ kind: "everything" })}
            >
              {snapshot.workspace.name}
            </button>
            <ChevronRight size={12} />
            <span>{title || "Untitled"}</span>
          </div>
          <div className="topbar-actions">
            <span className="build-label">Workspace preview</span>
            <IconButton label="Open search" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
            </IconButton>
            <button
              type="button"
              className={`context-toggle ${contextOpen ? "is-active" : ""}`}
              aria-label="Your team"
              aria-expanded={contextOpen}
              onClick={() => setContextOpen((value) => !value)}
            >
              <Sparkles size={15} />
              <span>Your team</span>
            </button>
          </div>
        </header>
        <main className="workspace-main" id="workspace-content" tabIndex={-1}>
          {notice && (
            <div className="workspace-notice" role="alert">
              <span>{notice}</span>
              <IconButton
                label="Dismiss notification"
                onClick={() => setNotice(null)}
              >
                <X size={15} />
              </IconButton>
            </div>
          )}
          {selected.kind === "everything" && (
            <Everything
              snapshot={snapshot}
              mutate={mutate}
              navigate={rootNavigate}
              createPage={createPage}
              create={create}
              upload={() => fileInput.current?.click()}
            />
          )}
          {selected.kind === "today" && (
            <Today snapshot={snapshot} mutate={mutate} />
          )}
          {selected.kind === "pages" && (
            <div className="collection-page">
              <CollectionHeader
                eyebrow="Your knowledge"
                title="Pages"
                description="A place for ideas, plans, and everything in between."
              >
                <Button variant="primary" onClick={() => void createPage()}>
                  <Plus size={15} />
                  New page
                </Button>
              </CollectionHeader>
              {livePages.length ? (
                <PageRows
                  pages={livePages}
                  navigate={(id) => rootNavigate({ kind: "page", id })}
                />
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Start with a blank page"
                  description="Write a brief, collect ideas, or make a home for a project."
                  action="Create a page"
                  onAction={() => void createPage()}
                />
              )}
            </div>
          )}
          {selected.kind === "page" &&
            (page ? (
              <PageSurface
                key={page.id}
                page={page}
                snapshot={effectiveSnapshot}
                mutate={mutate}
                navigatePage={(id) => rootNavigate({ kind: "page", id })}
                navigateTable={(id) => rootNavigate({ kind: "table", id })}
                createChild={(id) => void createPage(id, page.projectId)}
                onTrashed={() => {
                  beforeLeave.current = null;
                  void navigate({ kind: "trash" });
                }}
                registerGuard={registerGuard}
                persistTable={persistTable}
                onReloadSnapshot={applySnapshot}
              />
            ) : (
              <Unavailable
                label="page"
                onBack={() => rootNavigate({ kind: "pages" })}
              />
            ))}
          {selected.kind === "projects" && (
            <div className="collection-page">
              <CollectionHeader
                eyebrow="Make progress"
                title="Projects"
                description="Give each part of your business a place to move forward."
              >
                <Button variant="primary" onClick={() => create("project")}>
                  <Plus size={15} />
                  New project
                </Button>
              </CollectionHeader>
              <ProjectCards
                snapshot={snapshot}
                navigate={(id) => rootNavigate({ kind: "project", id })}
                create={() => create("project")}
              />
            </div>
          )}
          {selected.kind === "project" &&
            (project ? (
              <ProjectSurface
                key={project.id}
                project={project}
                snapshot={snapshot}
                mutate={mutate}
                navigate={rootNavigate}
                createPage={() => void createPage(null, project.id)}
                edit={() =>
                  void openResourceDialog({ kind: "project", project })
                }
              />
            ) : (
              <Unavailable
                label="project"
                onBack={() => rootNavigate({ kind: "projects" })}
              />
            ))}
          {selected.kind === "tables" && (
            <div className="collection-page">
              <CollectionHeader
                eyebrow="Bring some structure"
                title="Tables"
                description="Customers, content, research. Your information, organized."
              >
                <Button variant="primary" onClick={() => create("table")}>
                  <Plus size={15} />
                  New table
                </Button>
              </CollectionHeader>
              {snapshot.tables.length ? (
                <div className="table-cards">
                  {snapshot.tables.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="table-card"
                      onClick={() =>
                        rootNavigate({ kind: "table", id: item.id })
                      }
                    >
                      <span className="collection-icon">
                        <Table2 size={21} />
                      </span>
                      <strong>{item.name}</strong>
                      <p>
                        {item.description ||
                          "A shared source of structured information."}
                      </p>
                      <footer>
                        <span>
                          {item.columns.length} properties · {item.rows.length}{" "}
                          rows
                        </span>
                        {tableDrafts[item.id] ? (
                          <StatusBadge tone="amber">Unsaved</StatusBadge>
                        ) : (
                          <ArrowUpRight size={15} />
                        )}
                      </footer>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Table2}
                  title="Your first collection of useful information"
                  description="Create a table with text, numbers, dates, checkboxes, and more. Embed the same table in a page."
                  action="Create a table"
                  onAction={() => create("table")}
                />
              )}
            </div>
          )}
          {selected.kind === "table" &&
            (table ? (
              <TableSurface
                table={table}
                snapshot={snapshot}
                onChange={persistTable}
                dirty={Boolean(tableDrafts[table.id])}
                error={tableErrors[table.id]}
                registerGuard={registerGuard}
                flush={() => saveTable(table.id)}
                retry={() => retryTable(table.id)}
                recover={() => void recoverTable(table.id)}
              />
            ) : (
              <Unavailable
                label="table"
                onBack={() => rootNavigate({ kind: "tables" })}
              />
            ))}
          {selected.kind === "files" && (
            <FilesSurface
              snapshot={snapshot}
              mutate={mutate}
              uploading={uploading}
              upload={() => fileInput.current?.click()}
            />
          )}
          {selected.kind === "team" && (
            <div className="collection-page">
              <CollectionHeader
                eyebrow="Built around you"
                title="Your team"
                description="A specialist for each part of your business. You stay in the lead."
              >
                <Button variant="primary" onClick={() => create("agent")}>
                  <Plus size={15} />
                  Create an agent
                </Button>
              </CollectionHeader>
              <div className="feature-note">
                <Sparkles size={16} />
                <span>
                  Agent profiles are ready to configure. Execution, chat, and
                  connected tools are the next milestone.
                </span>
              </div>
              {snapshot.agents.length ? (
                <div className="agent-cards">
                  {snapshot.agents.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="agent-card"
                      onClick={() =>
                        rootNavigate({ kind: "agent", id: item.id })
                      }
                    >
                      <div className="agent-card-top">
                        <span
                          className="agent-avatar"
                          style={
                            { "--agent-color": item.color } as CSSProperties
                          }
                        >
                          {initials(item.name)}
                        </span>
                        <StatusBadge tone="violet">Configured</StatusBadge>
                      </div>
                      <h2>{item.name}</h2>
                      <span className="agent-role">
                        {item.role || "Your specialist"}
                      </span>
                      <p>
                        {item.description ||
                          "Define their instructions, skills, and working context."}
                      </p>
                      <footer>
                        <span>
                          {item.pageIds.length +
                            item.fileIds.length +
                            item.tableIds.length}{" "}
                          resources bound
                        </span>
                        <ArrowUpRight size={15} />
                      </footer>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Bot}
                  title="You don’t have to do it all alone"
                  description="Create your first specialist. Start with a researcher, operations assistant, or a role of your own."
                  action="Create your first agent"
                  onAction={() => create("agent")}
                />
              )}
            </div>
          )}
          {selected.kind === "agent" &&
            (agent ? (
              <AgentSurface
                key={agent.id}
                agent={agent}
                snapshot={snapshot}
                mutate={mutate}
                registerGuard={registerGuard}
                onDeleted={() => {
                  beforeLeave.current = null;
                  void navigate({ kind: "team" });
                }}
              />
            ) : (
              <Unavailable
                label="agent"
                onBack={() => rootNavigate({ kind: "team" })}
              />
            ))}
          {selected.kind === "connections" && <ConnectionsSurface />}
          {selected.kind === "settings" && (
            <SettingsSurface
              snapshot={snapshot}
              mutate={mutate}
              logout={logout}
            />
          )}
          {selected.kind === "trash" && (
            <TrashSurface
              snapshot={snapshot}
              mutate={mutate}
              navigate={(id) => rootNavigate({ kind: "page", id })}
            />
          )}
        </main>
      </div>
      {contextOpen && !narrow && (
        <aside className="agent-context-panel" aria-label="Your team">
          {context}
        </aside>
      )}
      <dialog
        ref={contextDialog}
        className="context-dialog"
        aria-label="Your team"
        onCancel={() => setContextOpen(false)}
        onClose={() => {
          if (narrow) setContextOpen(false);
        }}
      >
        {context}
      </dialog>
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload a file"
        disabled={Boolean(uploading)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        snapshot={snapshot}
        navigate={rootNavigate}
      />
      <CreateResourceDialog
        value={createDialog}
        onClose={() => setCreateDialog(null)}
        snapshot={snapshot}
        mutate={mutate}
        onCreated={(selection) => {
          setCreateDialog(null);
          void navigate(selection);
        }}
      />
    </div>
  );
}

function Sidebar({
  snapshot,
  selected,
  navigate,
  createPage,
  changeWorkspace,
  openSearch,
  openCreate,
  closeDrawer,
  logout,
}: {
  snapshot: WorkspaceSnapshot;
  selected: Selection;
  navigate(next: Selection): Promise<boolean>;
  createPage(
    parentId?: string | null,
    projectId?: string | null,
    kind?: Page["kind"],
  ): Promise<void>;
  changeWorkspace(id: string): Promise<boolean>;
  openSearch(): void;
  openCreate(value: CreateDialog): void;
  closeDrawer(): void;
  logout(): Promise<void>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const livePages = snapshot.pages.filter((page) => !page.trashedAt);
  const nav = (kind: View, Icon: typeof LayoutGrid, badge?: number) => (
    <button
      type="button"
      className={`nav-item ${selected.kind === kind ? "is-active" : ""}`}
      aria-current={selected.kind === kind ? "page" : undefined}
      onClick={() => void navigate({ kind })}
    >
      <Icon size={17} strokeWidth={1.6} />
      <span>{labels[kind]}</span>
      {Boolean(badge) && <span className="nav-count">{badge}</span>}
    </button>
  );
  function tree(parentId: string | null, depth = 0): ReactNode {
    if (depth > 20) return null;
    return livePages
      .filter((page) => page.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((page) => {
        const children = livePages.some((item) => item.parentId === page.id);
        const open = expanded[page.id] !== false;
        return (
          <div className="page-tree-entry" key={page.id}>
            <div
              className={`page-tree-row ${selected.kind === "page" && selected.id === page.id ? "is-active" : ""}`}
              style={{ "--tree-depth": Math.min(depth, 6) } as CSSProperties}
            >
              {children ? (
                <button
                  type="button"
                  className="tree-toggle"
                  aria-label={`${open ? "Collapse" : "Expand"} ${page.title}`}
                  aria-expanded={open}
                  onClick={() =>
                    setExpanded((value) => ({ ...value, [page.id]: !open }))
                  }
                >
                  <ChevronRight
                    size={12}
                    className={open ? "is-expanded" : ""}
                  />
                </button>
              ) : (
                <span className="tree-toggle-spacer" />
              )}
              <button
                type="button"
                className="page-tree-link"
                aria-current={
                  selected.kind === "page" && selected.id === page.id
                    ? "page"
                    : undefined
                }
                onClick={() => void navigate({ kind: "page", id: page.id })}
              >
                {page.icon ? (
                  <span className="tree-page-icon">{page.icon}</span>
                ) : (
                  <FileText size={15} />
                )}
                <span>{page.title || "Untitled"}</span>
              </button>
              <button
                type="button"
                className="tree-add"
                aria-label={`Add page inside ${page.title}`}
                onClick={() => void createPage(page.id, page.projectId)}
              >
                <Plus size={13} />
              </button>
            </div>
            {children && open && tree(page.id, depth + 1)}
          </div>
        );
      });
  }
  return (
    <>
      <div className="sidebar-brand">
        <span className="bootstrap-mark" aria-hidden="true">
          <Blocks size={19} strokeWidth={1.7} />
        </span>
        <span>
          Bootstrap<span className="brand-dot">.</span>
        </span>
        <IconButton
          label="Close navigation"
          className="drawer-close"
          onClick={closeDrawer}
        >
          <PanelLeftClose size={17} />
        </IconButton>
      </div>
      <div className="workspace-picker">
        <span className="workspace-initial">
          {snapshot.workspace.name[0]?.toUpperCase() || "B"}
        </span>
        <select
          aria-label="Current workspace"
          value={snapshot.workspace.id}
          onChange={(event) => void changeWorkspace(event.target.value)}
        >
          {snapshot.workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronDown size={12} />
      </div>
      <button type="button" className="sidebar-search" onClick={openSearch}>
        <Search size={15} />
        <span>Search anything</span>
        <kbd>Ctrl K</kbd>
      </button>
      <nav className="sidebar-navigation" aria-label="Main navigation">
        <div className="nav-group">
          {nav("everything", LayoutGrid)}
          {nav(
            "today",
            CalendarDays,
            snapshot.tasks.filter(
              (task) =>
                task.status !== "done" &&
                task.assignee === "me" &&
                Boolean(task.dueDate) &&
                task.dueDate! <= todayKey(),
            ).length,
          )}
        </div>
        {livePages.some((page) => page.favorite) && (
          <div className="nav-group">
            <span className="nav-group-heading">Favorites</span>
            {livePages
              .filter((page) => page.favorite)
              .map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`nav-item ${selected.kind === "page" && selected.id === page.id ? "is-active" : ""}`}
                  onClick={() => void navigate({ kind: "page", id: page.id })}
                >
                  <Star size={14} className="favorite-star" />
                  <span>{page.title || "Untitled"}</span>
                </button>
              ))}
          </div>
        )}
        <div className="nav-group">
          <div className="nav-group-heading">
            <button
              type="button"
              onClick={() => void navigate({ kind: "pages" })}
            >
              Workspace pages
            </button>
            <IconButton label="Create a page" onClick={() => void createPage()}>
              <Plus size={14} />
            </IconButton>
          </div>
          <div className="page-tree">{tree(null)}</div>
          {livePages.length === 0 && (
            <button
              type="button"
              className="empty-tree"
              onClick={() => void createPage()}
            >
              <Plus size={14} />
              Add your first page
            </button>
          )}
        </div>
        <div className="nav-group">
          <span className="nav-group-heading">Collections</span>
          {nav("projects", FolderOpen)}
          {nav("tables", Table2)}
          {nav("files", File)}
          {nav("team", Bot)}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-bottom-nav">
          {nav("connections", Unplug)}
          {nav("settings", Settings)}
          {nav("trash", Trash2)}
        </div>
        <div className="sidebar-account">
          <span className="user-avatar">{initials(snapshot.user.name)}</span>
          <div>
            <strong>{snapshot.user.name}</strong>
            <span>Your workspace</span>
          </div>
          <details className="account-menu">
            <summary className="icon-button" aria-label="Account actions">
              <ChevronDown size={14} />
            </summary>
            <div className="account-popover">
              <button
                type="button"
                onClick={() => openCreate({ kind: "workspace" })}
              >
                <Plus size={15} />
                New workspace
              </button>
              <button type="button" onClick={() => void logout()}>
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}

function Everything({
  snapshot,
  mutate,
  navigate,
  createPage,
  create,
  upload,
}: {
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  navigate(selection: Selection): void;
  createPage(
    parentId?: string | null,
    projectId?: string | null,
    kind?: Page["kind"],
  ): Promise<void>;
  create(kind: NonNullable<CreateDialog>["kind"]): void;
  upload(): void;
}) {
  const pages = snapshot.pages
    .filter((page) => !page.trashedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const notes = pages.filter((page) => page.kind === "note");
  return (
    <div className="overview-page">
      <div className="overview-main">
        <CollectionHeader
          eyebrow="Your ideas. Your business. Your workspace."
          title="Everything"
          description="Make room for the work that matters."
        >
          <Button variant="primary" onClick={() => void createPage()}>
            <Plus size={15} />
            New page
          </Button>
        </CollectionHeader>
        <div className="quick-actions">
          <button type="button" onClick={() => void createPage()}>
            <span className="quick-icon quick-icon-violet">
              <FilePlus2 size={18} />
            </span>
            <span>
              Write something<small>Start a page</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button type="button" onClick={() => create("table")}>
            <span className="quick-icon quick-icon-amber">
              <Table2 size={18} />
            </span>
            <span>
              Organize an idea<small>Create a table</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button type="button" onClick={upload}>
            <span className="quick-icon quick-icon-blue">
              <Upload size={18} />
            </span>
            <span>
              Bring your files<small>Upload a resource</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        </div>
        <SectionHeading
          title="Your projects"
          subtitle="A little structure for your next big thing."
        >
          <Button variant="quiet" onClick={() => create("project")}>
            <Plus size={14} />
            New project
          </Button>
        </SectionHeading>
        <ProjectCards
          snapshot={snapshot}
          navigate={(id) => navigate({ kind: "project", id })}
          create={() => create("project")}
          compact
        />
        <SectionHeading title="Recently edited">
          <button
            type="button"
            className="text-button"
            onClick={() => navigate({ kind: "pages" })}
          >
            All pages
            <ArrowRight size={13} />
          </button>
        </SectionHeading>
        {pages.length ? (
          <PageRows
            pages={pages.slice(0, 6)}
            navigate={(id) => navigate({ kind: "page", id })}
          />
        ) : (
          <div className="recent-empty">
            <FileText size={20} />
            <div>
              <strong>Your work starts here</strong>
              <p>Create a page to capture your first idea.</p>
            </div>
            <Button onClick={() => void createPage()}>Create a page</Button>
          </div>
        )}
        <div className="team-strip">
          <span className="team-strip-icon">
            <Bot size={20} />
          </span>
          <div>
            <strong>
              {snapshot.agents.length
                ? `${snapshot.agents.length} ${snapshot.agents.length === 1 ? "specialist" : "specialists"} in your team`
                : "A team that grows with your ambition"}
            </strong>
            <p>
              {snapshot.agents.length
                ? "Profiles configured. Agent execution is coming next."
                : "Your workspace works on its own. Add specialists whenever you’re ready."}
            </p>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => navigate({ kind: "team" })}
          >
            Meet your team
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <aside className="personal-panel" aria-label="Personal capture">
        <div className="personal-panel-heading">
          <span>Just for you</span>
          <StickyNote size={16} />
        </div>
        <SectionHeading title="Your to-dos">
          <span className="small-count">
            {
              snapshot.tasks.filter(
                (task) => task.assignee === "me" && task.status !== "done",
              ).length
            }
          </span>
        </SectionHeading>
        <TaskList
          compact
          tasks={snapshot.tasks.filter((task) => task.assignee === "me")}
          agents={snapshot.agents}
          projects={snapshot.projects}
          mutate={mutate}
          title="Your to-dos"
        />
        <div className="personal-divider" />
        <SectionHeading title="Notes">
          <IconButton
            label="Create a note"
            onClick={() => void createPage(null, null, "note")}
          >
            <Plus size={15} />
          </IconButton>
        </SectionHeading>
        {notes.length ? (
          <div className="note-links">
            {notes.slice(0, 4).map((note) => (
              <button
                type="button"
                key={note.id}
                onClick={() => navigate({ kind: "page", id: note.id })}
              >
                <FileText size={15} />
                <span>{note.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="personal-empty">Small thoughts deserve a place, too.</p>
        )}
        <button
          type="button"
          className="note-capture"
          onClick={() => void createPage(null, null, "note")}
        >
          <Plus size={14} />
          Capture a thought
        </button>
        <button
          type="button"
          className="scratchpad-card"
          onClick={() => void createPage(null, null, "scratchpad")}
        >
          <StickyNote size={18} />
          <span>
            <strong>Scratchpad</strong>
            <small>A little space to think out loud.</small>
          </span>
          <ArrowUpRight size={14} />
        </button>
        <p className="personal-footnote">
          <Check size={13} />
          Your work stays saved. AI is optional.
        </p>
      </aside>
    </div>
  );
}

function Today({
  snapshot,
  mutate,
}: {
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
}) {
  const mine = snapshot.tasks.filter((task) => task.assignee === "me");
  const due = mine.filter((task) => task.dueDate && task.dueDate <= todayKey());
  const later = mine.filter(
    (task) => !task.dueDate || task.dueDate > todayKey(),
  );
  return (
    <div className="collection-page today-page">
      <CollectionHeader
        eyebrow={new Intl.DateTimeFormat("en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())}
        title="One day at a time."
        description="A clear view of your commitments, with room to focus."
      />
      <div className="today-section">
        <SectionHeading
          title="Today & overdue"
          subtitle="Your tasks due today and anything still waiting."
        />
        <TaskList
          tasks={due}
          agents={snapshot.agents}
          projects={snapshot.projects}
          mutate={mutate}
          today
          title="Tasks due today"
        />
      </div>
      <div className="today-section">
        <SectionHeading
          title="On your radar"
          subtitle="Upcoming tasks and things without a due date."
        />
        <TaskList
          tasks={later}
          agents={snapshot.agents}
          projects={snapshot.projects}
          mutate={mutate}
          title="Upcoming tasks"
        />
      </div>
    </div>
  );
}

function CollectionHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="collection-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="collection-header-actions">{children}</div>}
    </div>
  );
}

function ProjectCards({
  snapshot,
  navigate,
  create,
  compact = false,
}: {
  snapshot: WorkspaceSnapshot;
  navigate(id: string): void;
  create(): void;
  compact?: boolean;
}) {
  return (
    <div className={`project-cards ${compact ? "project-cards-compact" : ""}`}>
      {snapshot.projects.map((project) => {
        const tasks = snapshot.tasks.filter(
          (task) => task.projectId === project.id,
        );
        const completed = tasks.filter((task) => task.status === "done").length;
        const pageCount = snapshot.pages.filter(
          (page) => !page.trashedAt && page.projectId === project.id,
        ).length;
        return (
          <button
            key={project.id}
            type="button"
            className="project-card"
            onClick={() => navigate(project.id)}
          >
            <div className="project-card-heading">
              <span
                className="project-icon"
                style={{ "--project-color": project.color } as CSSProperties}
              >
                <Folder size={20} strokeWidth={1.5} />
              </span>
              <ArrowUpRight size={15} />
            </div>
            <h3>{project.name}</h3>
            <p>
              {project.description || "A space for this part of your business."}
            </p>
            <footer>
              <span>
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
              <span>
                {tasks.length
                  ? `${completed}/${tasks.length} tasks`
                  : "No tasks yet"}
              </span>
            </footer>
            {tasks.length > 0 && (
              <div
                className="project-progress"
                aria-label={`${completed} of ${tasks.length} tasks completed`}
              >
                <span
                  style={{ width: `${(completed / tasks.length) * 100}%` }}
                />
              </div>
            )}
          </button>
        );
      })}
      <button
        type="button"
        className="project-card project-card-create"
        onClick={create}
      >
        <span className="new-project-icon">
          <Plus size={20} />
        </span>
        <strong>Start a project</strong>
        <span>A goal, a plan, a place to begin.</span>
      </button>
    </div>
  );
}

function PageRows({
  pages,
  navigate,
}: {
  pages: Page[];
  navigate(id: string): void;
}) {
  return (
    <div className="page-list">
      {pages.map((page) => (
        <button
          type="button"
          key={page.id}
          className="page-list-row"
          onClick={() => navigate(page.id)}
        >
          <span className="page-row-icon">
            {page.icon || <FileText size={18} />}
          </span>
          <span className="page-row-title">
            {page.title || "Untitled"}
            <small>
              {page.kind === "note"
                ? "Note"
                : page.kind === "scratchpad"
                  ? "Scratchpad"
                  : "Page"}
            </small>
          </span>
          {page.favorite && <Star size={13} className="favorite-star" />}
          <span className="page-updated">{dateLabel(page.updatedAt)}</span>
          <ChevronRight size={14} />
        </button>
      ))}
    </div>
  );
}

function ProjectSurface({
  project,
  snapshot,
  mutate,
  navigate,
  createPage,
  edit,
}: {
  project: Project;
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  navigate(selection: Selection): void;
  createPage(): void;
  edit(): void;
}) {
  const [tab, setTab] = useState<"Overview" | "Tasks" | "Pages">("Overview");
  const tasks = snapshot.tasks.filter((task) => task.projectId === project.id);
  const pages = snapshot.pages.filter(
    (page) => !page.trashedAt && page.projectId === project.id,
  );
  return (
    <div className="collection-page project-page">
      <div
        className="project-heading-icon"
        style={{ "--project-color": project.color } as CSSProperties}
      >
        <FolderOpen size={28} strokeWidth={1.4} />
      </div>
      <CollectionHeader
        title={project.name}
        description={
          project.description || "Every project starts with a clear next step."
        }
      >
        <Button onClick={edit}>
          <Settings size={14} />
          Edit project
        </Button>
      </CollectionHeader>
      <Tabs<"Overview" | "Tasks" | "Pages">
        items={["Overview", "Tasks", "Pages"] as const}
        active={tab}
        onChange={setTab}
        label="Project sections"
      />
      {(tab === "Overview" || tab === "Tasks") && (
        <div className="project-section">
          <SectionHeading title="Tasks" />
          <TaskList
            tasks={tasks}
            agents={snapshot.agents}
            projects={snapshot.projects}
            mutate={mutate}
            projectId={project.id}
          />
        </div>
      )}
      {(tab === "Overview" || tab === "Pages") && (
        <div className="project-section">
          <SectionHeading title="Project pages">
            <Button variant="quiet" onClick={createPage}>
              <Plus size={14} />
              New page
            </Button>
          </SectionHeading>
          {pages.length ? (
            <PageRows
              pages={pages}
              navigate={(id) => navigate({ kind: "page", id })}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="Give this project a home"
              description="Create a brief, research page, or working document for this project."
              action="Create a page"
              onAction={createPage}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TableSurface({
  table,
  snapshot,
  onChange,
  dirty,
  error,
  retry,
  recover,
  registerGuard,
  flush,
}: {
  table: WorkspaceTable;
  snapshot: WorkspaceSnapshot;
  onChange(table: WorkspaceTable): void;
  dirty: boolean;
  error?: string;
  retry(): void;
  recover(): void;
  registerGuard(guard: (() => Promise<boolean>) | null): void;
  flush(): Promise<boolean>;
}) {
  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description);
  const [exportError, setExportError] = useState<string | null>(null);
  useEffect(() => {
    setName(table.name);
    setDescription(table.description);
  }, [table.name, table.description]);
  const hasLocalChanges =
    name !== table.name || description !== table.description;
  const saveBeforeLeaving = useCallback(async () => {
    if (hasLocalChanges) {
      if (!name.trim()) {
        setExportError("Give this table a name before leaving.");
        return false;
      }
      onChange({ ...table, name: name.trim(), description });
    }
    return flush();
  }, [hasLocalChanges, name, description, table, onChange, flush]);
  useEffect(() => {
    registerGuard(saveBeforeLeaving);
    return () => registerGuard(null);
  }, [registerGuard, saveBeforeLeaving]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasLocalChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasLocalChanges]);
  function downloadDraft() {
    const blob = new Blob(
      [
        JSON.stringify(
          { schemaVersion: 1, type: "bootstrap-table-draft", table },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${table.name}-draft.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="collection-page table-page">
      <div className="table-page-header">
        <span className="eyebrow">One table. Wherever you need it.</span>
        <div className="table-title-line">
          <input
            aria-label="Table name"
            value={name}
            maxLength={200}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              if (name.trim() && name !== table.name)
                onChange({ ...table, name: name.trim() });
            }}
          />
          <a
            className={`button button-secondary ${dirty ? "is-disabled" : ""}`}
            aria-disabled={dirty}
            href={`/api/export?workspaceId=${encodeURIComponent(snapshot.workspace.id)}&type=table&id=${encodeURIComponent(table.id)}&format=csv`}
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                setExportError("Wait for this table to save before exporting.");
              }
            }}
          >
            <ArrowDownToLine size={15} />
            Export CSV
          </a>
        </div>
        <input
          className="table-description"
          aria-label="Table description"
          placeholder="What is this table for?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => {
            if (description !== table.description)
              onChange({ ...table, description });
          }}
        />
        <div
          className={`table-save-state ${error ? "danger-text" : ""}`}
          role="status"
        >
          {error
            ? "Changes not saved"
            : dirty
              ? "Saving table…"
              : `All changes saved · Revision ${table.revision}`}
        </div>
      </div>
      {error && (
        <div className="save-recovery">
          <div>
            <strong>Your table draft is kept here</strong>
            <p>{error}</p>
            <div className="recovery-actions">
              <Button onClick={downloadDraft}>Download draft</Button>
              <Button onClick={retry}>Try saving again</Button>
              <Button onClick={recover}>Load latest table</Button>
            </div>
          </div>
        </div>
      )}
      <FormError message={exportError} />
      <TableGrid
        table={table}
        onChange={onChange}
        files={snapshot.files}
        workspaceId={snapshot.workspace.id}
      />
    </div>
  );
}

function FilesSurface({
  snapshot,
  mutate,
  uploading,
  upload,
}: {
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  uploading: string | null;
  upload(): void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Delete “${name}”? Pages that reference it will show an unavailable file.`,
      )
    )
      return;
    setDeleting(id);
    setError(null);
    try {
      await mutate({ type: "file.delete", id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete file.");
    } finally {
      setDeleting(null);
    }
  }
  return (
    <div className="collection-page">
      <CollectionHeader
        eyebrow="Everything you bring"
        title="Files"
        description="Keep source material close to the work it supports."
      >
        <Button
          variant="primary"
          disabled={Boolean(uploading)}
          onClick={upload}
        >
          {uploading ? (
            <LoaderCircle size={15} className="spinning" />
          ) : (
            <Upload size={15} />
          )}
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
      </CollectionHeader>
      {uploading && (
        <div className="feature-note" role="status">
          <LoaderCircle size={15} className="spinning" />
          Uploading {uploading}…
        </div>
      )}
      <FormError message={error} />
      {snapshot.files.length ? (
        <div className="file-list">
          <div className="file-list-heading">
            <span>Name</span>
            <span>Size</span>
            <span>Added</span>
            <span className="sr-only">Actions</span>
          </div>
          {snapshot.files.map((file) => (
            <div className="file-row" key={file.id}>
              <div className="file-info">
                <span className="file-type-icon">
                  <File size={20} />
                </span>
                <div>
                  <a
                    href={`/api/files/${encodeURIComponent(file.id)}?workspaceId=${encodeURIComponent(snapshot.workspace.id)}`}
                    download
                  >
                    {file.name}
                  </a>
                  <span>{file.mimeType || "File"}</span>
                </div>
              </div>
              <span className="muted file-size">{fileSize(file.size)}</span>
              <span className="muted file-created">
                {dateLabel(file.createdAt)}
              </span>
              <div className="file-row-actions">
                <a
                  className="icon-button"
                  aria-label={`Download ${file.name}`}
                  href={`/api/files/${encodeURIComponent(file.id)}?workspaceId=${encodeURIComponent(snapshot.workspace.id)}`}
                  download
                >
                  <ArrowDownToLine size={16} />
                </a>
                <IconButton
                  label={`Delete ${file.name}`}
                  disabled={deleting === file.id}
                  onClick={() => void remove(file.id, file.name)}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="upload-empty">
          <div className="upload-empty-stack">
            <FileText size={32} strokeWidth={1.25} />
          </div>
          <h2>Your source material belongs here</h2>
          <p>
            Upload a brief, a spreadsheet, or a useful reference.
            <br />
            Files stay private to your workspace.
          </p>
          <Button onClick={upload} disabled={Boolean(uploading)}>
            <Upload size={15} />
            Choose a file
          </Button>
        </div>
      )}
    </div>
  );
}

function ConnectionsSurface() {
  return (
    <div className="collection-page">
      <CollectionHeader
        eyebrow="Work with what you already use"
        title="Connections"
        description="Bring your business tools into your workspace."
      />
      <div className="connections-intro">
        <span className="connection-symbol">
          <Unplug size={29} strokeWidth={1.3} />
        </span>
        <h2>Your tools. One workspace.</h2>
        <p>
          Composio will connect your agents to the services you choose, with
          scoped access and approval for external actions.
        </p>
        <StatusBadge tone="amber">
          Coming in the integrations milestone
        </StatusBadge>
      </div>
      <div className="connection-preview-list">
        {["Notion", "GitHub", "Google Drive", "Slack"].map((service, index) => (
          <div key={service}>
            <span className={`service-letter service-${index}`}>
              {service[0]}
            </span>
            <div>
              <strong>{service}</strong>
              <span>Connection setup is not available yet</span>
            </div>
            <StatusBadge>Planned</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSurface({
  snapshot,
  mutate,
  logout,
}: {
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  logout(): Promise<void>;
}) {
  const [name, setName] = useState(snapshot.workspace.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function rename(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await mutate({ type: "workspace.rename", name: name.trim() });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not rename workspace.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="collection-page settings-page">
      <CollectionHeader
        title="Settings"
        description="Make this workspace your own."
      />
      <section className="settings-section">
        <h2>Workspace</h2>
        <form onSubmit={rename} className="form-layout form-layout-inline">
          <label>
            Workspace name
            <input
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <FormError message={error} />
          <div>
            <Button
              variant="primary"
              type="submit"
              disabled={
                saving || !name.trim() || name === snapshot.workspace.name
              }
            >
              {saving ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>
      </section>
      <section className="settings-section">
        <h2>Your account</h2>
        <dl className="account-details">
          <div>
            <dt>Name</dt>
            <dd>{snapshot.user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{snapshot.user.email}</dd>
          </div>
        </dl>
        <Button onClick={() => void logout()}>
          <LogOut size={15} />
          Sign out
        </Button>
      </section>
      <section className="settings-section">
        <h2>Your data</h2>
        <p>
          Export pages as native JSON or Markdown from the page’s Actions menu.
          Export tables as CSV from the table view. Original uploaded files can
          be downloaded from Files.
        </p>
        <p className="form-hint">
          Managed subscriptions, AI credits, and connected tools are not enabled
          in this build. Manual workspace features work without AI credentials.
        </p>
      </section>
    </div>
  );
}

function TrashSurface({
  snapshot,
  mutate,
  navigate,
}: {
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  navigate(id: string): void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pages = snapshot.pages.filter((page) => page.trashedAt);
  async function restore(page: Page) {
    setBusy(page.id);
    setError(null);
    try {
      await mutate({
        type: "page.restore",
        id: page.id,
        revision: page.revision,
      });
      navigate(page.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore page.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="collection-page">
      <CollectionHeader
        title="Trash"
        description="Pages can be restored. Linked tables and files are kept separately."
      />
      <FormError message={error} />
      {pages.length ? (
        <div className="trash-list">
          {pages.map((page) => (
            <div className="trash-row" key={page.id}>
              <FileText size={17} />
              <span>{page.title || "Untitled"}</span>
              <small>{dateLabel(page.trashedAt)}</small>
              <Button
                disabled={Boolean(busy)}
                onClick={() => void restore(page)}
              >
                {busy === page.id ? "Restoring…" : "Restore"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trash2}
          title="Nothing in the trash"
          description="Pages you move to Trash will appear here until you restore them."
        />
      )}
    </div>
  );
}

function AgentContext({
  page,
  agents,
  onClose,
  onCreate,
  onOpen,
}: {
  page?: Page;
  agents: Agent[];
  onClose(): void;
  onCreate(): void;
  onOpen(id: string): void;
}) {
  return (
    <>
      <header className="context-heading">
        <span>
          <Sparkles size={16} />
          Your team
        </span>
        <IconButton label="Close team panel" onClick={onClose}>
          <X size={17} />
        </IconButton>
      </header>
      <div className="context-body">
        <span className="eyebrow">Support, right where you work</span>
        <h2>
          Keep your focus.
          <br />
          Bring in a specialist.
        </h2>
        {page && (
          <div className="context-resource">
            <span className="eyebrow">Current page</span>
            <div>
              <FileText size={16} />
              <strong>{page.title}</strong>
            </div>
            <small>Saved revision {page.revision} · This page only</small>
          </div>
        )}
        {agents.length ? (
          <div className="context-agents">
            {agents.map((agent) => (
              <button
                type="button"
                key={agent.id}
                onClick={() => onOpen(agent.id)}
              >
                <span
                  className="agent-avatar agent-avatar-small"
                  style={{ "--agent-color": agent.color } as CSSProperties}
                >
                  {initials(agent.name)}
                </span>
                <span>
                  <strong>{agent.name}</strong>
                  <small>{agent.role || "Your specialist"}</small>
                </span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        ) : (
          <div className="context-empty">
            <Bot size={27} strokeWidth={1.4} />
            <h3>Your team starts with you</h3>
            <p>
              Add a specialist and give them clear instructions and context.
            </p>
            <Button onClick={onCreate}>
              <Plus size={14} />
              Create an agent
            </Button>
          </div>
        )}
        <div className="context-planned">
          <span className="status-dot" />
          <span>
            Profiles are available. Agent conversations and execution are coming
            next.
          </span>
        </div>
      </div>
    </>
  );
}

function SearchDialog({
  open,
  onClose,
  snapshot,
  navigate,
}: {
  open: boolean;
  onClose(): void;
  snapshot: WorkspaceSnapshot;
  navigate(selection: Selection): void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [
      ...snapshot.pages
        .filter((page) => !page.trashedAt)
        .map((page) => ({
          id: page.id,
          title: page.title || "Untitled",
          type: "Page",
          icon: FileText,
          search: page.title + " " + plainText(page.content.content),
          selection: { kind: "page", id: page.id } as Selection,
        })),
      ...snapshot.projects.map((project) => ({
        id: project.id,
        title: project.name,
        type: "Project",
        icon: Folder,
        search: project.name + " " + project.description,
        selection: { kind: "project", id: project.id } as Selection,
      })),
      ...snapshot.tables.map((table) => ({
        id: table.id,
        title: table.name,
        type: "Table",
        icon: Table2,
        search: table.name,
        selection: { kind: "table", id: table.id } as Selection,
      })),
      ...snapshot.agents.map((agent) => ({
        id: agent.id,
        title: agent.name,
        type: "Agent",
        icon: Bot,
        search: agent.name + " " + agent.role,
        selection: { kind: "agent", id: agent.id } as Selection,
      })),
    ]
      .filter(
        (result) => !search || result.search.toLowerCase().includes(search),
      )
      .slice(0, 30);
  }, [query, snapshot]);
  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);
  return (
    <Dialog open={open} title="Find your work" onClose={onClose}>
      <div className="search-content">
        <div className="search-field">
          <Search size={19} />
          <input
            autoFocus
            aria-label="Search workspace"
            placeholder="Search pages, projects, tables, and agents…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setIndex((value) =>
                  Math.max(
                    0,
                    Math.min(
                      results.length - 1,
                      value + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  ),
                );
              }
              if (event.key === "Enter" && results[index]) {
                event.preventDefault();
                navigate(results[index].selection);
              }
            }}
          />
        </div>
        <div className="search-results">
          {results.map((result, resultIndex) => (
            <button
              type="button"
              key={result.type + result.id}
              className={resultIndex === index ? "is-selected" : ""}
              onMouseEnter={() => setIndex(resultIndex)}
              onClick={() => navigate(result.selection)}
            >
              <result.icon size={17} />
              <span>{result.title}</span>
              <small>{result.type}</small>
              <ArrowUpRight size={14} />
            </button>
          ))}
          {results.length === 0 && (
            <div className="search-empty">
              {query
                ? `No matches for “${query}”. Try a different search.`
                : "Create a page or project and you’ll find it here."}
            </div>
          )}
        </div>
        <footer className="search-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>Enter</kbd> to open
          </span>
        </footer>
      </div>
    </Dialog>
  );
}

function CreateResourceDialog({
  value,
  onClose,
  snapshot,
  mutate,
  onCreated,
}: {
  value: CreateDialog;
  onClose(): void;
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  onCreated(selection: Selection): void;
}) {
  return (
    <Dialog
      open={Boolean(value)}
      title={
        value?.kind === "project" && value.project
          ? "Edit project"
          : `Create ${value?.kind === "agent" ? "an agent" : `a ${value?.kind || "resource"}`}`
      }
      onClose={onClose}
    >
      {value && (
        <CreateResourceForm
          key={
            value.kind === "project"
              ? value.project?.id || value.kind
              : value.kind
          }
          value={value}
          snapshot={snapshot}
          mutate={mutate}
          onCreated={onCreated}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function CreateResourceForm({
  value,
  snapshot,
  mutate,
  onCreated,
  onClose,
}: {
  value: NonNullable<CreateDialog>;
  snapshot: WorkspaceSnapshot;
  mutate: Mutate;
  onCreated(selection: Selection): void;
  onClose(): void;
}) {
  const [name, setName] = useState(
    value.kind === "project" ? value.project?.name || "" : "",
  );
  const [description, setDescription] = useState(
    value.kind === "project" ? value.project?.description || "" : "",
  );
  const [role, setRole] = useState("");
  const [color, setColor] = useState(
    value.kind === "project" ? value.project?.color || "#7165c8" : "#7165c8",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (value.kind === "project") {
        const next = value.project
          ? await mutate({
              type: "project.update",
              id: value.project.id,
              patch: { name: name.trim(), description, color },
            })
          : await mutate({
              type: "project.create",
              name: name.trim(),
              description,
              color,
            });
        const id =
          value.project?.id ||
          next.projects.find(
            (project) =>
              !snapshot.projects.some((old) => old.id === project.id),
          )?.id;
        if (id) onCreated({ kind: "project", id });
      } else if (value.kind === "table") {
        const next = await mutate({ type: "table.create", name: name.trim() });
        const id = next.tables.find(
          (table) => !snapshot.tables.some((old) => old.id === table.id),
        )?.id;
        if (id) onCreated({ kind: "table", id });
      } else if (value.kind === "agent") {
        const next = await mutate({
          type: "agent.create",
          name: name.trim(),
          role,
          description,
        });
        const id = next.agents.find(
          (agent) => !snapshot.agents.some((old) => old.id === agent.id),
        )?.id;
        if (id) onCreated({ kind: "agent", id });
      } else {
        const next = await mutate({
          type: "workspace.create",
          name: name.trim(),
        });
        window.history.replaceState(
          {},
          "",
          viewUrl(next.workspace.id, { kind: "everything" }),
        );
        onCreated({ kind: "everything" });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-layout" onSubmit={submit}>
      <label>
        {value.kind === "agent"
          ? "Agent name"
          : value.kind === "workspace"
            ? "Workspace name"
            : "Name"}
        <input
          autoFocus
          required
          maxLength={100}
          placeholder={
            value.kind === "project"
              ? "e.g. Launch the first version"
              : value.kind === "table"
                ? "e.g. Customer interviews"
                : value.kind === "agent"
                  ? "e.g. Research assistant"
                  : "e.g. My studio"
          }
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {value.kind === "agent" && (
        <label>
          Role
          <input
            placeholder="What will this agent help you with?"
            maxLength={200}
            value={role}
            onChange={(event) => setRole(event.target.value)}
          />
        </label>
      )}
      {(value.kind === "agent" || value.kind === "project") && (
        <label>
          Description
          <textarea
            rows={3}
            placeholder={
              value.kind === "project"
                ? "What are you working toward?"
                : "A little context about this specialist."
            }
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      )}
      {value.kind === "project" && (
        <fieldset className="color-options">
          <legend>Project color</legend>
          {[
            "#7165c8",
            "#4e8599",
            "#b07c40",
            "#58846b",
            "#b5667b",
            "#777981",
          ].map((option) => (
            <label
              key={option}
              style={{ "--option-color": option } as CSSProperties}
            >
              <input
                type="radio"
                name="color"
                value={option}
                aria-label={`Color ${option}`}
                checked={color === option}
                onChange={() => setColor(option)}
              />
              <span>{color === option && <Check size={13} />}</span>
            </label>
          ))}
        </fieldset>
      )}
      {value.kind === "agent" && (
        <p className="form-hint">
          You can configure the six properties next. Agent execution is not
          enabled in this build.
        </p>
      )}
      <FormError message={error} />
      <footer className="form-footer">
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
          {busy
            ? "Saving…"
            : value.kind === "project" && value.project
              ? "Save project"
              : `Create ${value.kind}`}
        </Button>
      </footer>
    </form>
  );
}

function Unavailable({ label, onBack }: { label: string; onBack(): void }) {
  return (
    <EmptyState
      icon={FileText}
      title={`This ${label} is unavailable`}
      description="It may have been moved to Trash, or it does not belong to this workspace."
      action="Back to collection"
      onAction={onBack}
    />
  );
}
function viewUrl(workspaceId: string, selection: Selection) {
  const segment =
    selection.kind === "page"
      ? "pages"
      : selection.kind === "project"
        ? "projects"
        : selection.kind === "table"
          ? "tables"
          : selection.kind === "agent"
            ? "team"
            : selection.kind;
  return `/w/${encodeURIComponent(workspaceId)}/${segment}${"id" in selection && selection.id ? `/${encodeURIComponent(selection.id)}` : ""}`;
}
function parseRoute(
  pathname: string,
): { workspaceId: string; selection: Selection } | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== "w" || !parts[1]) return null;
  if (parts[3] && routeNames[parts[2]])
    return {
      workspaceId: parts[1],
      selection: { kind: routeNames[parts[2]], id: parts[3] } as Selection,
    };
  const kind =
    parts[2] && labels[parts[2] as View] ? (parts[2] as View) : "everything";
  return { workspaceId: parts[1], selection: { kind } };
}
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
  return matches;
}
function plainText(nodes?: EditorNode[]): string {
  return (nodes || [])
    .map((node) => node.text || plainText(node.content))
    .join(" ");
}
function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
