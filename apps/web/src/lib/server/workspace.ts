import { randomUUID } from "node:crypto";
import { and, asc, count, eq } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import {
  schema,
  type Database,
  type QueryDatabase,
  type Transaction,
} from "@bootstrap/db";
import type {
  PageContent,
  WorkspaceCommand,
  WorkspaceSnapshot,
} from "@bootstrap/core";
import { AppError, conflict, notFound } from "./errors";
import {
  idSchema,
  LIMITS,
  pageReferences,
  parseCommand,
  validateTable,
} from "./validation";

const {
  user,
  instance,
  workspaces,
  memberships,
  projects,
  documents,
  documentVersions,
  tasks,
  businessTables,
  files,
  agents,
} = schema;
export type Actor = { id: string; name: string; email: string };
const scope = <
  T extends {
    workspaceId: AnySQLiteColumn<{ data: string }>;
    id: AnySQLiteColumn<{ data: string }>;
  },
>(
  table: T,
  workspaceId: string,
  id: string,
) => and(eq(table.workspaceId, workspaceId), eq(table.id, id));
const iso = (date: Date) => date.toISOString();

export async function requireWorkspace(
  db: QueryDatabase,
  userId: string,
  workspaceId: string,
) {
  idSchema.parse(workspaceId);
  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.userId, userId),
      ),
    )
    .limit(1);
  if (!membership || membership.role !== "owner") throw notFound();
}

export async function lockWorkspace(
  tx: Transaction,
  userId: string,
  workspaceId: string,
) {
  await requireWorkspace(tx, userId, workspaceId);
  const [workspace] = await tx
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!workspace) throw notFound();
}

function paragraph(text: string) {
  return {
    type: "paragraph",
    attrs: { id: randomUUID() },
    content: text ? [{ type: "text", text }] : [],
  };
}
export function emptyDocument(): PageContent {
  return { type: "doc", content: [paragraph("")] };
}

/** Real editable onboarding content; no simulated business activity or agent progress. */
export async function createWorkspace(
  tx: Transaction,
  userId: string,
  name: string,
) {
  const id = randomUUID();
  await tx.insert(workspaces).values({ id, name });
  await tx
    .insert(memberships)
    .values({ workspaceId: id, userId, role: "owner" });
  const pageId = randomUUID();
  const content: PageContent = {
    type: "doc",
    content: [
      paragraph(
        "A little room for your next big thing. Bring your plans, customers, and everyday work together here.",
      ),
      {
        type: "heading",
        attrs: { id: randomUUID(), level: 2 },
        content: [{ type: "text", text: "Make this workspace yours" }],
      },
      paragraph(
        "Start writing, or type / to add a heading, checklist, callout, or linked table. Create pages inside pages to organize your ideas.",
      ),
      {
        type: "taskList",
        attrs: { id: randomUUID() },
        content: [
          {
            type: "taskItem",
            attrs: { id: randomUUID(), checked: false },
            content: [paragraph("Write down what you are building")],
          },
          {
            type: "taskItem",
            attrs: { id: randomUUID(), checked: false },
            content: [paragraph("Create a project and choose your next task")],
          },
          {
            type: "taskItem",
            attrs: { id: randomUUID(), checked: false },
            content: [
              paragraph("Add a table for customers, ideas, or research"),
            ],
          },
        ],
      },
      {
        type: "callout",
        attrs: { id: randomUUID() },
        content: [
          paragraph(
            "Your workspace works without an AI key. Agent profiles can be prepared in Team; execution and app connections arrive in a later milestone.",
          ),
        ],
      },
    ],
  };
  await tx.insert(documents).values({
    id: pageId,
    workspaceId: id,
    title: "Welcome to your workspace",
    icon: "✦",
    favorite: true,
  });
  await tx.insert(documentVersions).values({
    workspaceId: id,
    documentId: pageId,
    revision: 1,
    content,
    authorId: userId,
  });
  return id;
}

export async function getSnapshot(
  db: Database,
  actor: Actor,
  requestedWorkspaceId?: string,
): Promise<WorkspaceSnapshot> {
  const owned = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
    })
    .from(workspaces)
    .innerJoin(
      memberships,
      and(
        eq(workspaces.id, memberships.workspaceId),
        eq(memberships.userId, actor.id),
      ),
    )
    .orderBy(asc(workspaces.createdAt));
  const workspaceId = requestedWorkspaceId || owned[0]?.id;
  const workspace = owned.find((item) => item.id === workspaceId);
  if (!workspace || !workspaceId) throw notFound();
  const [projectRows, pageRows, taskRows, tableRows, fileRows, agentRows] =
    await Promise.all([
      db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId))
        .orderBy(asc(projects.createdAt)),
      db
        .select({ page: documents, version: documentVersions })
        .from(documents)
        .innerJoin(
          documentVersions,
          and(
            eq(documents.workspaceId, documentVersions.workspaceId),
            eq(documents.id, documentVersions.documentId),
            eq(documents.revision, documentVersions.revision),
          ),
        )
        .where(eq(documents.workspaceId, workspaceId))
        .orderBy(asc(documents.sortOrder), asc(documents.createdAt)),
      db
        .select()
        .from(tasks)
        .where(eq(tasks.workspaceId, workspaceId))
        .orderBy(asc(tasks.createdAt)),
      db
        .select()
        .from(businessTables)
        .where(eq(businessTables.workspaceId, workspaceId))
        .orderBy(asc(businessTables.createdAt)),
      db
        .select()
        .from(files)
        .where(eq(files.workspaceId, workspaceId))
        .orderBy(asc(files.createdAt)),
      db
        .select()
        .from(agents)
        .where(eq(agents.workspaceId, workspaceId))
        .orderBy(asc(agents.createdAt)),
    ]);
  return {
    user: actor,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      createdAt: iso(workspace.createdAt),
    },
    workspaces: owned.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: iso(item.createdAt),
    })),
    projects: projectRows.map(({ workspaceId: _workspaceId, ...row }) => ({
      ...row,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
    pages: pageRows.map(
      ({
        page: {
          workspaceId: _workspaceId,
          trashBatchId: _trashBatchId,
          ...page
        },
        version,
      }) => ({
        ...page,
        content: version.content,
        trashedAt: page.trashedAt ? iso(page.trashedAt) : null,
        createdAt: iso(page.createdAt),
        updatedAt: iso(page.updatedAt),
      }),
    ),
    tasks: taskRows.map(({ workspaceId: _workspaceId, ...row }) => ({
      ...row,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
    tables: tableRows.map(({ workspaceId: _workspaceId, ...row }) => ({
      ...row,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
    files: fileRows.map((row) => ({
      id: row.id,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: iso(row.createdAt),
    })),
    agents: agentRows.map(({ workspaceId: _workspaceId, ...row }) => ({
      ...row,
      status: "configured" as const,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  };
}

async function activePage(
  tx: QueryDatabase,
  workspaceId: string,
  id: string,
  allowTrash = false,
) {
  const [page] = await tx
    .select()
    .from(documents)
    .where(scope(documents, workspaceId, id))
    .limit(1);
  if (!page || (!allowTrash && page.trashedAt)) throw notFound();
  return page;
}

async function projectExists(
  tx: QueryDatabase,
  workspaceId: string,
  id: string | null | undefined,
) {
  if (!id) return;
  if (
    !(
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(scope(projects, workspaceId, id))
        .limit(1)
    ).length
  )
    throw notFound();
}

async function resourceExists(
  tx: QueryDatabase,
  workspaceId: string,
  kind: "file" | "table" | "page",
  id: string,
) {
  if (kind === "page") {
    await activePage(tx, workspaceId, id);
    return;
  }
  const table = kind === "file" ? files : businessTables;
  const found = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.workspaceId, workspaceId), eq(table.id, id)))
    .limit(1);
  if (!found.length) throw notFound();
}

async function validAssignee(
  tx: QueryDatabase,
  workspaceId: string,
  value: string,
) {
  if (value === "me" || value === "unassigned") return;
  idSchema.parse(value);
  if (
    !(
      await tx
        .select({ id: agents.id })
        .from(agents)
        .where(scope(agents, workspaceId, value))
        .limit(1)
    ).length
  )
    throw notFound();
}

async function roomFor(
  tx: QueryDatabase,
  workspaceId: string,
  kind: "page" | "project" | "task" | "table" | "file" | "agent",
) {
  const table = {
    page: documents,
    project: projects,
    task: tasks,
    table: businessTables,
    file: files,
    agent: agents,
  }[kind];
  const [{ total }] = await tx
    .select({ total: count() })
    .from(table)
    .where(eq(table.workspaceId, workspaceId));
  if (total >= LIMITS.resources)
    throw new AppError(
      400,
      `This workspace has reached the initial limit of ${LIMITS.resources} ${kind} items.`,
      "CAPACITY_LIMIT",
    );
}

async function documentContent(
  tx: QueryDatabase,
  workspaceId: string,
  id: string,
  revision: number,
) {
  const [version] = await tx
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.workspaceId, workspaceId),
        eq(documentVersions.documentId, id),
        eq(documentVersions.revision, revision),
      ),
    )
    .limit(1);
  if (!version) throw notFound();
  return version.content;
}

async function reviseDocument(
  tx: Transaction,
  actorId: string,
  workspaceId: string,
  page: typeof documents.$inferSelect,
  changes: Partial<typeof documents.$inferInsert>,
  content: PageContent,
) {
  const revision = page.revision + 1;
  await tx
    .update(documents)
    .set({ ...changes, revision, updatedAt: new Date() })
    .where(
      and(
        scope(documents, workspaceId, page.id),
        eq(documents.revision, page.revision),
      ),
    );
  await tx.insert(documentVersions).values({
    workspaceId,
    documentId: page.id,
    revision,
    content,
    authorId: actorId,
  });
}

async function pageContents(
  tx: QueryDatabase,
  workspaceId: string,
  pages: (typeof documents.$inferSelect)[],
) {
  const contents = new Map(
    await Promise.all(
      pages.map(
        async (page) =>
          [
            page.id,
            await documentContent(tx, workspaceId, page.id, page.revision),
          ] as const,
      ),
    ),
  );
  if (Buffer.byteLength(JSON.stringify([...contents.values()])) > 4_000_000)
    throw new AppError(
      413,
      "This change includes too much page content. Move or restore smaller groups of pages.",
      "BATCH_TOO_LARGE",
    );
  return contents;
}

function descendantIds(all: (typeof documents.$inferSelect)[], id: string) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const page of all)
      if (page.parentId && ids.has(page.parentId) && !ids.has(page.id)) {
        ids.add(page.id);
        changed = true;
      }
  }
  return ids;
}

/** Reads are validated again by the atomic D1 batch before any mutation commits. */
export async function executeCommand(
  db: Database,
  actor: Actor,
  workspaceId: string,
  input: unknown,
) {
  const command = parseCommand(input);
  idSchema.parse(workspaceId);
  const resultWorkspace = await db.atomic(async (tx) => {
    await lockWorkspace(tx, actor.id, workspaceId);
    const now = new Date();
    switch (command.type) {
      case "workspace.create": {
        const [owner] = await tx
          .select()
          .from(instance)
          .where(
            and(eq(instance.id, "primary"), eq(instance.ownerId, actor.id)),
          );
        if (!owner) throw notFound();
        const [{ total }] = await tx
          .select({ total: count() })
          .from(memberships)
          .where(eq(memberships.userId, actor.id));
        if (total >= 25)
          throw new AppError(
            400,
            "This instance supports up to 25 workspaces.",
            "CAPACITY_LIMIT",
          );
        return createWorkspace(tx, actor.id, command.name);
      }
      case "workspace.rename":
        await tx
          .update(workspaces)
          .set({ name: command.name })
          .where(eq(workspaces.id, workspaceId));
        break;
      case "project.create":
        await roomFor(tx, workspaceId, "project");
        await tx.insert(projects).values({
          id: randomUUID(),
          workspaceId,
          name: command.name,
          description: command.description ?? "",
          color: command.color ?? "#818cf8",
        });
        break;
      case "project.update": {
        if (
          !(
            await tx
              .select({ id: projects.id })
              .from(projects)
              .where(scope(projects, workspaceId, command.id))
          ).length
        )
          throw notFound();
        await tx
          .update(projects)
          .set({ ...command.patch, updatedAt: now })
          .where(scope(projects, workspaceId, command.id));
        break;
      }
      case "page.create": {
        await roomFor(tx, workspaceId, "page");
        const parent = command.parentId
          ? await activePage(tx, workspaceId, command.parentId)
          : undefined;
        const projectId =
          command.projectId === undefined
            ? (parent?.projectId ?? null)
            : command.projectId;
        await projectExists(tx, workspaceId, projectId);
        if (parent && projectId !== parent.projectId)
          throw new AppError(
            400,
            "Nested pages must belong to the same project as their parent.",
          );
        const [{ total }] = await tx
          .select({ total: count() })
          .from(documents)
          .where(eq(documents.workspaceId, workspaceId));
        const id = randomUUID();
        await tx.insert(documents).values({
          id,
          workspaceId,
          title: command.title?.trim() || "Untitled",
          parentId: parent?.id ?? null,
          projectId,
          kind: command.kind ?? "page",
          sortOrder: total,
        });
        await tx.insert(documentVersions).values({
          workspaceId,
          documentId: id,
          revision: 1,
          content: emptyDocument(),
          authorId: actor.id,
        });
        break;
      }
      case "page.update": {
        const page = await activePage(tx, workspaceId, command.id);
        if (page.revision !== command.revision) throw conflict(page.revision);
        const { content, ...metadata } = command.patch;
        const all = await tx
          .select()
          .from(documents)
          .where(eq(documents.workspaceId, workspaceId));
        const descendants = descendantIds(all, page.id);
        const parentId =
          metadata.parentId === undefined ? page.parentId : metadata.parentId;
        if (parentId && descendants.has(parentId))
          throw new AppError(
            400,
            "A page cannot be moved inside itself or one of its children.",
            "PAGE_CYCLE",
          );
        const parent = parentId
          ? await activePage(tx, workspaceId, parentId)
          : undefined;
        const projectId =
          metadata.projectId === undefined
            ? metadata.parentId === undefined
              ? page.projectId
              : (parent?.projectId ?? page.projectId)
            : metadata.projectId;
        await projectExists(tx, workspaceId, projectId);
        if (parent && projectId !== parent.projectId)
          throw new AppError(
            400,
            "Nested pages must belong to the same project as their parent.",
          );
        if (content) {
          // A deleted attachment or trashed child stays a non-disclosing placeholder. It must not
          // prevent saving unrelated writing; only newly introduced references need resolution.
          const prior = new Set(
            pageReferences(
              await documentContent(tx, workspaceId, page.id, page.revision),
            ).map((reference) => `${reference.type}:${reference.id}`),
          );
          for (const reference of pageReferences(content))
            if (!prior.has(`${reference.type}:${reference.id}`))
              await resourceExists(
                tx,
                workspaceId,
                reference.type,
                reference.id,
              );
        }
        const changedChildren =
          projectId !== page.projectId
            ? all.filter(
                (child) => child.id !== page.id && descendants.has(child.id),
              )
            : [];
        const previousContent = await pageContents(tx, workspaceId, [
          page,
          ...changedChildren,
        ]);
        await reviseDocument(
          tx,
          actor.id,
          workspaceId,
          page,
          {
            ...metadata,
            title:
              metadata.title === undefined
                ? page.title
                : metadata.title.trim() || "Untitled",
            projectId,
          },
          content ?? previousContent.get(page.id)!,
        );
        for (const child of changedChildren)
          await reviseDocument(
            tx,
            actor.id,
            workspaceId,
            child,
            { projectId },
            previousContent.get(child.id)!,
          );
        break;
      }
      case "page.trash": {
        const page = await activePage(tx, workspaceId, command.id);
        if (page.revision !== command.revision) throw conflict(page.revision);
        const all = await tx
          .select()
          .from(documents)
          .where(eq(documents.workspaceId, workspaceId));
        const ids = descendantIds(all, page.id);
        const trashBatchId = randomUUID();
        const changed = all.filter(
          (item) => ids.has(item.id) && !item.trashedAt,
        );
        const previousContent = await pageContents(tx, workspaceId, changed);
        for (const item of changed)
          await reviseDocument(
            tx,
            actor.id,
            workspaceId,
            item,
            { trashedAt: now, trashBatchId },
            previousContent.get(item.id)!,
          );
        break;
      }
      case "page.restore": {
        const page = await activePage(tx, workspaceId, command.id, true);
        if (page.revision !== command.revision) throw conflict(page.revision);
        if (!page.trashedAt) break;
        const all = await tx
          .select()
          .from(documents)
          .where(eq(documents.workspaceId, workspaceId));
        const ids = descendantIds(all, page.id);
        if (
          page.parentId &&
          all.find((item) => item.id === page.parentId)?.trashedAt
        )
          throw new AppError(
            400,
            "Restore the parent page first.",
            "PARENT_IN_TRASH",
          );
        const changed = all.filter(
          (item) => ids.has(item.id) && item.trashBatchId === page.trashBatchId,
        );
        const previousContent = await pageContents(tx, workspaceId, changed);
        for (const item of changed)
          await reviseDocument(
            tx,
            actor.id,
            workspaceId,
            item,
            { trashedAt: null, trashBatchId: null },
            previousContent.get(item.id)!,
          );
        break;
      }
      case "task.create":
        await roomFor(tx, workspaceId, "task");
        await projectExists(tx, workspaceId, command.projectId);
        await validAssignee(tx, workspaceId, command.assignee ?? "me");
        await tx.insert(tasks).values({
          id: randomUUID(),
          workspaceId,
          title: command.title,
          projectId: command.projectId ?? null,
          dueDate: command.dueDate ?? null,
          assignee: command.assignee ?? "me",
        });
        break;
      case "task.update": {
        await projectExists(tx, workspaceId, command.patch.projectId);
        if (command.patch.assignee !== undefined)
          await validAssignee(tx, workspaceId, command.patch.assignee);
        if (
          !(
            await tx
              .select({ id: tasks.id })
              .from(tasks)
              .where(scope(tasks, workspaceId, command.id))
          ).length
        )
          throw notFound();
        await tx
          .update(tasks)
          .set({ ...command.patch, updatedAt: now })
          .where(scope(tasks, workspaceId, command.id));
        break;
      }
      case "task.delete": {
        if (
          !(
            await tx
              .select({ id: tasks.id })
              .from(tasks)
              .where(scope(tasks, workspaceId, command.id))
          ).length
        )
          throw notFound();
        await tx.delete(tasks).where(scope(tasks, workspaceId, command.id));
        break;
      }
      case "table.create":
        await roomFor(tx, workspaceId, "table");
        await tx.insert(businessTables).values({
          id: randomUUID(),
          workspaceId,
          name: command.name,
          columns: [
            { id: randomUUID(), name: "Name", type: "text" },
            {
              id: randomUUID(),
              name: "Status",
              type: "select",
              options: ["New", "In progress", "Done"],
            },
          ],
          rows: [],
        });
        break;
      case "table.update": {
        const [table] = await tx
          .select()
          .from(businessTables)
          .where(scope(businessTables, workspaceId, command.id));
        if (!table) throw notFound();
        if (table.revision !== command.revision) throw conflict(table.revision);
        const columns = command.patch.columns ?? table.columns;
        const rows = command.patch.rows ?? table.rows;
        const priorFileIds = new Set(
          table.columns
            .filter((column) => column.type === "file")
            .flatMap((column) =>
              table.rows
                .map((row) => row.cells[column.id])
                .filter(
                  (value): value is string =>
                    typeof value === "string" && value.length > 0,
                ),
            ),
        );
        for (const id of validateTable(columns, rows))
          if (!priorFileIds.has(id))
            await resourceExists(tx, workspaceId, "file", id);
        await tx
          .update(businessTables)
          .set({
            ...command.patch,
            columns,
            rows,
            revision: table.revision + 1,
            updatedAt: now,
          })
          .where(
            and(
              scope(businessTables, workspaceId, command.id),
              eq(businessTables.revision, command.revision),
            ),
          );
        break;
      }
      case "agent.create":
        await roomFor(tx, workspaceId, "agent");
        await tx.insert(agents).values({
          id: randomUUID(),
          workspaceId,
          name: command.name,
          role: command.role ?? "",
          description: command.description ?? "",
        });
        break;
      case "agent.update": {
        const [prior] = await tx
          .select()
          .from(agents)
          .where(scope(agents, workspaceId, command.id));
        if (!prior) throw notFound();
        if (
          Buffer.byteLength(JSON.stringify({ ...prior, ...command.patch })) >
          LIMITS.agentBytes
        )
          throw new AppError(
            400,
            "This agent exceeds the 1 MB configuration limit.",
            "CAPACITY_LIMIT",
          );
        for (const id of command.patch.fileIds ?? [])
          if (!prior.fileIds.includes(id))
            await resourceExists(tx, workspaceId, "file", id);
        for (const id of command.patch.tableIds ?? [])
          if (!prior.tableIds.includes(id))
            await resourceExists(tx, workspaceId, "table", id);
        for (const id of command.patch.pageIds ?? [])
          if (!prior.pageIds.includes(id))
            await resourceExists(tx, workspaceId, "page", id);
        if (
          !(
            await tx
              .select({ id: agents.id })
              .from(agents)
              .where(scope(agents, workspaceId, command.id))
          ).length
        )
          throw notFound();
        await tx
          .update(agents)
          .set({ ...command.patch, updatedAt: now })
          .where(scope(agents, workspaceId, command.id));
        break;
      }
      case "agent.delete": {
        if (
          !(
            await tx
              .select({ id: agents.id })
              .from(agents)
              .where(scope(agents, workspaceId, command.id))
          ).length
        )
          throw notFound();
        await tx.delete(agents).where(scope(agents, workspaceId, command.id));
        await tx
          .update(tasks)
          .set({ assignee: "unassigned", updatedAt: now })
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              eq(tasks.assignee, command.id),
            ),
          );
        break;
      }
      case "file.delete": {
        // Logical deletion immediately removes download authorization. Storage cleanup is handled after commit.
        if (
          !(
            await tx
              .select({ id: files.id })
              .from(files)
              .where(scope(files, workspaceId, command.id))
          ).length
        )
          throw notFound();
        await tx.delete(files).where(scope(files, workspaceId, command.id));
        break;
      }
      default: {
        const exhaustive: never = command;
        throw new Error(`Unknown command: ${exhaustive}`);
      }
    }
    return workspaceId;
  });
  return getSnapshot(db, actor, resultWorkspace);
}

export async function getPrivateFile(
  db: Database,
  actor: Actor,
  workspaceId: string,
  id: string,
) {
  await requireWorkspace(db, actor.id, workspaceId);
  idSchema.parse(id);
  const [file] = await db
    .select()
    .from(files)
    .where(scope(files, workspaceId, id))
    .limit(1);
  if (!file) throw notFound();
  return file;
}

export async function addPrivateFile(
  db: Database,
  actor: Actor,
  workspaceId: string,
  file: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    storageKey: string;
    sha256: string;
  },
) {
  await db.atomic(async (tx) => {
    await lockWorkspace(tx, actor.id, workspaceId);
    await roomFor(tx, workspaceId, "file");
    await tx.insert(files).values({ workspaceId, ...file });
  });
}

export async function ownerExists(db: QueryDatabase) {
  return Boolean(
    (
      await db
        .select({ id: instance.id })
        .from(instance)
        .where(eq(instance.id, "primary"))
        .limit(1)
    ).length,
  );
}

export async function actorExists(db: Database, actorId: string) {
  const [actor] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  return actor;
}
