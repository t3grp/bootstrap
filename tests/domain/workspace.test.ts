import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabase,
  schema,
  type Database,
  type DatabaseConnection,
} from "@bootstrap/db";
import type {
  PageContent,
  WorkspaceCommand,
  WorkspaceSnapshot,
} from "@bootstrap/core";
import {
  addPrivateFile,
  createWorkspace,
  executeCommand,
  getPrivateFile,
  getSnapshot,
  type Actor,
} from "../../apps/web/src/lib/server/workspace";
import { pageMarkdown, tableCsv } from "../../apps/web/src/lib/server/export";
import { validatePageContent } from "../../apps/web/src/lib/server/validation";

const owner: Actor = {
  id: randomUUID(),
  name: "Owner",
  email: "owner@example.test",
};
const outsider: Actor = {
  id: randomUUID(),
  name: "Other owner",
  email: "other@example.test",
};
let connection: DatabaseConnection;
let db: Database;
let workspaceId: string;
let foreignWorkspaceId: string;

function textContent(text: string): PageContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { id: randomUUID() },
        content: [{ type: "text", text }],
      },
    ],
  };
}
const run = (command: WorkspaceCommand) =>
  executeCommand(db, owner, workspaceId, command);
const pageNamed = (snapshot: WorkspaceSnapshot, title: string) =>
  snapshot.pages.find((page) => page.title === title)!;

beforeAll(async () => {
  connection = await createDatabase({ memory: true });
  db = connection.db;
  await db.insert(schema.user).values([owner, outsider]);
  await db.insert(schema.instance).values({ id: "primary", ownerId: owner.id });
});
beforeEach(async () => {
  workspaceId = await db.atomic((tx) =>
    createWorkspace(tx, owner.id, "Owner workspace"),
  );
  foreignWorkspaceId = await db.atomic((tx) =>
    createWorkspace(tx, outsider.id, "Private workspace"),
  );
});
afterAll(async () => {
  await connection?.close();
});

describe("workspace boundaries and persistence", () => {
  it("requires membership for reads, mutations, resource links, and private files", async () => {
    await expect(
      getSnapshot(db, owner, foreignWorkspaceId),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      executeCommand(db, outsider, workspaceId, {
        type: "project.create",
        name: "intrusion",
      }),
    ).rejects.toMatchObject({ status: 404 });
    const foreignPage = (await getSnapshot(db, outsider, foreignWorkspaceId))
      .pages[0];
    const page = (await getSnapshot(db, owner, workspaceId)).pages[0];
    await expect(
      run({
        type: "page.update",
        id: page.id,
        revision: page.revision,
        patch: { parentId: foreignPage.id },
      }),
    ).rejects.toMatchObject({ status: 404 });
    const reference: PageContent = {
      type: "doc",
      content: [
        {
          type: "childPage",
          attrs: { id: randomUUID(), pageId: foreignPage.id },
        },
      ],
    };
    await expect(
      run({
        type: "page.update",
        id: page.id,
        revision: page.revision,
        patch: { content: reference },
      }),
    ).rejects.toMatchObject({ status: 404 });
    const file = {
      id: randomUUID(),
      name: "private.txt",
      mimeType: "text/plain",
      size: 4,
      storageKey: randomUUID(),
      sha256: "0".repeat(64),
    };
    await addPrivateFile(db, outsider, foreignWorkspaceId, file);
    await expect(
      getPrivateFile(db, owner, foreignWorkspaceId, file.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      getPrivateFile(db, owner, workspaceId, file.id),
    ).rejects.toMatchObject({ status: 404 });
    const snapshot = await getSnapshot(db, owner, workspaceId);
    expect(snapshot.projects).toHaveLength(0);
    expect(snapshot.pages[0].revision).toBe(page.revision);
    expect(
      snapshot.workspaces.some(
        (workspace) => workspace.id === foreignWorkspaceId,
      ),
    ).toBe(false);
  });

  it("creates manual projects, tasks, pages, and empty agent profiles without AI credentials", async () => {
    let snapshot = await run({
      type: "project.create",
      name: "Launch",
      description: "Ship the first useful version",
      color: "#818cf8",
    });
    const projectId = snapshot.projects[0].id;
    snapshot = await run({
      type: "task.create",
      title: "Interview a customer",
      projectId,
      assignee: "me",
      dueDate: "2026-11-20",
    });
    snapshot = await run({
      type: "task.update",
      id: snapshot.tasks[0].id,
      patch: { status: "done" },
    });
    snapshot = await run({ type: "page.create", title: "Research", projectId });
    snapshot = await run({
      type: "agent.create",
      name: "Researcher",
      role: "Customer research",
    });
    expect(snapshot.tasks[0]).toMatchObject({
      status: "done",
      assignee: "me",
      projectId,
    });
    expect(pageNamed(snapshot, "Research").projectId).toBe(projectId);
    expect(snapshot.agents[0]).toMatchObject({
      status: "configured",
      skills: [],
      routines: [],
      memories: [],
    });
    const snapshotAgain = await getSnapshot(db, owner, workspaceId);
    expect(snapshotAgain.tasks).toEqual(snapshot.tasks);
    expect(snapshotAgain.agents).toEqual(snapshot.agents);
  });

  it("persists content and membership across closing and reopening a local database", async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "bootstrap-persistence-"),
    );
    let local: DatabaseConnection | undefined;
    try {
      local = await createDatabase({ directory });
      await local.db.insert(schema.user).values(owner);
      const id = await local.db.atomic((tx) =>
        createWorkspace(tx, owner.id, "Persistent workspace"),
      );
      const snapshot = await getSnapshot(local.db, owner, id);
      await executeCommand(local.db, owner, id, {
        type: "page.update",
        id: snapshot.pages[0].id,
        revision: 1,
        patch: {
          title: "Kept after restart",
          content: textContent("This is durable work."),
        },
      });
      await local.close();
      local = await createDatabase({ directory });
      const restored = await getSnapshot(local.db, owner, id);
      expect(restored.pages[0].title).toBe("Kept after restart");
      expect(restored.pages[0].content.content[0].content?.[0].text).toBe(
        "This is durable work.",
      );
      expect(restored.pages[0].revision).toBe(2);
    } finally {
      await local?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("document revisions and hierarchy", () => {
  it("preserves the newer document and immutable previous version on a stale save", async () => {
    const page = (await getSnapshot(db, owner, workspaceId)).pages[0];
    const saved = await run({
      type: "page.update",
      id: page.id,
      revision: page.revision,
      patch: { content: textContent("Newer user edit") },
    });
    await expect(
      run({
        type: "page.update",
        id: page.id,
        revision: page.revision,
        patch: { content: textContent("Stale tab") },
      }),
    ).rejects.toMatchObject({ status: 409, currentRevision: 2 });
    const latest = await getSnapshot(db, owner, workspaceId);
    expect(latest.pages[0].content).toEqual(saved.pages[0].content);
    const versions = (await db.select().from(schema.documentVersions)).filter(
      (item) => item.workspaceId === workspaceId && item.documentId === page.id,
    );
    expect(versions).toHaveLength(2);
    expect(versions.find((item) => item.revision === 1)?.content).toEqual(
      page.content,
    );
  });

  it("accepts only one simultaneous write to the same revision", async () => {
    const page = (await getSnapshot(db, owner, workspaceId)).pages[0];
    const results = await Promise.allSettled(
      ["First edit", "Second edit"].map((title) =>
        run({
          type: "page.update",
          id: page.id,
          revision: page.revision,
          patch: { title },
        }),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
    expect((await getSnapshot(db, owner, workspaceId)).pages[0].revision).toBe(
      2,
    );
  });

  it("prevents cycles even when two tabs move sibling pages concurrently", async () => {
    let snapshot = await run({ type: "page.create", title: "A" });
    const a = pageNamed(snapshot, "A");
    snapshot = await run({ type: "page.create", title: "B" });
    const b = pageNamed(snapshot, "B");
    const results = await Promise.allSettled([
      run({
        type: "page.update",
        id: a.id,
        revision: a.revision,
        patch: { parentId: b.id },
      }),
      run({
        type: "page.update",
        id: b.id,
        revision: b.revision,
        patch: { parentId: a.id },
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (
        results.find(
          (result) => result.status === "rejected",
        ) as PromiseRejectedResult
      ).reason,
    ).toMatchObject({ code: "PAGE_CYCLE" });
    snapshot = await getSnapshot(db, owner, workspaceId);
    expect(
      pageNamed(snapshot, "A").parentId === b.id &&
        pageNamed(snapshot, "B").parentId === a.id,
    ).toBe(false);
  });

  it("trashes an exact active subtree and restores it without reviving an earlier deletion", async () => {
    let snapshot = await run({ type: "page.create", title: "Parent" });
    const parent = pageNamed(snapshot, "Parent");
    snapshot = await run({
      type: "page.create",
      title: "Active child",
      parentId: parent.id,
    });
    snapshot = await run({
      type: "page.create",
      title: "Previously trashed",
      parentId: parent.id,
    });
    const old = pageNamed(snapshot, "Previously trashed");
    await run({ type: "page.trash", id: old.id, revision: old.revision });
    snapshot = await run({
      type: "page.trash",
      id: parent.id,
      revision: parent.revision,
    });
    expect(pageNamed(snapshot, "Active child").trashedAt).not.toBeNull();
    const rootInTrash = pageNamed(snapshot, "Parent");
    snapshot = await run({
      type: "page.restore",
      id: parent.id,
      revision: rootInTrash.revision,
    });
    expect(pageNamed(snapshot, "Parent").trashedAt).toBeNull();
    expect(pageNamed(snapshot, "Active child").trashedAt).toBeNull();
    expect(pageNamed(snapshot, "Previously trashed").trashedAt).not.toBeNull();
    expect(pageNamed(snapshot, "Active child").parentId).toBe(parent.id);
  });

  it("keeps an existing unavailable reference editable but rejects a new unavailable reference", async () => {
    let snapshot = await run({ type: "page.create", title: "Referenced page" });
    const child = pageNamed(snapshot, "Referenced page");
    const page = snapshot.pages[0];
    const file = {
      id: randomUUID(),
      name: "attachment.txt",
      mimeType: "text/plain",
      size: 4,
      storageKey: randomUUID(),
      sha256: "0".repeat(64),
    };
    await addPrivateFile(db, owner, workspaceId, file);
    const content: PageContent = {
      type: "doc",
      content: [
        { type: "childPage", attrs: { id: randomUUID(), pageId: child.id } },
        { type: "fileReference", attrs: { id: randomUUID(), fileId: file.id } },
      ],
    };
    snapshot = await run({
      type: "page.update",
      id: page.id,
      revision: page.revision,
      patch: { content },
    });
    await run({ type: "page.trash", id: child.id, revision: child.revision });
    await run({ type: "file.delete", id: file.id });
    const revisedContent = structuredClone(content);
    revisedContent.content.push(
      ...textContent("Unrelated writing still saves").content,
    );
    snapshot = await run({
      type: "page.update",
      id: page.id,
      revision: snapshot.pages.find((item) => item.id === page.id)!.revision,
      patch: { content: revisedContent },
    });
    expect(snapshot.pages.find((item) => item.id === page.id)!.content).toEqual(
      revisedContent,
    );
    const newMissing = structuredClone(revisedContent);
    newMissing.content.push({
      type: "fileReference",
      attrs: { id: randomUUID(), fileId: randomUUID() },
    });
    await expect(
      run({
        type: "page.update",
        id: page.id,
        revision: snapshot.pages.find((item) => item.id === page.id)!.revision,
        patch: { content: newMissing },
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("typed tables and safe exports", () => {
  it("rejects an invalid table update atomically and enforces revisions", async () => {
    let snapshot = await run({ type: "table.create", name: "Customers" });
    const table = snapshot.tables[0];
    const numberId = randomUUID();
    const columns = [
      ...table.columns,
      { id: numberId, name: "Employees", type: "number" as const },
    ];
    await expect(
      run({
        type: "table.update",
        id: table.id,
        revision: 1,
        patch: {
          description: "Should not persist",
          columns,
          rows: [{ id: randomUUID(), cells: { [numberId]: "not a number" } }],
        },
      }),
    ).rejects.toMatchObject({ status: 400 });
    snapshot = await getSnapshot(db, owner, workspaceId);
    expect(snapshot.tables[0]).toMatchObject({
      revision: 1,
      description: "",
      rows: [],
    });
    snapshot = await run({
      type: "table.update",
      id: table.id,
      revision: 1,
      patch: {
        columns,
        rows: [{ id: randomUUID(), cells: { [numberId]: 42 } }],
      },
    });
    await expect(
      run({
        type: "table.update",
        id: table.id,
        revision: 1,
        patch: { name: "Stale name" },
      }),
    ).rejects.toMatchObject({ status: 409, currentRevision: 2 });
    expect(snapshot.tables[0].rows[0].cells[numberId]).toBe(42);
  });

  it("removing a table embed preserves the canonical table and its rows", async () => {
    let snapshot = await run({ type: "table.create", name: "Shared table" });
    const table = snapshot.tables[0];
    const page = snapshot.pages[0];
    snapshot = await run({
      type: "page.update",
      id: page.id,
      revision: page.revision,
      patch: {
        content: {
          type: "doc",
          content: [
            {
              type: "tableReference",
              attrs: { id: randomUUID(), tableId: table.id },
            },
          ],
        },
      },
    });
    snapshot = await run({
      type: "page.update",
      id: page.id,
      revision: snapshot.pages[0].revision,
      patch: { content: textContent("Removed the reference") },
    });
    expect(snapshot.tables[0]).toEqual(table);
  });

  it("rejects unsafe links, duplicate IDs, invalid node positions, and oversized documents", () => {
    const content = textContent("Click");
    content.content[0].content![0].marks = [
      { type: "link", attrs: { href: "javascript:alert(1)" } },
    ];
    expect(() => validatePageContent(content)).toThrow(/Links must use/);
    const duplicate = textContent("Block");
    duplicate.content.push(structuredClone(duplicate.content[0]));
    expect(() => validatePageContent(duplicate)).toThrow(/unique stable/);
    expect(() =>
      validatePageContent({
        type: "doc",
        content: [{ type: "text", text: "Wrong level" }],
      }),
    ).toThrow(/invalid position/);
    expect(() =>
      validatePageContent(textContent("x".repeat(1_100_000))),
    ).toThrow(/1 MB/);
  });

  it("keeps cumulative agent notes within D1's row budget across separate updates", async () => {
    let state = await run({ type: "agent.create", name: "Bounded specialist" });
    const id = state.agents[0].id;
    const notes = Array.from({ length: 22 }, () => "x".repeat(20_000));
    await run({ type: "agent.update", id, patch: { skills: notes } });
    state = await run({ type: "agent.update", id, patch: { routines: notes } });
    await expect(
      run({ type: "agent.update", id, patch: { memories: notes } }),
    ).rejects.toMatchObject({ code: "CAPACITY_LIMIT" });
    const saved = await getSnapshot(db, owner, workspaceId);
    expect(saved.agents[0].memories).toEqual([]);
    expect(saved.agents[0].routines).toEqual(state.agents[0].routines);
  });

  it("counts UTF-8 table bytes before accepting a record that would exceed the D1 budget", async () => {
    const state = await run({ type: "table.create", name: "Unicode rows" });
    const table = state.tables[0];
    const rows = Array.from({ length: 30 }, () => ({
      id: randomUUID(),
      cells: { [table.columns[0].id]: "é".repeat(20_000) },
    }));
    await expect(
      run({
        type: "table.update",
        id: table.id,
        revision: table.revision,
        patch: { rows },
      }),
    ).rejects.toThrow(/1 MB/);
    expect((await getSnapshot(db, owner, workspaceId)).tables[0].rows).toEqual(
      [],
    );
  });

  it("escapes spreadsheet formulas and documents lossy Markdown fallbacks", async () => {
    const snapshot = await run({ type: "table.create", name: "Export" });
    const table = snapshot.tables[0];
    table.rows = [
      {
        id: randomUUID(),
        cells: {
          [table.columns[0].id]: '=IMPORTXML("https://example.invalid")',
          [table.columns[1].id]: "New",
        },
      },
    ];
    expect(tableCsv(table)).toContain("\"'=IMPORTXML");
    const page = snapshot.pages[0];
    page.content = {
      type: "doc",
      content: [
        {
          type: "tableReference",
          attrs: { id: randomUUID(), tableId: table.id },
        },
      ],
    };
    expect(pageMarkdown(page)).toContain("export this table separately as CSV");
    expect(pageMarkdown(page)).toContain("Native JSON retains block IDs");
  });
});
