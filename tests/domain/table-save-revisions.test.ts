import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, schema, type DatabaseConnection } from "@bootstrap/db";
import type { WorkspaceTable } from "@bootstrap/core";
import {
  AcknowledgedTableRevisions,
  confirmedSaveRevision,
} from "@/components/workspace/save-revisions";
import {
  createWorkspace,
  executeCommand,
  getSnapshot,
  type Actor,
} from "@/lib/server/workspace";

const owner: Actor = {
  id: randomUUID(),
  name: "Table editor",
  email: "table-editor@example.test",
};
let connection: DatabaseConnection;
let workspaceId: string;
let acknowledged: AcknowledgedTableRevisions;

beforeAll(async () => {
  connection = await createDatabase({ memory: true });
  await connection.db.insert(schema.user).values(owner);
  await connection.db
    .insert(schema.instance)
    .values({ id: "primary", ownerId: owner.id });
});
beforeEach(async () => {
  workspaceId = await connection.db.transaction((tx) =>
    createWorkspace(tx, owner.id, "Rapid table edits"),
  );
  acknowledged = new AcknowledgedTableRevisions();
});
afterAll(async () => connection?.close());

async function newTable() {
  const snapshot = await executeCommand(connection.db, owner, workspaceId, {
    type: "table.create",
    name: "Customer interviews",
  });
  return snapshot.tables[0];
}

async function persist(table: WorkspaceTable) {
  const submittedRevision = acknowledged.forDraft(workspaceId, table);
  const snapshot = await executeCommand(connection.db, owner, workspaceId, {
    type: "table.update",
    id: table.id,
    revision: submittedRevision,
    patch: { name: table.name, columns: table.columns, rows: table.rows },
  });
  const saved = snapshot.tables.find((item) => item.id === table.id)!;
  confirmedSaveRevision(submittedRevision, saved.revision);
  acknowledged.recordSuccessfulWrite(
    snapshot.workspace.id,
    saved.id,
    submittedRevision,
  );
  return saved;
}

describe("table save acknowledgements", () => {
  it("saves the next cell before rendered props catch up with the previous acknowledgement", async () => {
    const initial = await newTable();
    const nameId = initial.columns.find((column) => column.name === "Name")!.id;
    const statusId = initial.columns.find(
      (column) => column.name === "Status",
    )!.id;
    const row = {
      id: randomUUID(),
      cells: { [nameId]: null, [statusId]: null },
    };
    const added = await persist({ ...initial, rows: [row] });
    expect(added.revision).toBe(2);

    // CI trace: the DOM still held revision 2 after the Name save returned 3.
    const renderedNameDraft: WorkspaceTable = {
      ...added,
      rows: [
        {
          ...row,
          cells: { ...row.cells, [nameId]: "Jamie · independent designer" },
        },
      ],
    };
    const savedName = await persist(renderedNameDraft);
    expect(savedName.revision).toBe(3);

    const renderedStatusDraft: WorkspaceTable = {
      ...renderedNameDraft,
      rows: [
        {
          ...row,
          cells: {
            ...renderedNameDraft.rows[0].cells,
            [statusId]: "In progress",
          },
        },
      ],
    };
    expect(renderedStatusDraft.revision).toBe(2);
    const savedStatus = await persist(renderedStatusDraft);
    expect(savedStatus.revision).toBe(4);
    const reloaded = (
      await getSnapshot(connection.db, owner, workspaceId)
    ).tables.find((table) => table.id === initial.id)!;
    expect(reloaded.rows[0].cells).toEqual({
      [nameId]: "Jamie · independent designer",
      [statusId]: "In progress",
    });
  });

  it("still rejects a genuine other-session write after our last acknowledgement", async () => {
    const initial = await newTable();
    const local = await persist({ ...initial, name: "Locally saved title" });
    const remote = await executeCommand(connection.db, owner, workspaceId, {
      type: "table.update",
      id: local.id,
      revision: local.revision,
      patch: { name: "Other session's newer title" },
    });
    expect(remote.tables[0].revision).toBe(3);

    // A general snapshot can reveal revision 3, but it is not our write receipt.
    await getSnapshot(connection.db, owner, workspaceId);
    await expect(
      persist({ ...local, name: "An edit based on revision 2" }),
    ).rejects.toMatchObject({
      status: 409,
      code: "REVISION_CONFLICT",
      currentRevision: 3,
    });
    expect(
      (await getSnapshot(connection.db, owner, workspaceId)).tables[0].name,
    ).toBe("Other session's newer title");
  });

  it("does not reuse another workspace's acknowledgement for an overlapping table ID", async () => {
    const initial = await newTable();
    await persist({ ...initial, name: "A local save in the first workspace" });
    const otherWorkspaceId = await connection.db.transaction((tx) =>
      createWorkspace(tx, owner.id, "Another workspace"),
    );
    await connection.db.insert(schema.businessTables).values({
      id: initial.id,
      workspaceId: otherWorkspaceId,
      name: "Different canonical table",
      columns: initial.columns,
      rows: [],
    });
    const other = (await getSnapshot(connection.db, owner, otherWorkspaceId))
      .tables[0];
    expect(other.revision).toBe(1);
    expect(acknowledged.forDraft(workspaceId, initial)).toBe(2);
    expect(acknowledged.forDraft(otherWorkspaceId, other)).toBe(1);
  });

  it("does not mistake an interleaved remote revision in the response snapshot for our write receipt", async () => {
    const initial = await newTable();
    const submittedRevision = acknowledged.forDraft(workspaceId, initial);
    await executeCommand(connection.db, owner, workspaceId, {
      type: "table.update",
      id: initial.id,
      revision: submittedRevision,
      patch: { name: "Our successful write" },
    });
    await executeCommand(connection.db, owner, workspaceId, {
      type: "table.update",
      id: initial.id,
      revision: submittedRevision + 1,
      patch: { name: "Other session wrote before the response snapshot" },
    });
    // The endpoint reads its response snapshot after commit. Reproduce that
    // ordering: the newer revision must enter conflict recovery, not clear or
    // promote the local draft.
    const responseSnapshot = await getSnapshot(
      connection.db,
      owner,
      workspaceId,
    );
    expect(responseSnapshot.tables[0].revision).toBe(3);
    expect(() =>
      confirmedSaveRevision(
        submittedRevision,
        responseSnapshot.tables[0].revision,
      ),
    ).toThrow(expect.objectContaining({ status: 409, currentRevision: 3 }));
    expect(acknowledged.forDraft(workspaceId, initial)).toBe(1);
    await expect(
      persist({ ...initial, name: "Queued local edit" }),
    ).rejects.toMatchObject({
      status: 409,
      code: "REVISION_CONFLICT",
      currentRevision: 3,
    });
  });
});

describe("page save acknowledgements", () => {
  it("keeps a queued draft in conflict when another session writes before the response snapshot", async () => {
    const initial = (await getSnapshot(connection.db, owner, workspaceId))
      .pages[0];
    const submittedRevision = initial.revision;
    const ownResult = await executeCommand(connection.db, owner, workspaceId, {
      type: "page.update",
      id: initial.id,
      revision: submittedRevision,
      patch: { title: "Our page edit" },
    });
    const ownSaved = ownResult.pages.find((page) => page.id === initial.id)!;
    expect(confirmedSaveRevision(submittedRevision, ownSaved.revision)).toBe(
      submittedRevision + 1,
    );
    await executeCommand(connection.db, owner, workspaceId, {
      type: "page.update",
      id: initial.id,
      revision: submittedRevision + 1,
      patch: { title: "Another session's page edit" },
    });
    const responseSnapshot = await getSnapshot(
      connection.db,
      owner,
      workspaceId,
    );
    const newer = responseSnapshot.pages.find(
      (page) => page.id === initial.id,
    )!;
    expect(() =>
      confirmedSaveRevision(submittedRevision, newer.revision),
    ).toThrow(
      expect.objectContaining({
        status: 409,
        currentRevision: submittedRevision + 2,
      }),
    );
    await expect(
      executeCommand(connection.db, owner, workspaceId, {
        type: "page.update",
        id: initial.id,
        revision: submittedRevision + 1,
        patch: { title: "A queued local edit based on our write" },
      }),
    ).rejects.toMatchObject({
      status: 409,
      currentRevision: submittedRevision + 2,
    });
    expect(
      (await getSnapshot(connection.db, owner, workspaceId)).pages.find(
        (page) => page.id === initial.id,
      )!.title,
    ).toBe("Another session's page edit");
  });
});
