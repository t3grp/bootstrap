import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  TABLE_VIEW_LIMITS,
  tableViewColumnBindings,
  validateTableViewSettings,
  type NamedTableView,
  type TableViewCollection,
  type TableViewDetail,
  type TableViewSettings,
  type DeleteTableViewResult,
  type WorkspaceTable,
} from "@bootstrap/core";
import { schema, type Database, type QueryDatabase } from "@bootstrap/db";
import { AppError, conflict, notFound } from "./errors";
import { idSchema } from "./validation";
import { requireWorkspace, type Actor } from "./workspace";

const { businessTables, tableViews } = schema;
const revision = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER - 1);
const name = z.string().trim().min(1).max(TABLE_VIEW_LIMITS.name);
const textValue = z.string().max(TABLE_VIEW_LIMITS.filterText);
const filter = z.union([
  z
    .object({
      columnId: idSchema,
      operator: z.enum(["is_empty", "is_not_empty"]),
    })
    .strict(),
  z
    .object({
      columnId: idSchema,
      operator: z.enum(["eq", "neq"]),
      value: z.union([textValue, z.number(), z.boolean()]),
    })
    .strict(),
  z
    .object({
      columnId: idSchema,
      operator: z.enum(["contains", "not_contains"]),
      value: textValue,
    })
    .strict(),
  z
    .object({
      columnId: idSchema,
      operator: z.enum(["gt", "gte", "lt", "lte"]),
      value: z.union([textValue, z.number()]),
    })
    .strict(),
]);
const settingsSchema = z
  .object({
    layout: z.literal("table"),
    density: z.enum(["comfortable", "compact"]),
    wrapCells: z.boolean(),
    visibleColumnIds: z
      .array(idSchema)
      .min(1)
      .max(TABLE_VIEW_LIMITS.columns)
      .nullable(),
    sorts: z
      .array(
        z
          .object({ columnId: idSchema, direction: z.enum(["asc", "desc"]) })
          .strict(),
      )
      .max(TABLE_VIEW_LIMITS.sorts),
    filters: z.array(filter).max(TABLE_VIEW_LIMITS.filters),
  })
  .strict();
const createSchema = z
  .object({
    id: idSchema,
    tableId: idSchema,
    tableRevision: revision,
    name,
    settings: settingsSchema,
  })
  .strict();
const updateSchema = z
  .object({
    revision,
    tableRevision: revision,
    patch: z
      .object({ name: name.optional(), settings: settingsSchema.optional() })
      .strict()
      .refine(
        (patch) => patch.name !== undefined || patch.settings !== undefined,
        "Provide a name or complete settings.",
      ),
  })
  .strict();
const deleteSchema = z.object({ revision }).strict();

const viewScope = (workspaceId: string, id: string) =>
  and(eq(tableViews.workspaceId, workspaceId), eq(tableViews.id, id));

async function readTable(
  db: QueryDatabase,
  workspaceId: string,
  id: string,
): Promise<WorkspaceTable> {
  idSchema.parse(id);
  const [row] = await db
    .select()
    .from(businessTables)
    .where(
      and(
        eq(businessTables.workspaceId, workspaceId),
        eq(businessTables.id, id),
      ),
    );
  if (!row) throw notFound();
  const { workspaceId: _workspaceId, createdAt, updatedAt, ...table } = row;
  return {
    ...table,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

async function readView(db: QueryDatabase, workspaceId: string, id: string) {
  idSchema.parse(id);
  const [view] = await db
    .select()
    .from(tableViews)
    .where(viewScope(workspaceId, id));
  if (!view) throw notFound();
  return view;
}

function present(
  view: typeof tableViews.$inferSelect,
  table: WorkspaceTable,
): NamedTableView {
  const issues = validateTableViewSettings(
    view.settings,
    table.columns,
    view.columnBindings,
  );
  return {
    ...view,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
    status: issues.length ? "needs_attention" : "ready",
    issues,
  };
}

function checkTableRevision(table: WorkspaceTable, expected: number) {
  if (table.revision !== expected)
    throw new AppError(
      409,
      "The table changed. Keep your view draft, reload the table and review its columns before saving again.",
      "TABLE_REVISION_CONFLICT",
      table.revision,
    );
}

function checkSettings(settings: TableViewSettings, table: WorkspaceTable) {
  const issues = validateTableViewSettings(settings, table.columns);
  if (issues.length)
    throw new AppError(
      400,
      issues
        .slice(0, 3)
        .map((issue) => issue.message)
        .join(" "),
      "INVALID_VIEW_SETTINGS",
    );
}

export async function listTableViews(
  db: Database,
  actor: Actor,
  workspaceId: string,
  tableId: string,
): Promise<TableViewCollection> {
  return db.atomic(async (tx) => {
    await requireWorkspace(tx, actor.id, workspaceId);
    const table = await readTable(tx, workspaceId, tableId);
    const views = await tx
      .select()
      .from(tableViews)
      .where(
        and(
          eq(tableViews.workspaceId, workspaceId),
          eq(tableViews.tableId, tableId),
        ),
      )
      .orderBy(asc(tableViews.createdAt), asc(tableViews.id));
    return { table, views: views.map((view) => present(view, table)) };
  });
}

export async function getTableView(
  db: Database,
  actor: Actor,
  workspaceId: string,
  id: string,
): Promise<TableViewDetail> {
  return db.atomic(async (tx) => {
    await requireWorkspace(tx, actor.id, workspaceId);
    const view = await readView(tx, workspaceId, id);
    const table = await readTable(tx, workspaceId, view.tableId);
    return { table, view: present(view, table) };
  });
}

export async function createTableView(
  db: Database,
  actor: Actor,
  workspaceId: string,
  raw: unknown,
): Promise<TableViewDetail> {
  const input = createSchema.parse(raw);
  return db.atomic(async (tx) => {
    await requireWorkspace(tx, actor.id, workspaceId);
    const table = await readTable(tx, workspaceId, input.tableId);
    checkTableRevision(table, input.tableRevision);
    checkSettings(input.settings, table);
    const [existing] = await tx
      .select({ id: tableViews.id })
      .from(tableViews)
      .where(viewScope(workspaceId, input.id));
    if (existing)
      throw new AppError(
        409,
        "This view ID already exists. Reload it to confirm the saved state before starting a new creation attempt.",
        "VIEW_ID_EXISTS",
      );
    const views = await tx
      .select({ id: tableViews.id })
      .from(tableViews)
      .where(
        and(
          eq(tableViews.workspaceId, workspaceId),
          eq(tableViews.tableId, input.tableId),
        ),
      );
    if (views.length >= TABLE_VIEW_LIMITS.viewsPerTable)
      throw new AppError(
        400,
        `A table can have at most ${TABLE_VIEW_LIMITS.viewsPerTable} saved views.`,
        "VIEW_LIMIT_REACHED",
      );
    const now = new Date();
    const view: typeof tableViews.$inferSelect = {
      id: input.id,
      workspaceId,
      tableId: input.tableId,
      name: input.name,
      settings: input.settings,
      columnBindings: tableViewColumnBindings(input.settings, table.columns),
      revision: 1,
      validatedTableRevision: table.revision,
      createdAt: now,
      updatedAt: now,
    };
    await tx.insert(tableViews).values(view);
    return { table, view: present(view, table) };
  });
}

export async function updateTableView(
  db: Database,
  actor: Actor,
  workspaceId: string,
  id: string,
  raw: unknown,
): Promise<TableViewDetail> {
  const input = updateSchema.parse(raw);
  return db.atomic(async (tx) => {
    await requireWorkspace(tx, actor.id, workspaceId);
    const saved = await readView(tx, workspaceId, id);
    if (saved.revision !== input.revision) throw conflict(saved.revision);
    const table = await readTable(tx, workspaceId, saved.tableId);
    checkTableRevision(table, input.tableRevision);
    if (input.patch.settings) checkSettings(input.patch.settings, table);
    const view: typeof tableViews.$inferSelect = {
      ...saved,
      ...input.patch,
      ...(input.patch.settings
        ? {
            columnBindings: tableViewColumnBindings(
              input.patch.settings,
              table.columns,
            ),
            validatedTableRevision: table.revision,
          }
        : {}),
      revision: saved.revision + 1,
      updatedAt: new Date(),
    };
    await tx
      .update(tableViews)
      .set({
        name: view.name,
        settings: view.settings,
        columnBindings: view.columnBindings,
        revision: view.revision,
        validatedTableRevision: view.validatedTableRevision,
        updatedAt: view.updatedAt,
      })
      .where(
        and(
          viewScope(workspaceId, id),
          eq(tableViews.revision, input.revision),
        ),
      );
    return { table, view: present(view, table) };
  });
}

export async function deleteTableView(
  db: Database,
  actor: Actor,
  workspaceId: string,
  id: string,
  raw: unknown,
): Promise<DeleteTableViewResult> {
  const input = deleteSchema.parse(raw);
  return db.atomic(async (tx) => {
    await requireWorkspace(tx, actor.id, workspaceId);
    const saved = await readView(tx, workspaceId, id);
    if (saved.revision !== input.revision) throw conflict(saved.revision);
    await tx
      .delete(tableViews)
      .where(
        and(
          viewScope(workspaceId, id),
          eq(tableViews.revision, input.revision),
        ),
      );
    return { id, deleted: true };
  });
}
