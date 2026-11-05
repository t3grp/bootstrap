import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const email = "founder@example.test";
const password = "Build-things-together-2026!";
const setupToken = "bootstrap-local-e2e-setup-token-00000000000000000000";
const origin = `http://127.0.0.1:${process.env.E2E_PORT || "3100"}`;

async function initialize(request: APIRequestContext) {
  const status = await (await request.get("/api/setup")).json();
  if (!status.initialized) {
    const response = await request.post("/api/setup", {
      headers: { Origin: origin },
      data: {
        name: "Alex Morgan",
        email,
        password,
        workspaceName: "Northstar Studio",
        setupToken,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
  }
}

async function login(page: Page) {
  await initialize(page.request);
  const response = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Everything", exact: true }),
  ).toBeVisible();
}

async function snapshot(request: APIRequestContext) {
  return (await request.get("/api/workspace")).json();
}
async function mutate(
  request: APIRequestContext,
  workspaceId: string,
  command: object,
) {
  const response = await request.post("/api/command", {
    headers: { Origin: origin },
    data: { workspaceId, command },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
const sidebar = (page: Page) => page.locator(".workspace-sidebar");

test("owner creates a real workspace, writes blocks, maintains a table, and configures a specialist", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const status = await (await page.request.get("/api/setup")).json();
  if (!status.initialized) {
    await expect(
      page.getByRole("heading", { name: "Make it your workspace." }),
    ).toBeVisible();
    await page.getByLabel("Your name", { exact: true }).fill("Alex Morgan");
    await page
      .getByLabel("Workspace name", { exact: true })
      .fill("Northstar Studio");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Setup token", { exact: true }).fill(setupToken);
    await page
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
  } else {
    await login(page);
  }
  await expect(
    page.getByRole("heading", { name: "Everything", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New project", exact: true }).click();
  const projectDialog = page.getByRole("dialog", { name: "Create a project" });
  await projectDialog
    .getByLabel("Name", { exact: true })
    .fill("Launch the first version");
  await projectDialog
    .getByLabel("Description")
    .fill("Turn customer conversations into a focused launch.");
  await projectDialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Launch the first version",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Add a task to this project")
    .fill("Speak to five founders");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Speak to five founders", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New page", exact: true }).click();
  await page.getByLabel("Page title", { exact: true }).fill("Product launch");
  const editor = page.getByRole("textbox", {
    name: "Page content",
    exact: true,
  });
  await editor.fill("Build a calmer way to run a small business.");
  await editor.press("ControlOrMeta+End");
  await editor.press("Enter");
  await editor.pressSequentially("/heading 2");
  await page.getByRole("option", { name: /^Heading 2/ }).click();
  await editor.pressSequentially("What we are learning");
  await expect(
    page.getByRole("heading", { name: "What we are learning" }),
  ).toBeVisible();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const pageUrl = page.url();
  await page.reload();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Product launch",
  );
  await expect(editor).toContainText("Build a calmer way");

  await page
    .getByRole("button", { name: "Add a nested page", exact: true })
    .click();
  await page.getByLabel("Page title", { exact: true }).fill("Interview notes");
  await editor.fill(
    "Capture the words customers use, with a source for every claim.",
  );
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await sidebar(page)
    .getByRole("button", { name: "Tables", exact: true })
    .click();
  await page.getByRole("button", { name: "New table", exact: true }).click();
  const tableDialog = page.getByRole("dialog", { name: "Create a table" });
  await tableDialog
    .getByLabel("Name", { exact: true })
    .fill("Customer interviews");
  await tableDialog
    .getByRole("button", { name: "Create table", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New row", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Name, row 1", { exact: true })
    .fill("Jamie · independent designer");
  await page.getByLabel("Name, row 1", { exact: true }).press("Tab");
  await page
    .getByLabel("Status, row 1", { exact: true })
    .selectOption("In progress");
  await expect(page.locator(".table-save-state")).toContainText(
    "All changes saved",
  );
  await page.reload();
  await expect(page.getByLabel("Name, row 1", { exact: true })).toHaveValue(
    "Jamie · independent designer",
  );

  await sidebar(page)
    .getByRole("button", { name: "Files", exact: true })
    .click();
  await page.getByLabel("Upload a file", { exact: true }).setInputFiles({
    name: "launch-brief.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Launch brief: ask before publishing customer quotes."),
  });
  await expect(
    page.getByRole("link", { name: "launch-brief.txt", exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download launch-brief.txt", exact: true })
    .click();
  expect((await downloadEvent).suggestedFilename()).toBe("launch-brief.txt");

  await page.goto(pageUrl);
  await expect(editor).toBeVisible();
  await editor.press("ControlOrMeta+End");
  await editor.press("Enter");
  await page.getByRole("button", { name: "Insert block", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Search blocks and references" })
    .fill("Customer interviews");
  await page.getByRole("option", { name: /Customer interviews/ }).click();
  await expect(
    page.getByRole("region", { name: "Customer interviews records" }),
  ).toBeVisible();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("workspace-page-desktop.png"),
    fullPage: true,
  });

  await sidebar(page)
    .getByRole("button", { name: "Your team", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create an agent", exact: true })
    .click();
  const agentDialog = page.getByRole("dialog", { name: "Create an agent" });
  await agentDialog
    .getByLabel("Agent name", { exact: true })
    .fill("Research partner");
  await agentDialog
    .getByLabel("Role", { exact: true })
    .fill("Customer research");
  await agentDialog
    .getByRole("button", { name: "Create agent", exact: true })
    .click();
  await page
    .getByLabel("Working instructions")
    .fill(
      "Summarize customer interviews with sources. Ask before contacting anyone.",
    );
  await page.getByRole("tab", { name: "Tables", exact: true }).click();
  await page.getByRole("checkbox", { name: /Customer interviews/ }).check();
  await page.getByRole("button", { name: "Save agent", exact: true }).click();
  await expect(
    page.getByText("Configuration saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Working instructions")).toHaveValue(
    "Summarize customer interviews with sources. Ask before contacting anyone.",
  );
  await expect(
    page.getByRole("tablist", { name: "Agent properties" }).getByRole("tab"),
  ).toHaveCount(6);
  await page.screenshot({
    path: testInfo.outputPath("agent-profile-desktop.png"),
    fullPage: true,
  });
  expect(runtimeErrors).toEqual([]);
});

test("API requires an owner, rejects foreign resources and stale writes, and closes setup", async ({
  request,
  playwright,
}) => {
  await initialize(request);
  const signedIn = await request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email, password },
  });
  expect(signedIn.ok(), await signedIn.text()).toBeTruthy();
  const initial = await snapshot(request);
  const workspaceId = initial.workspace.id;
  const created = await mutate(request, workspaceId, {
    type: "page.create",
    title: "Concurrency check",
  });
  const resource = created.pages.find(
    (item: { title: string }) => item.title === "Concurrency check",
  );
  await mutate(request, workspaceId, {
    type: "page.update",
    id: resource.id,
    revision: resource.revision,
    patch: { title: "The saved version" },
  });
  const stale = await request.post("/api/command", {
    headers: { Origin: origin },
    data: {
      workspaceId,
      command: {
        type: "page.update",
        id: resource.id,
        revision: resource.revision,
        patch: { title: "Stale overwrite" },
      },
    },
  });
  expect(stale.status()).toBe(409);
  const other = await mutate(request, workspaceId, {
    type: "workspace.create",
    name: "Separate workspace",
  });
  const foreign = await request.post("/api/command", {
    headers: { Origin: origin },
    data: {
      workspaceId: other.workspace.id,
      command: {
        type: "page.update",
        id: resource.id,
        revision: resource.revision,
        patch: { title: "Cross-workspace overwrite" },
      },
    },
  });
  expect(foreign.status()).toBe(404);
  const csrf = await request.post("/api/command", {
    headers: { Origin: "https://unrelated.example" },
    data: {
      workspaceId,
      command: { type: "workspace.rename", name: "Should not change" },
    },
  });
  expect(csrf.status()).toBe(403);
  const setupAgain = await request.post("/api/setup", {
    headers: { Origin: origin },
    data: {
      name: "Another owner",
      email: "other@example.test",
      password,
      workspaceName: "No",
      setupToken,
    },
  });
  expect(setupAgain.status()).toBe(409);
  const uploaded = await request.post(`/api/files?workspaceId=${workspaceId}`, {
    headers: { Origin: origin },
    multipart: {
      file: {
        name: "private-brief.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Private workspace reference"),
      },
    },
  });
  expect(uploaded.ok(), await uploaded.text()).toBeTruthy();
  const file = (await uploaded.json()).files.find(
    (item: { name: string }) => item.name === "private-brief.txt",
  );
  const downloaded = await request.get(
    `/api/files/${file.id}?workspaceId=${workspaceId}`,
  );
  expect(downloaded.status()).toBe(200);
  expect(downloaded.headers()["content-disposition"]).toContain("attachment;");
  expect(await downloaded.text()).toBe("Private workspace reference");
  const exported = await request.get(
    `/api/export?workspaceId=${workspaceId}&type=page&id=${resource.id}&format=json`,
  );
  expect(exported.ok(), await exported.text()).toBeTruthy();
  const outsider = await playwright.request.newContext({ baseURL: origin });
  expect((await outsider.get("/api/workspace")).status()).toBe(401);
  expect(
    (
      await outsider.post("/api/auth/sign-up/email", {
        headers: { Origin: origin },
        data: { name: "Outsider", email: "outsider@example.test", password },
      })
    ).status(),
  ).toBe(404);
  if (file)
    expect(
      (
        await outsider.get(`/api/files/${file.id}?workspaceId=${workspaceId}`)
      ).status(),
    ).toBe(401);
  await outsider.dispose();
  expect(
    (await snapshot(request)).pages.find(
      (item: { id: string }) => item.id === resource.id,
    ).title,
  ).toBe("The saved version");
});

test("mobile navigation, editor, and team panel stay usable at 390 and 320 pixels", async ({
  page,
}, testInfo) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Workspace navigation",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await drawer
    .getByRole("button", { name: "Workspace pages", exact: true })
    .click();
  await expect(drawer).not.toBeVisible();
  await page.getByRole("button", { name: "New page", exact: true }).click();
  await page.getByLabel("Page title").fill("A note on the move");
  await page
    .getByRole("textbox", { name: "Page content" })
    .fill("A small idea, safely saved from my phone.");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Your team", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Your team", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close team panel", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("workspace-page-mobile.png"),
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
});
