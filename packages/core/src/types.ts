/** Shared wire contracts. Dates are ISO strings; document JSON is canonical. */
export type Id = string;
export type EditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};
export type PageContent = { type: "doc"; content: EditorNode[] };
export type Workspace = { id: Id; name: string; createdAt: string };
export type User = { id: Id; name: string; email: string };
export type Project = {
  id: Id;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};
export type Page = {
  id: Id;
  sourceRunId?: Id | null;
  title: string;
  icon: string;
  parentId: Id | null;
  projectId: Id | null;
  kind: "page" | "note" | "scratchpad";
  content: PageContent;
  revision: number;
  favorite: boolean;
  fullWidth: boolean;
  sortOrder: number;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Task = {
  id: Id;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignee: string;
  projectId: Id | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TableColumnType =
  "text" | "number" | "date" | "checkbox" | "select" | "url" | "file";
export type TableColumn = {
  id: Id;
  name: string;
  type: TableColumnType;
  options?: string[];
};
export type TableCellValue = string | number | boolean | null;
export type TableRow = { id: Id; cells: Record<string, TableCellValue> };
export type WorkspaceTable = {
  id: Id;
  name: string;
  description: string;
  columns: TableColumn[];
  rows: TableRow[];
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type WorkspaceFile = {
  id: Id;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};
export type Agent = {
  id: Id;
  name: string;
  role: string;
  description: string;
  color: string;
  instructions: string;
  skills: string[];
  routines: string[];
  memories: string[];
  fileIds: Id[];
  tableIds: Id[];
  pageIds: Id[];
  status: "configured";
  createdAt: string;
  updatedAt: string;
};
export type WorkspaceSnapshot = {
  user: User;
  workspace: Workspace;
  workspaces: Workspace[];
  projects: Project[];
  pages: Page[];
  tasks: Task[];
  tables: WorkspaceTable[];
  files: WorkspaceFile[];
  agents: Agent[];
};
export type PagePatch = Partial<
  Pick<
    Page,
    | "title"
    | "icon"
    | "parentId"
    | "projectId"
    | "kind"
    | "content"
    | "favorite"
    | "fullWidth"
    | "sortOrder"
  >
>;
export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "assignee"
    | "projectId"
    | "dueDate"
  >
>;
export type TablePatch = Partial<
  Pick<WorkspaceTable, "name" | "description" | "columns" | "rows">
>;
export type AgentPatch = Partial<
  Pick<
    Agent,
    | "name"
    | "role"
    | "description"
    | "color"
    | "instructions"
    | "skills"
    | "routines"
    | "memories"
    | "fileIds"
    | "tableIds"
    | "pageIds"
  >
>;
export type WorkspaceCommand =
  | { type: "workspace.create"; name: string }
  | { type: "workspace.rename"; name: string }
  | {
      type: "project.create";
      name: string;
      description?: string;
      color?: string;
    }
  | {
      type: "project.update";
      id: Id;
      patch: Partial<Pick<Project, "name" | "description" | "color">>;
    }
  | {
      type: "page.create";
      title?: string;
      parentId?: Id | null;
      projectId?: Id | null;
      kind?: Page["kind"];
    }
  | { type: "page.update"; id: Id; revision: number; patch: PagePatch }
  | { type: "page.trash"; id: Id; revision: number }
  | { type: "page.restore"; id: Id; revision: number }
  | {
      type: "task.create";
      title: string;
      projectId?: Id | null;
      dueDate?: string | null;
      assignee?: string;
    }
  | { type: "task.update"; id: Id; patch: TaskPatch }
  | { type: "task.delete"; id: Id }
  | { type: "table.create"; name: string }
  | { type: "table.update"; id: Id; revision: number; patch: TablePatch }
  | { type: "agent.create"; name: string; role?: string; description?: string }
  | { type: "agent.update"; id: Id; patch: AgentPatch }
  | { type: "agent.delete"; id: Id }
  | { type: "file.delete"; id: Id };
export type ApiErrorBody = {
  error: string;
  code?: string;
  currentRevision?: number;
};
export type SetupStatus = { initialized: boolean; requiresSetupToken: boolean };
export type SetupInput = {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
  setupToken?: string;
};

/** A resource is selected explicitly for one assignment; references never expand scope. */
export type AgentResource = {
  kind: "page" | "table" | "file";
  id: Id;
  version: string;
};
export type RunSource = AgentResource & {
  label: string;
  citation: string;
  sha256: string;
};
export type AgentConfiguration = Pick<
  Agent,
  "name" | "role" | "instructions" | "skills" | "memories" | "updatedAt"
>;
export type RunLimits = {
  maxSteps: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  timeoutMs: number;
};
export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "cancelled"
  | "failed"
  | "paused_budget"
  | "reconciling";
export type ProviderStatus = {
  ready: boolean;
  kind: "unconfigured" | "deterministic" | "openai-compatible";
  model: string | null;
  message: string;
  limits: RunLimits;
};
export type AssignmentInput = {
  operationKey: string;
  agentId: Id;
  prompt: string;
  resources: AgentResource[];
  projectId?: Id | null;
  outputTitle: string;
  limits?: Partial<RunLimits>;
};
export type RunEvent = {
  sequence: number;
  type: string;
  message: string;
  createdAt: string;
};
export type AgentRun = {
  id: Id;
  threadId: Id;
  assignmentId: Id;
  agentId: Id;
  agentName: string;
  prompt: string;
  outputTitle: string;
  status: RunStatus;
  assignmentStatus:
    | "queued"
    | "in_progress"
    | "needs_review"
    | "done"
    | "blocked"
    | "cancelled";
  provider: ProviderStatus["kind"];
  model: string;
  sources: RunSource[];
  limits: RunLimits;
  steps: number;
  attempt: number;
  inputTokens: number | null;
  outputTokens: number | null;
  inputTokenUpperBound: number;
  outputText: string;
  errorCode: string | null;
  errorMessage: string | null;
  resultDocumentId: Id | null;
  createdAt: string;
  finishedAt: string | null;
  messages: {
    id: Id;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }[];
  events: RunEvent[];
};
