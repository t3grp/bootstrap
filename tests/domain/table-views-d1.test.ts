import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { defaultTableViewSettings } from "@bootstrap/core";
import { createDatabase, schema, type DatabaseConnection } from "@bootstrap/db";
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
import { startD1 } from "../helpers/d1";

describe("named views on the real D1 adapter", () => {
  let runtime: Awaited<ReturnType<typeof startD1>>;
  let a: DatabaseConnection, b: DatabaseConnection, workspaceId: string;
  const owner = {
    id: "d1-view-owner",
    name: "D1 owner",
    email: "d1-views@example.test",
  };
  const input = () => ({
    id: randomUUID(),
    tableId: "leads",
    tableRevision: 1,
    name: "Open leads",
    settings: {
      ...defaultTableViewSettings(),
      filters: [
        { columnId: "name", operator: "contains" as const, value: "Founder" },
      ],
    },
  });
  const version = async () =>
    (await runtime.binding
      .prepare("SELECT version FROM bootstrap_database_revision WHERE id = 1")
      .first<number>("version"))!;
  beforeAll(async () => {
    runtime = await startD1();
    a = await createDatabase({ transport: runtime.transport });
    b = await createDatabase({ transport: runtime.transport });
    await a.db.insert(schema.user).values(owner);
  });
  beforeEach(async () => {
    await a.db.delete(schema.workspaces);
    workspaceId = await a.db.atomic((tx) =>
      createWorkspace(tx, owner.id, "D1 views"),
    );
    await a.db.insert(schema.businessTables).values({
      id: "leads",
      workspaceId,
      name: "Leads",
      columns: [{ id: "name", name: "Name", type: "text" }],
      rows: [{ id: "one", cells: { name: "Founder" } }],
    });
  });
  afterAll(async () => {
    await a?.close();
    await b?.close();
    await runtime?.close();
  });

  it("allows one winner for concurrent writes to the same view revision", async () => {
    const { view } = await createTableView(a.db, owner, workspaceId, input());
    const results = await Promise.allSettled(
      [a, b].map((connection, index) =>
        updateTableView(connection.db, owner, workspaceId, view.id, {
          revision: 1,
          tableRevision: 1,
          patch: { name: `Writer ${index}` },
        }),
      ),
    );
    const winners = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");
    expect(winners).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toMatchObject({
      code: "REVISION_CONFLICT",
      currentRevision: 2,
    });
    expect(
      (await getTableView(b.db, owner, workspaceId, view.id)).view,
    ).toEqual(winners[0].value.view);
  });

  it("revalidates after a table changes between a view plan and its guarded commit", async () => {
    const saved = await createTableView(a.db, owner, workspaceId, input());
    let interleaved = false;
    const connection = await createDatabase({
      transport: {
        ...runtime.transport,
        batch: async (statements) => {
          if (
            !interleaved &&
            statements.some((statement) =>
              statement.sql.startsWith('update "table_views"'),
            )
          ) {
            interleaved = true;
            await executeCommand(b.db, owner, workspaceId, {
              type: "table.update",
              id: "leads",
              revision: 1,
              patch: {
                columns: [
                  { id: "new-name", name: "Replacement", type: "text" },
                ],
                rows: [],
              },
            });
          }
          return runtime.transport.batch(statements);
        },
      },
    });
    try {
      await expect(
        updateTableView(connection.db, owner, workspaceId, saved.view.id, {
          revision: 1,
          tableRevision: 1,
          patch: { settings: defaultTableViewSettings() },
        }),
      ).rejects.toMatchObject({
        code: "TABLE_REVISION_CONFLICT",
        currentRevision: 2,
      });
      expect(interleaved).toBe(true);
      const current = await getTableView(
        a.db,
        owner,
        workspaceId,
        saved.view.id,
      );
      expect(current.view).toMatchObject({
        revision: 1,
        settings: saved.view.settings,
        status: "needs_attention",
      });
    } finally {
      await connection.close();
    }
  });

  it("enforces the composite table foreign key, rolls back failed batches and tracks all view writes", async () => {
    const before = await version();
    const { view } = await createTableView(a.db, owner, workspaceId, input());
    expect(await version()).toBeGreaterThan(before);
    const other = await a.db.atomic((tx) =>
      createWorkspace(tx, owner.id, "No table here"),
    );
    const revisionBeforeFailure = await version();
    await expect(
      a.db.atomic(async (tx) => {
        await tx
          .update(schema.tableViews)
          .set({ name: "Must roll back" })
          .where(eq(schema.tableViews.id, view.id));
        await tx.insert(schema.tableViews).values({
          id: "cross-workspace",
          workspaceId: other,
          tableId: "leads",
          name: "Invalid",
          settings: defaultTableViewSettings(),
          columnBindings: [],
          validatedTableRevision: 1,
        });
      }),
    ).rejects.toThrow("D1_QUERY_FAILED"); // Private D1 transport redacts SQL errors.
    expect(await version()).toBe(revisionBeforeFailure);
    expect(
      (await getTableView(a.db, owner, workspaceId, view.id)).view.name,
    ).toBe("Open leads");
    await updateTableView(a.db, owner, workspaceId, view.id, {
      revision: 1,
      tableRevision: 1,
      patch: { name: "Renamed" },
    });
    const afterUpdate = await version();
    expect(afterUpdate).toBeGreaterThan(revisionBeforeFailure);
    await deleteTableView(a.db, owner, workspaceId, view.id, { revision: 2 });
    expect(await version()).toBeGreaterThan(afterUpdate);
    expect(
      (await listTableViews(a.db, owner, workspaceId, "leads")).table.rows,
    ).toHaveLength(1);
  });

  it("lets a lost create acknowledgment be reconciled without a second view", async () => {
    const attempt = input();
    const connection = await createDatabase({
      transport: {
        ...runtime.transport,
        batch: async (statements) => {
          await runtime.transport.batch(statements);
          throw new Error("Test fixture: response lost after commit");
        },
      },
    });
    try {
      await expect(
        createTableView(connection.db, owner, workspaceId, attempt),
      ).rejects.toThrow("response lost after commit");
      expect(
        (await getTableView(a.db, owner, workspaceId, attempt.id)).view.name,
      ).toBe(attempt.name);
      await expect(
        createTableView(a.db, owner, workspaceId, attempt),
      ).rejects.toMatchObject({ code: "VIEW_ID_EXISTS" });
      expect(
        (await listTableViews(a.db, owner, workspaceId, "leads")).views,
      ).toHaveLength(1);
    } finally {
      await connection.close();
    }
  });
});
