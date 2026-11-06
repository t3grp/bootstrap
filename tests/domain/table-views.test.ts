import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDatabase, schema, type DatabaseConnection } from "@bootstrap/db";
import {
  defaultTableViewSettings,
  resolveTableView,
  TABLE_VIEW_LIMITS,
  tableViewColumnBindings,
  type TableViewFilter,
  type TableViewSettings,
  type WorkspaceTable,
} from "@bootstrap/core";
import {
  createWorkspace,
  executeCommand,
} from "../../apps/web/src/lib/server/workspace";
import {
  createTableView,
  deleteTableView,
  getTableView,
  listTableViews,
  updateTableView,
} from "../../apps/web/src/lib/server/table-views";

const table: WorkspaceTable = {
  id: "table-fixture",
  name: "Leads",
  description: "",
  revision: 1,
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:00:00.000Z",
  columns: [
    { id: "name", name: "Name", type: "text" },
    { id: "amount", name: "Amount", type: "number" },
    { id: "due", name: "Due", type: "date" },
    { id: "done", name: "Done", type: "checkbox" },
    { id: "status", name: "Status", type: "select", options: ["New", "Done"] },
    { id: "link", name: "Link", type: "url" },
    { id: "attachment", name: "Attachment", type: "file" },
  ],
  rows: [
    {
      id: "a",
      cells: {
        name: "Alpha",
        amount: 10,
        due: "2026-11-06",
        done: false,
        status: "New",
        link: "https://example.test/a",
        attachment: null,
      },
    },
    {
      id: "b",
      cells: {
        name: "beta",
        amount: 0,
        due: null,
        done: false,
        status: "New",
        link: null,
        attachment: null,
      },
    },
    {
      id: "c",
      cells: {
        name: "Gamma",
        amount: 10,
        due: "2026-12-01",
        done: true,
        status: "Done",
        link: null,
        attachment: null,
      },
    },
    {
      id: "d",
      cells: {
        name: "",
        amount: null,
        due: null,
        done: null,
        status: null,
        link: null,
        attachment: null,
      },
    },
  ],
};
const settings = (
  patch: Partial<TableViewSettings> = {},
): TableViewSettings => ({ ...defaultTableViewSettings(), ...patch });
function resolved(next: TableViewSettings) {
  const result = resolveTableView(table, {
    settings: next,
    columnBindings: tableViewColumnBindings(next, table.columns),
  });
  if (result.status !== "ready") throw new Error(JSON.stringify(result.issues));
  return result;
}

describe("shared named-view presentation", () => {
  it("treats omitted cells as empty even for object-property-like column IDs", () => {
    const prototypeTable: WorkspaceTable = {
      ...table,
      columns: [{ id: "constructor", name: "Name", type: "text" }],
      rows: [
        { id: "empty", cells: {} },
        { id: "value", cells: { constructor: "Saved" } },
      ],
    };
    const result = resolveTableView(prototypeTable, {
      settings: settings({
        filters: [{ columnId: "constructor", operator: "is_empty" }],
      }),
      columnBindings: [{ columnId: "constructor", type: "text" }],
    });
    expect(result).toMatchObject({ status: "ready", rows: [{ id: "empty" }] });
  });

  it("projects columns, combines filters, sorts stably and leaves canonical rows untouched", () => {
    const before = structuredClone(table);
    const result = resolved(
      settings({
        visibleColumnIds: ["amount", "name"],
        sorts: [{ columnId: "amount", direction: "desc" }],
        filters: [
          { columnId: "amount", operator: "gte", value: 0 },
          { columnId: "done", operator: "eq", value: false },
        ],
      }),
    );
    expect(result.columns.map((column) => column.id)).toEqual([
      "amount",
      "name",
    ]);
    expect(result.rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(table).toEqual(before);
    for (const direction of ["asc", "desc"] as const) {
      const ids = resolved(
        settings({ sorts: [{ columnId: "amount", direction }] }),
      ).rows.map((row) => row.id);
      expect(ids).toEqual(
        direction === "asc" ? ["b", "a", "c", "d"] : ["a", "c", "b", "d"],
      );
    }
    expect(
      resolved(
        settings({
          sorts: [
            { columnId: "amount", direction: "desc" },
            { columnId: "name", direction: "desc" },
          ],
        }),
      ).rows.map((row) => row.id),
    ).toEqual(["c", "a", "b", "d"]);
  });

  it.each<[TableViewFilter, string[]]>([
    [{ columnId: "name", operator: "contains", value: "ALP" }, ["a"]],
    [{ columnId: "name", operator: "not_contains", value: "ALP" }, ["b", "c"]],
    [{ columnId: "name", operator: "eq", value: "alpha" }, []],
    [{ columnId: "status", operator: "neq", value: "New" }, ["c"]],
    [{ columnId: "due", operator: "lt", value: "2026-12-01" }, ["a"]],
    [{ columnId: "due", operator: "lte", value: "2026-12-01" }, ["a", "c"]],
    [{ columnId: "amount", operator: "gt", value: 0 }, ["a", "c"]],
    [{ columnId: "done", operator: "is_empty" }, ["d"]],
    [{ columnId: "amount", operator: "is_not_empty" }, ["a", "b", "c"]],
    [{ columnId: "attachment", operator: "is_empty" }, ["a", "b", "c", "d"]],
  ])("uses documented typed/empty semantics for %j", (filter, ids) => {
    expect(
      resolved(settings({ filters: [filter] })).rows.map((row) => row.id),
    ).toEqual(ids);
  });
});

describe("scoped named-view persistence", () => {
  const owner = {
    id: "view-owner",
    name: "Owner",
    email: "views@example.test",
  };
  const outsider = {
    id: "other-view-owner",
    name: "Other owner",
    email: "other-views@example.test",
  };
  let connection: DatabaseConnection,
    directory: string,
    workspaceId: string,
    otherWorkspace: string;
  const input = (
    patch: Partial<TableViewSettings> = {},
    id = randomUUID(),
  ) => ({
    id,
    tableId: table.id,
    tableRevision: 1,
    name: "Priority leads",
    settings: settings(patch),
  });
  const create = (patch: Partial<TableViewSettings> = {}) =>
    createTableView(connection.db, owner, workspaceId, input(patch));
  beforeAll(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "bootstrap-views-"));
    connection = await createDatabase({ directory });
    await connection.db.insert(schema.user).values([owner, outsider]);
  });
  beforeEach(async () => {
    workspaceId = await connection.db.atomic((tx) =>
      createWorkspace(tx, owner.id, "Named views"),
    );
    otherWorkspace = await connection.db.atomic((tx) =>
      createWorkspace(tx, outsider.id, "Private"),
    );
    await connection.db.insert(schema.businessTables).values({
      ...table,
      workspaceId,
      createdAt: new Date(table.createdAt),
      updatedAt: new Date(table.updatedAt),
    });
  });
  afterAll(async () => {
    await connection?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("keeps views independent, follows canonical row edits, and deletes only the view", async () => {
    expect(
      (await listTableViews(connection.db, owner, workspaceId, table.id)).views,
    ).toEqual([]);
    const first = await create({
      filters: [{ columnId: "status", operator: "eq", value: "New" }],
    });
    const second = await create({
      density: "compact",
      visibleColumnIds: ["name"],
    });
    const updated = await updateTableView(
      connection.db,
      owner,
      workspaceId,
      first.view.id,
      {
        revision: 1,
        tableRevision: 1,
        patch: { name: "Open leads" },
      },
    );
    expect(updated.view).toMatchObject({
      revision: 2,
      name: "Open leads",
      validatedTableRevision: 1,
    });
    expect(
      (await getTableView(connection.db, owner, workspaceId, second.view.id))
        .view,
    ).toEqual(second.view);
    await executeCommand(connection.db, owner, workspaceId, {
      type: "table.update",
      id: table.id,
      revision: 1,
      patch: {
        rows: [
          ...table.rows,
          { id: "e", cells: { name: "Delta", status: "New" } },
        ],
      },
    });
    for (const id of [first.view.id, second.view.id]) {
      const detail = await getTableView(connection.db, owner, workspaceId, id);
      expect(detail.table.rows).toHaveLength(5);
      expect(detail.view.status).toBe("ready");
    }
    await deleteTableView(connection.db, owner, workspaceId, first.view.id, {
      revision: 2,
    });
    const remaining = await listTableViews(
      connection.db,
      owner,
      workspaceId,
      table.id,
    );
    expect(remaining.views.map((view) => view.id)).toEqual([second.view.id]);
    expect(remaining.table.rows).toHaveLength(5);
    expect(remaining.table.revision).toBe(2);
  });

  it("enforces owner membership and workspace scope for every operation", async () => {
    const saved = await create();
    const ownedEmpty = await connection.db.atomic((tx) =>
      createWorkspace(tx, owner.id, "Other owned workspace"),
    );
    for (const [actor, workspace] of [
      [outsider, workspaceId],
      [owner, otherWorkspace],
      [owner, ownedEmpty],
    ] as const) {
      for (const operation of [
        () => listTableViews(connection.db, actor, workspace, table.id),
        () => getTableView(connection.db, actor, workspace, saved.view.id),
        () => createTableView(connection.db, actor, workspace, input()),
        () =>
          updateTableView(connection.db, actor, workspace, saved.view.id, {
            revision: 1,
            tableRevision: 1,
            patch: { name: "Intrusion" },
          }),
        () =>
          deleteTableView(connection.db, actor, workspace, saved.view.id, {
            revision: 1,
          }),
      ])
        await expect(operation()).rejects.toMatchObject({
          status: 404,
          code: "NOT_FOUND",
        });
    }
    // This release's schema only permits owner memberships.
    await expect(
      connection.db
        .insert(schema.memberships)
        .values({ userId: outsider.id, workspaceId, role: "viewer" }),
    ).rejects.toThrow();
    await expect(
      getTableView(connection.db, outsider, workspaceId, saved.view.id),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      (await getTableView(connection.db, owner, workspaceId, saved.view.id))
        .view,
    ).toEqual(saved.view);
  });

  it("rejects stale view and table revisions without overwriting the saved settings", async () => {
    const saved = await create();
    const winner = await updateTableView(
      connection.db,
      owner,
      workspaceId,
      saved.view.id,
      { revision: 1, tableRevision: 1, patch: { name: "Winner" } },
    );
    await expect(
      updateTableView(connection.db, owner, workspaceId, saved.view.id, {
        revision: 1,
        tableRevision: 1,
        patch: { name: "Stale draft" },
      }),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT", currentRevision: 2 });
    await expect(
      deleteTableView(connection.db, owner, workspaceId, saved.view.id, {
        revision: 1,
      }),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT", currentRevision: 2 });
    await executeCommand(connection.db, owner, workspaceId, {
      type: "table.update",
      id: table.id,
      revision: 1,
      patch: { description: "New table revision" },
    });
    await expect(
      updateTableView(connection.db, owner, workspaceId, saved.view.id, {
        revision: 2,
        tableRevision: 1,
        patch: { settings: settings({ wrapCells: true }) },
      }),
    ).rejects.toMatchObject({
      code: "TABLE_REVISION_CONFLICT",
      currentRevision: 2,
    });
    await expect(create()).rejects.toMatchObject({
      code: "TABLE_REVISION_CONFLICT",
      currentRevision: 2,
    });
    expect(
      (await getTableView(connection.db, owner, workspaceId, saved.view.id))
        .view,
    ).toEqual(winner.view);
  });

  it("preserves invalidated settings and requires an explicit repair after schema drift", async () => {
    const saved = await create({
      filters: [{ columnId: "status", operator: "eq", value: "New" }],
      visibleColumnIds: ["name", "status"],
    });
    await executeCommand(connection.db, owner, workspaceId, {
      type: "table.update",
      id: table.id,
      revision: 1,
      patch: {
        columns: table.columns.filter((column) => column.id !== "status"),
        rows: table.rows.map(
          ({ id, cells: { status: _status, ...cells } }) => ({ id, cells }),
        ),
      },
    });
    const stale = await getTableView(
      connection.db,
      owner,
      workspaceId,
      saved.view.id,
    );
    expect(stale.view).toMatchObject({
      status: "needs_attention",
      revision: 1,
      settings: saved.view.settings,
    });
    expect(resolveTableView(stale.table, stale.view)).toMatchObject({
      status: "needs_attention",
      issues: [{ code: "missing_column", columnId: "status" }],
    });
    expect(resolveTableView(stale.table, stale.view)).not.toHaveProperty(
      "rows",
    );
    const renamed = await updateTableView(
      connection.db,
      owner,
      workspaceId,
      saved.view.id,
      { revision: 1, tableRevision: 2, patch: { name: "Needs repair" } },
    );
    expect(renamed.view).toMatchObject({
      status: "needs_attention",
      validatedTableRevision: 1,
    });
    const repaired = await updateTableView(
      connection.db,
      owner,
      workspaceId,
      saved.view.id,
      { revision: 2, tableRevision: 2, patch: { settings: settings() } },
    );
    expect(repaired.view).toMatchObject({
      status: "ready",
      revision: 3,
      validatedTableRevision: 2,
      issues: [],
    });
  });

  it("detects column type and removed option changes even when identifiers survive", async () => {
    const byNumber = await create({
      sorts: [{ columnId: "amount", direction: "asc" }],
    });
    const byStatus = await create({
      filters: [{ columnId: "status", operator: "eq", value: "New" }],
    });
    await executeCommand(connection.db, owner, workspaceId, {
      type: "table.update",
      id: table.id,
      revision: 1,
      patch: {
        columns: table.columns.map((column) =>
          column.id === "amount"
            ? { ...column, type: "text" }
            : column.id === "status"
              ? { ...column, options: ["Done"] }
              : column,
        ),
        rows: [],
      },
    });
    expect(
      (await getTableView(connection.db, owner, workspaceId, byNumber.view.id))
        .view.issues,
    ).toContainEqual(expect.objectContaining({ code: "changed_column_type" }));
    expect(
      (await getTableView(connection.db, owner, workspaceId, byStatus.view.id))
        .view.issues,
    ).toContainEqual(expect.objectContaining({ code: "invalid_filter" }));
  });

  it("validates typed settings and shape before any mutation", async () => {
    const invalid: Partial<TableViewSettings>[] = [
      { visibleColumnIds: ["name", "name"] },
      { visibleColumnIds: ["foreign-column"] },
      {
        sorts: [
          { columnId: "name", direction: "asc" },
          { columnId: "name", direction: "desc" },
        ],
      },
      { sorts: [{ columnId: "attachment", direction: "asc" }] },
      { filters: [{ columnId: "amount", operator: "contains", value: "1" }] },
      { filters: [{ columnId: "amount", operator: "eq", value: "10" }] },
      { filters: [{ columnId: "due", operator: "eq", value: "2026-02-30" }] },
      { filters: [{ columnId: "status", operator: "eq", value: "Unknown" }] },
      { filters: [{ columnId: "done", operator: "eq", value: "false" }] },
      {
        filters: [
          { columnId: "attachment", operator: "eq", value: "foreign-file" },
        ],
      },
    ];
    for (const patch of invalid)
      await expect(create(patch)).rejects.toMatchObject({
        code: "INVALID_VIEW_SETTINGS",
      });
    for (const bad of [
      { ...input(), name: " " },
      { ...input(), unexpected: true },
      input({ visibleColumnIds: [] }),
      input({
        filters: Array.from({ length: 21 }, () => ({
          columnId: "name",
          operator: "is_empty" as const,
        })),
      }),
      input({
        filters: [
          { columnId: "name", operator: "contains", value: "a".repeat(1001) },
        ],
      }),
      input({
        filters: [{ columnId: "amount", operator: "eq", value: Infinity }],
      }),
    ])
      await expect(
        createTableView(connection.db, owner, workspaceId, bad),
      ).rejects.toMatchObject({ name: "ZodError" });
    expect(
      (await listTableViews(connection.db, owner, workspaceId, table.id)).views,
    ).toEqual([]);
    const saved = await create();
    await expect(
      updateTableView(connection.db, owner, workspaceId, saved.view.id, {
        revision: 1,
        tableRevision: 1,
        patch: { settings: settings(invalid[0]) },
      }),
    ).rejects.toMatchObject({ code: "INVALID_VIEW_SETTINGS" });
    expect(
      (await getTableView(connection.db, owner, workspaceId, saved.view.id))
        .view,
    ).toEqual(saved.view);
  });

  it("bounds views per table and prevents a retry from duplicating a creation", async () => {
    const original = input({}, "stable-attempt-id");
    await createTableView(connection.db, owner, workspaceId, original);
    await expect(
      createTableView(connection.db, owner, workspaceId, original),
    ).rejects.toMatchObject({ code: "VIEW_ID_EXISTS" });
    for (let i = 1; i < TABLE_VIEW_LIMITS.viewsPerTable; i++) await create();
    await expect(create()).rejects.toMatchObject({
      code: "VIEW_LIMIT_REACHED",
    });
    expect(
      (await listTableViews(connection.db, owner, workspaceId, table.id)).views,
    ).toHaveLength(TABLE_VIEW_LIMITS.viewsPerTable);
  });

  it("persists settings through database close/reopen and applies the migration once", async () => {
    const saved = await create({
      density: "compact",
      wrapCells: true,
      visibleColumnIds: ["status", "name"],
    });
    await connection.close();
    connection = await createDatabase({ directory });
    expect(
      await getTableView(connection.db, owner, workspaceId, saved.view.id),
    ).toEqual(saved);
    await connection.db
      .delete(schema.workspaces)
      .where(eq(schema.workspaces.id, workspaceId));
    expect(
      await connection.db
        .select()
        .from(schema.tableViews)
        .where(eq(schema.tableViews.workspaceId, workspaceId)),
    ).toEqual([]);
  });
});
