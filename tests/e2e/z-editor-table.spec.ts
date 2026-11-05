import { randomUUID } from "node:crypto";
import {
  test,
  expect,
  type APIRequestContext,
  type Page as BrowserPage,
} from "@playwright/test";
import type {
  EditorNode,
  WorkspaceCommand,
  WorkspaceSnapshot,
} from "@bootstrap/core";

const origin = `http://127.0.0.1:${process.env.E2E_PORT || "3100"}`;
const credentials = {
  email: "founder@example.test",
  password: "Build-things-together-2026!",
};

async function signIn(page: BrowserPage) {
  const status = await (await page.request.get("/api/setup")).json();
  if (!status.initialized) {
    const setup = await page.request.post("/api/setup", {
      headers: { Origin: origin },
      data: {
        ...credentials,
        name: "Alex Morgan",
        workspaceName: "Northstar Studio",
        setupToken: "bootstrap-local-e2e-setup-token-00000000000000000000",
      },
    });
    expect(setup.ok(), await setup.text()).toBeTruthy();
  }
  const response = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: credentials,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return snapshot(page.request);
}

async function snapshot(
  request: APIRequestContext,
): Promise<WorkspaceSnapshot> {
  const response = await request.get("/api/workspace");
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

async function mutate(
  request: APIRequestContext,
  workspaceId: string,
  command: WorkspaceCommand,
): Promise<WorkspaceSnapshot> {
  const response = await request.post("/api/command", {
    headers: { Origin: origin },
    data: { workspaceId, command },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

function structuralIds(node: EditorNode): string[] {
  const own = ["doc", "text", "hardBreak"].includes(node.type)
    ? []
    : [node.attrs?.id as string];
  return [...own, ...(node.content ?? []).flatMap(structuralIds)];
}

test("keyboard blocks keep stable IDs when moved, duplicated, and reloaded", async ({
  page,
}) => {
  const initial = await signIn(page);
  const workspaceId = initial.workspace.id;
  const title = `Block identity ${randomUUID().slice(0, 8)}`;
  const created = await mutate(page.request, workspaceId, {
    type: "page.create",
    title,
  });
  const resource = created.pages.find((item) => item.title === title)!;
  const readPage = async () =>
    (await snapshot(page.request)).pages.find(
      (item) => item.id === resource.id,
    )!;
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto(`/w/${workspaceId}/pages/${resource.id}`);
  const editor = page.getByRole("textbox", {
    name: "Page content",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await editor.fill("Opening paragraph");
  await editor.press("ControlOrMeta+End");
  await editor.press("Enter");
  await editor.pressSequentially("/heading 2");
  await expect(
    page.getByRole("listbox", { name: "Insert a block" }),
  ).toBeVisible();
  await editor.press("Enter");
  await editor.pressSequentially("A useful heading");
  await editor.press("Enter");
  await editor.pressSequentially("/checklist");
  await editor.press("Enter");
  await editor.pressSequentially("First customer conversation");
  await editor.press("Enter");
  await editor.pressSequentially("Second customer conversation");
  await expect
    .poll(async () =>
      (await readPage()).content.content.some(
        (node) => node.type === "taskList",
      ),
    )
    .toBe(true);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const before = await readPage();
  const originalIds = structuralIds(before.content);
  expect(originalIds.length).toBeGreaterThanOrEqual(7);
  expect(
    originalIds.every(
      (id) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id),
    ),
  ).toBe(true);
  expect(new Set(originalIds).size).toBe(originalIds.length);

  // A checklist is one top-level block. Reordering it retains IDs of every item.
  await editor.press("Alt+ArrowUp");
  await expect
    .poll(async () => (await readPage()).content.content[1]?.type)
    .toBe("taskList");
  const moved = await readPage();
  expect(structuralIds(moved.content).sort()).toEqual([...originalIds].sort());

  // A duplicate retains the reference/content but receives new structural identities.
  await editor.press("ControlOrMeta+Shift+d");
  await expect
    .poll(
      async () =>
        (await readPage()).content.content.filter(
          (node) => node.type === "taskList",
        ).length,
    )
    .toBe(2);
  const duplicated = await readPage();
  const duplicatedIds = structuralIds(duplicated.content);
  expect(new Set(duplicatedIds).size).toBe(duplicatedIds.length);
  expect(originalIds.every((id) => duplicatedIds.includes(id))).toBe(true);
  expect(duplicatedIds.length).toBeGreaterThan(originalIds.length);

  await page.reload();
  await expect(editor).toBeVisible();
  await expect(editor.locator('ul[data-type="taskList"]')).toHaveCount(2);
  expect(structuralIds((await readPage()).content).sort()).toEqual(
    [...duplicatedIds].sort(),
  );
  expect(runtimeErrors).toEqual([]);
});

test("typed edits validate locally and linked tables share the canonical records", async ({
  page,
}, testInfo) => {
  const initial = await signIn(page);
  const workspaceId = initial.workspace.id;
  const name = `Research budget ${randomUUID().slice(0, 8)}`;
  const created = await mutate(page.request, workspaceId, {
    type: "table.create",
    name,
  });
  const table = created.tables.find((item) => item.name === name)!;
  const nameColumn = table.columns.find((column) => column.type === "text")!;
  const budgetColumn = {
    id: randomUUID(),
    name: "Budget",
    type: "number" as const,
  };
  const row = {
    id: randomUUID(),
    cells: { [nameColumn.id]: "First interview", [budgetColumn.id]: 10 },
  };
  await mutate(page.request, workspaceId, {
    type: "table.update",
    id: table.id,
    revision: table.revision,
    patch: { columns: [...table.columns, budgetColumn], rows: [row] },
  });
  const pageTitle = `Linked research ${randomUUID().slice(0, 8)}`;
  const withPage = await mutate(page.request, workspaceId, {
    type: "page.create",
    title: pageTitle,
  });
  const resource = withPage.pages.find((item) => item.title === pageTitle)!;
  await mutate(page.request, workspaceId, {
    type: "page.update",
    id: resource.id,
    revision: resource.revision,
    patch: {
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { id: randomUUID() },
            content: [
              { type: "text", text: "A table, in the context of the work." },
            ],
          },
          {
            type: "tableReference",
            attrs: { id: randomUUID(), tableId: table.id },
          },
          { type: "paragraph", attrs: { id: randomUUID() } },
        ],
      },
    },
  });
  const readTable = async () =>
    (await snapshot(page.request)).tables.find((item) => item.id === table.id)!;
  const readBudget = async () =>
    (await readTable()).rows.find((item) => item.id === row.id)!.cells[
      budgetColumn.id
    ];
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto(`/w/${workspaceId}/pages/${resource.id}`);
  const budget = page.getByLabel("Budget, row 1", { exact: true });
  await expect(budget).toHaveValue("10");
  await budget.fill("not-a-number");
  await budget.press("Tab");
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter a valid number." }),
  ).toBeVisible();
  await expect(budget).toHaveValue("not-a-number");
  expect(await readBudget()).toBe(10);

  await budget.fill("125.50");
  await budget.press("Tab");
  await expect.poll(readBudget).toBe(125.5);
  await page
    .getByLabel(`${nameColumn.name}, row 1`, { exact: true })
    .fill("Renamed inside the page");
  await page
    .getByLabel(`${nameColumn.name}, row 1`, { exact: true })
    .press("Tab");
  await expect
    .poll(async () => (await readTable()).rows[0].cells[nameColumn.id])
    .toBe("Renamed inside the page");

  await page
    .getByRole("button", { name: `Open ${name} as full table`, exact: true })
    .click();
  await expect(page.getByLabel("Table name", { exact: true })).toHaveValue(
    name,
  );
  await expect(budget).toHaveValue("125.5");
  await expect(
    page.getByLabel(`${nameColumn.name}, row 1`, { exact: true }),
  ).toHaveValue("Renamed inside the page");
  await budget.fill("250");
  await budget.press("Enter");
  await expect.poll(readBudget).toBe(250);

  await page.goto(`/w/${workspaceId}/pages/${resource.id}`);
  await expect(budget).toHaveValue("250");
  await page.screenshot({
    path: testInfo.outputPath("linked-table-editor.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Remove table reference", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: `${name} records` }),
  ).not.toBeVisible();
  await expect
    .poll(async () =>
      (await snapshot(page.request)).pages
        .find((item) => item.id === resource.id)!
        .content.content.some((node) => node.type === "tableReference"),
    )
    .toBe(false);
  expect(await readBudget()).toBe(250);
  expect(runtimeErrors).toEqual([]);
});
