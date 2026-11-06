import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
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
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
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
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_provider_identity_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const instance = pgTable("instance", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberships = pgTable(
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    ...resourceIdentity(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#71717a"),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

export const documents = pgTable(
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
    favorite: boolean("favorite").notNull().default(false),
    fullWidth: boolean("full_width").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
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

export const documentVersions = pgTable(
  "document_versions",
  {
    workspaceId: text("workspace_id").notNull(),
    documentId: text("document_id").notNull(),
    revision: integer("revision").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    content: jsonb("content").$type<PageContent>().notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

export const tasks = pgTable(
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

export const businessTables = pgTable(
  "business_tables",
  {
    ...resourceIdentity(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    revision: integer("revision").notNull().default(1),
    columns: jsonb("columns").$type<TableColumn[]>().notNull(),
    rows: jsonb("rows").$type<TableRow[]>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

export const files = pgTable(
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

export const agents = pgTable(
  "agents",
  {
    ...resourceIdentity(),
    name: text("name").notNull(),
    role: text("role").notNull().default(""),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#6366f1"),
    instructions: text("instructions").notNull().default(""),
    skills: jsonb("skills").$type<Agent["skills"]>().notNull().default([]),
    routines: jsonb("routines")
      .$type<Agent["routines"]>()
      .notNull()
      .default([]),
    memories: jsonb("memories")
      .$type<Agent["memories"]>()
      .notNull()
      .default([]),
    fileIds: jsonb("file_ids").$type<string[]>().notNull().default([]),
    tableIds: jsonb("table_ids").$type<string[]>().notNull().default([]),
    pageIds: jsonb("page_ids").$type<string[]>().notNull().default([]),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.id] })],
);

// History deliberately survives agent deletion. The worker always resolves the live agent
// again before dispatch; a historical agent ID is never an authorization credential.
export const agentThreads = pgTable(
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

export const agentAssignments = pgTable(
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

export const agentRuns = pgTable(
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
    agentConfiguration: jsonb("agent_configuration")
      .$type<AgentConfiguration>()
      .notNull(),
    sources: jsonb("sources").$type<RunSource[]>().notNull(),
    context: text("context").notNull(),
    provider: text("provider", {
      enum: ["deterministic", "openai-compatible"],
    }).notNull(),
    model: text("model").notNull(),
    providerFingerprint: text("provider_fingerprint").notNull(),
    limits: jsonb("limits").$type<RunLimits>().notNull(),
    requestId: text("request_id").notNull(),
    steps: integer("steps").notNull().default(0),
    attempt: integer("attempt").notNull().default(0),
    epoch: integer("epoch").notNull().default(0),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    eventSequence: integer("event_sequence").notNull().default(0),
    inputTokenUpperBound: integer("input_token_upper_bound").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    outputText: text("output_text").notNull().default(""),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    resultDocumentId: text("result_document_id"),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
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

export const agentMessages = pgTable(
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

export const agentRunEvents = pgTable(
  "agent_run_events",
  {
    workspaceId: text("workspace_id").notNull(),
    runId: text("run_id").notNull(),
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.runId, table.sequence] }),
    foreignKey({
      columns: [table.workspaceId, table.runId],
      foreignColumns: [agentRuns.workspaceId, agentRuns.id],
    }),
  ],
);
