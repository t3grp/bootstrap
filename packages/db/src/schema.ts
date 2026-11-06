import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  sqliteTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  Agent,
  AgentConfiguration,
  PageContent,
  RunLimits,
  RunSource,
  RunStatus,
  TableColumn,
  TableRow,
} from "@bootstrap/core";

// Better Auth's core schema. No public registration or social providers are enabled.
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
  },
  (table) => [
    uniqueIndex("account_provider_identity_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const instance = sqliteTable("instance", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`),
});

export const memberships = sqliteTable(
  "memberships",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

const resourceIdentity = () => ({
  id: text("id").notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`),
});

export const projects = sqliteTable(
  "projects",
  {
    ...resourceIdentity(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#71717a"),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

export const documents = sqliteTable(
  "documents",
  {
    ...resourceIdentity(),
    title: text("title").notNull(),
    sourceRunId: text("source_run_id"),
    icon: text("icon").notNull().default(""),
    parentId: text("parent_id"),
    projectId: text("project_id"),
    kind: text("kind", { enum: ["page", "note", "scratchpad"] })
      .notNull()
      .default("page"),
    revision: integer("revision").notNull().default(1),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    fullWidth: integer("full_width", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
    trashBatchId: text("trash_batch_id"),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.id] }),
    foreignKey({
      columns: [table.workspaceId, table.parentId],
      foreignColumns: [table.workspaceId, table.id],
      name: "documents_parent_workspace_fk",
    }),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "documents_project_workspace_fk",
    }),
  ],
);

export const documentVersions = sqliteTable(
  "document_versions",
  {
    workspaceId: text("workspace_id").notNull(),
    documentId: text("document_id").notNull(),
    revision: integer("revision").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    content: text("content", { mode: "json" }).$type<PageContent>().notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
  },
  (table) => [
    primaryKey({
      columns: [table.workspaceId, table.documentId, table.revision],
    }),
    foreignKey({
      columns: [table.workspaceId, table.documentId],
      foreignColumns: [documents.workspaceId, documents.id],
      name: "versions_document_workspace_fk",
    }).onDelete("cascade"),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    ...resourceIdentity(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["todo", "in_progress", "done"] })
      .notNull()
      .default("todo"),
    priority: text("priority", { enum: ["low", "medium", "high"] })
      .notNull()
      .default("medium"),
    assignee: text("assignee").notNull().default("me"),
    projectId: text("project_id"),
    dueDate: text("due_date"),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.id] }),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "tasks_project_workspace_fk",
    }),
  ],
);

export const businessTables = sqliteTable(
  "business_tables",
  {
    ...resourceIdentity(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    revision: integer("revision").notNull().default(1),
    columns: text("columns", { mode: "json" }).$type<TableColumn[]>().notNull(),
    rows: text("rows", { mode: "json" }).$type<TableRow[]>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

export const files = sqliteTable(
  "files",
  {
    ...resourceIdentity(),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    sha256: text("sha256").notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

export const agents = sqliteTable(
  "agents",
  {
    ...resourceIdentity(),
    name: text("name").notNull(),
    role: text("role").notNull().default(""),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#6366f1"),
    instructions: text("instructions").notNull().default(""),
    skills: text("skills", { mode: "json" })
      .$type<Agent["skills"]>()
      .notNull()
      .default([]),
    routines: text("routines", { mode: "json" })
      .$type<Agent["routines"]>()
      .notNull()
      .default([]),
    memories: text("memories", { mode: "json" })
      .$type<Agent["memories"]>()
      .notNull()
      .default([]),
    fileIds: text("file_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    tableIds: text("table_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    pageIds: text("page_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

// History deliberately survives agent deletion. The worker always resolves the live agent
// again before dispatch; a historical agent ID is never an authorization credential.
export const agentThreads = sqliteTable(
  "agent_threads",
  {
    ...resourceIdentity(),
    agentId: text("agent_id").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

export const agentAssignments = sqliteTable(
  "agent_assignments",
  {
    ...resourceIdentity(),
    threadId: text("thread_id").notNull(),
    agentId: text("agent_id").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id),
    operationKey: text("operation_key").notNull(),
    payloadHash: text("payload_hash").notNull(),
    prompt: text("prompt").notNull(),
    outputTitle: text("output_title").notNull(),
    projectId: text("project_id"),
    status: text("status", {
      enum: [
        "queued",
        "in_progress",
        "needs_review",
        "done",
        "blocked",
        "cancelled",
      ],
    })
      .notNull()
      .default("queued"),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.id] }),
    uniqueIndex("agent_assignment_operation_idx").on(
      table.workspaceId,
      table.ownerId,
      table.operationKey,
    ),
    foreignKey({
      columns: [table.workspaceId, table.threadId],
      foreignColumns: [agentThreads.workspaceId, agentThreads.id],
    }),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }),
  ],
);

export const agentRuns = sqliteTable(
  "agent_runs",
  {
    ...resourceIdentity(),
    assignmentId: text("assignment_id").notNull(),
    status: text("status").$type<RunStatus>().notNull().default("queued"),
    checkpoint: text("checkpoint", {
      enum: ["prepared", "dispatching", "generated"],
    })
      .notNull()
      .default("prepared"),
    agentConfiguration: text("agent_configuration", { mode: "json" })
      .$type<AgentConfiguration>()
      .notNull(),
    sources: text("sources", { mode: "json" }).$type<RunSource[]>().notNull(),
    context: text("context").notNull(),
    provider: text("provider", {
      enum: ["deterministic", "openai-compatible"],
    }).notNull(),
    model: text("model").notNull(),
    providerFingerprint: text("provider_fingerprint").notNull(),
    limits: text("limits", { mode: "json" }).$type<RunLimits>().notNull(),
    requestId: text("request_id").notNull(),
    steps: integer("steps").notNull().default(0),
    attempt: integer("attempt").notNull().default(0),
    epoch: integer("epoch").notNull().default(0),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: integer("lease_expires_at", { mode: "timestamp_ms" }),
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }),
    eventSequence: integer("event_sequence").notNull().default(0),
    inputTokenUpperBound: integer("input_token_upper_bound").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    outputText: text("output_text").notNull().default(""),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    resultDocumentId: text("result_document_id"),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.id] }),
    uniqueIndex("agent_run_assignment_idx").on(
      table.workspaceId,
      table.assignmentId,
    ),
    index("agent_run_queue_idx").on(table.status, table.leaseExpiresAt),
    foreignKey({
      columns: [table.workspaceId, table.assignmentId],
      foreignColumns: [agentAssignments.workspaceId, agentAssignments.id],
    }),
    foreignKey({
      columns: [table.workspaceId, table.resultDocumentId],
      foreignColumns: [documents.workspaceId, documents.id],
    }),
  ],
);

export const agentMessages = sqliteTable(
  "agent_messages",
  {
    ...resourceIdentity(),
    threadId: text("thread_id").notNull(),
    runId: text("run_id").notNull(),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.id] }),
    uniqueIndex("agent_message_role_idx").on(
      table.workspaceId,
      table.runId,
      table.role,
    ),
    foreignKey({
      columns: [table.workspaceId, table.threadId],
      foreignColumns: [agentThreads.workspaceId, agentThreads.id],
    }),
    foreignKey({
      columns: [table.workspaceId, table.runId],
      foreignColumns: [agentRuns.workspaceId, agentRuns.id],
    }),
  ],
);

export const agentRunEvents = sqliteTable(
  "agent_run_events",
  {
    workspaceId: text("workspace_id").notNull(),
    runId: text("run_id").notNull(),
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(
        sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`,
      ),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.runId, table.sequence] }),
    foreignKey({
      columns: [table.workspaceId, table.runId],
      foreignColumns: [agentRuns.workspaceId, agentRuns.id],
    }),
  ],
);
