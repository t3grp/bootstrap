import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  defaultTableViewSettings,
  resolveTableView,
} from "../../packages/core/src/table-views";
import type {
  TableViewDetail,
  WorkspaceSnapshot,
} from "../../packages/core/src/types";

const origin = `http://127.0.0.1:${process.env.E2E_PORT || "3100"}`;
const headers = { Origin: origin };
const settings = defaultTableViewSettings;

async function login(request: APIRequestContext) {
  const status = await (await request.get("/api/setup")).json();
  const credentials = {
    email: "founder@example.test",
    password: "Build-things-together-2026!",
  };
  if (!status.initialized) {
    const result = await request.post("/api/setup", {
      headers,
      data: {
        ...credentials,
        name: "Alex Morgan",
        workspaceName: "Northstar Studio",
        setupToken: "bootstrap-local-e2e-setup-token-00000000000000000000",
      },
    });
    expect(result.ok(), await result.text()).toBeTruthy();
  }
  const result = await request.post("/api/auth/sign-in/email", {
    headers,
    data: credentials,
  });
  expect(result.ok(), await result.text()).toBeTruthy();
}

async function mutate(
  request: APIRequestContext,
  workspaceId: string,
  command: object,
): Promise<WorkspaceSnapshot> {
  const result = await request.post("/api/command", {
    headers,
    data: { workspaceId, command },
  });
  expect(result.ok(), await result.text()).toBeTruthy();
  return result.json();
}

async function fixture(request: APIRequestContext) {
  await login(request);
  const current: WorkspaceSnapshot = await (
    await request.get("/api/workspace")
  ).json();
  let state = await mutate(request, current.workspace.id, {
    type: "workspace.create",
    name: `Views ${randomUUID()}`,
  });
  const workspaceId = state.workspace.id;
  state = await mutate(request, workspaceId, {
    type: "table.create",
    name: "Leads",
  });
  const tableId = state.tables.find((table) => table.name === "Leads")!.id;
  state = await mutate(request, workspaceId, {
    type: "table.update",
    id: tableId,
    revision: 1,
    patch: {
      columns: [
        { id: "name", name: "Name", type: "text" },
        { id: "amount", name: "Amount", type: "number" },
      ],
      rows: [
        { id: "alpha", cells: { name: "Alpha", amount: 10 } },
        { id: "beta", cells: { name: "Beta", amount: 0 } },
      ],
    },
  });
  const table = state.tables.find((table) => table.id === tableId)!;
  const collection = `/api/table-views?workspaceId=${workspaceId}`;
  return {
    workspaceId,
    table,
    collection,
    item: (id: string) => `/api/table-views/${id}?workspaceId=${workspaceId}`,
  };
}

test("named view API saves independent settings, reloads canonical rows and deletes only a view", async ({
  request,
  playwright,
}) => {
  const { workspaceId, table, collection, item } = await fixture(request);
  const empty = await request.get(`${collection}&tableId=${table.id}`);
  expect((await empty.json()).views).toEqual([]);
  const viewId = randomUUID();
  const create = {
    id: viewId,
    tableId: table.id,
    tableRevision: table.revision,
    name: "High value",
    settings: {
      ...settings(),
      visibleColumnIds: ["amount", "name"],
      filters: [{ columnId: "amount", operator: "gt", value: 0 }],
    },
  };
  const response = await request.post(collection, { headers, data: create });
  expect(response.status(), await response.text()).toBe(201);
  expect(response.headers()["cache-control"]).toBe("no-store, private");
  const saved: TableViewDetail = await response.json();
  const secondId = randomUUID();
  expect(
    (
      await request.post(collection, {
        headers,
        data: {
          ...create,
          id: secondId,
          name: "All leads",
          settings: settings(),
        },
      })
    ).status(),
  ).toBe(201);

  // A fresh HTTP client with the same session must receive persisted server state.
  const reloaded = await playwright.request.newContext({
    baseURL: origin,
    storageState: await request.storageState(),
  });
  try {
    const detail: TableViewDetail = await (
      await reloaded.get(item(viewId))
    ).json();
    expect(detail).toEqual(saved);
    const projection = resolveTableView(detail.table, detail.view);
    expect(projection).toMatchObject({
      status: "ready",
      rows: [{ id: "alpha" }],
    });
    const renamed = await reloaded.patch(item(viewId), {
      headers,
      data: {
        revision: 1,
        tableRevision: table.revision,
        patch: {
          name: "Qualified leads",
          settings: { ...create.settings, density: "compact", wrapCells: true },
        },
      },
    });
    expect(renamed.status(), await renamed.text()).toBe(200);
    expect((await renamed.json()).view).toMatchObject({
      name: "Qualified leads",
      revision: 2,
      settings: { density: "compact", wrapCells: true },
    });
    const next = await mutate(reloaded, workspaceId, {
      type: "table.update",
      id: table.id,
      revision: table.revision,
      patch: {
        rows: [
          ...table.rows,
          { id: "gamma", cells: { name: "Gamma", amount: 20 } },
        ],
      },
    });
    const canonical = next.tables.find(
      (candidate) => candidate.id === table.id,
    )!;
    const collectionResponse = await reloaded.get(
      `${collection}&tableId=${table.id}`,
    );
    const listed = await collectionResponse.json();
    expect(listed.table).toEqual(canonical);
    expect(listed.views).toHaveLength(2);
    const other: TableViewDetail = await (
      await reloaded.get(item(secondId))
    ).json();
    expect(other.table).toEqual(canonical);
    expect(other.view).toMatchObject({
      revision: 1,
      name: "All leads",
      settings: settings(),
    });
    expect(
      (
        await reloaded.delete(item(viewId), { headers, data: { revision: 2 } })
      ).status(),
    ).toBe(200);
    expect((await reloaded.get(item(viewId))).status()).toBe(404);
    const after = await (
      await reloaded.get(`${collection}&tableId=${table.id}`)
    ).json();
    expect(after.table).toEqual(canonical);
    expect(after.views.map((view: { id: string }) => view.id)).toEqual([
      secondId,
    ]);
  } finally {
    await reloaded.dispose();
  }
});

test("named view API enforces auth, origin, workspace, payload and revision boundaries", async ({
  request,
  playwright,
}) => {
  const { workspaceId, table, collection, item } = await fixture(request);
  const id = randomUUID();
  const create = {
    id,
    tableId: table.id,
    tableRevision: table.revision,
    name: "Draft",
    settings: settings(),
  };
  const update = {
    revision: 1,
    tableRevision: table.revision,
    patch: { name: "Saved" },
  };
  const anonymous = await playwright.request.newContext({ baseURL: origin });
  try {
    for (const [method, url, data] of [
      ["GET", `${collection}&tableId=${table.id}`, undefined],
      ["GET", item(id), undefined],
      ["POST", collection, create],
      ["PATCH", item(id), update],
      ["DELETE", item(id), { revision: 1 }],
    ] as const)
      expect(
        (await anonymous.fetch(url, { method, headers, data })).status(),
      ).toBe(401);
  } finally {
    await anonymous.dispose();
  }
  expect(
    (await request.post(collection, { headers, data: create })).status(),
  ).toBe(201);
  for (const [method, url, data] of [
    ["POST", collection, create],
    ["PATCH", item(id), update],
    ["DELETE", item(id), { revision: 1 }],
  ] as const)
    expect(
      (
        await request.fetch(url, {
          method,
          headers: { Origin: "https://untrusted.example" },
          data,
        })
      ).status(),
    ).toBe(403);
  const other = await mutate(request, workspaceId, {
    type: "workspace.create",
    name: "Another workspace",
  });
  for (const [method, url, data] of [
    ["GET", `${collection}&tableId=${table.id}`, undefined],
    ["GET", item(id), undefined],
    ["POST", collection, create],
    ["PATCH", item(id), update],
    ["DELETE", item(id), { revision: 1 }],
  ] as const) {
    const result = await request.fetch(
      url.replace(workspaceId, other.workspace.id),
      { method, headers, data },
    );
    expect(result.status(), await result.text()).toBe(404);
  }
  const oversized = await request.post(collection, {
    headers,
    data: { ...create, name: "x".repeat(40_000) },
  });
  expect(oversized.status()).toBe(413);
  expect(
    (
      await request.post(collection, {
        headers: { ...headers, "Content-Type": "text/plain" },
        data: "{}",
      })
    ).status(),
  ).toBe(415);
  const invalid = await request.patch(item(id), {
    headers,
    data: {
      ...update,
      patch: {
        settings: { ...settings(), visibleColumnIds: ["foreign-column"] },
      },
    },
  });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).code).toBe("INVALID_VIEW_SETTINGS");
  expect(
    (await request.post(collection, { headers, data: create })).status(),
  ).toBe(409);
  expect(
    (await request.patch(item(id), { headers, data: update })).status(),
  ).toBe(200);
  const stale = await request.patch(item(id), {
    headers,
    data: { ...update, patch: { name: "Keep this local draft" } },
  });
  expect(stale.status()).toBe(409);
  expect(await stale.json()).toMatchObject({
    code: "REVISION_CONFLICT",
    currentRevision: 2,
  });
  expect(
    (
      await request.delete(item(id), { headers, data: { revision: 1 } })
    ).status(),
  ).toBe(409);
  await mutate(request, workspaceId, {
    type: "table.update",
    id: table.id,
    revision: table.revision,
    patch: { description: "Changed" },
  });
  const staleTable = await request.patch(item(id), {
    headers,
    data: { ...update, revision: 2 },
  });
  expect(staleTable.status()).toBe(409);
  expect(await staleTable.json()).toMatchObject({
    code: "TABLE_REVISION_CONFLICT",
    currentRevision: table.revision + 1,
  });
  expect((await (await request.get(item(id))).json()).view).toMatchObject({
    name: "Saved",
    revision: 2,
    settings: settings(),
  });
});
