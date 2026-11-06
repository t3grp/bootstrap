import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import type { AgentRun, WorkspaceSnapshot } from "@bootstrap/core";

const origin = `http://127.0.0.1:${process.env.E2E_PORT || "3100"}`;
const credentials = {
  email: "founder@example.test",
  password: "Build-things-together-2026!",
};
async function command(
  request: APIRequestContext,
  workspaceId: string,
  command: object,
): Promise<WorkspaceSnapshot> {
  const response = await request.post("/api/command", {
    headers: { Origin: origin },
    data: { workspaceId, command },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function fixture(request: APIRequestContext) {
  const status = await (await request.get("/api/setup")).json();
  if (!status.initialized) {
    const setup = await request.post("/api/setup", {
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
  const login = await request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: credentials,
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const initial: WorkspaceSnapshot = await (
    await request.get("/api/workspace")
  ).json();
  let state = await command(request, initial.workspace.id, {
    type: "workspace.create",
    name: `Agent acceptance ${randomUUID().slice(0, 6)}`,
  });
  const workspaceId = state.workspace.id;
  const pageId = state.pages[0].id;
  state = await command(request, workspaceId, {
    type: "page.update",
    id: pageId,
    revision: state.pages[0].revision,
    patch: {
      title: "Customer research brief",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { id: randomUUID() },
            content: [
              {
                type: "text",
                text: "Customers asked for a calmer weekly review and a short list of next steps.",
              },
            ],
          },
        ],
      },
    },
  });
  state = await command(request, workspaceId, {
    type: "agent.create",
    name: "Customer researcher",
    role: "Research and synthesis",
  });
  const agentId = state.agents[0].id;
  state = await command(request, workspaceId, {
    type: "agent.update",
    id: agentId,
    patch: {
      instructions:
        "Use the selected source and cite it. Suggest a useful next step.",
      pageIds: [pageId],
    },
  });
  return { state, workspaceId, pageId, agentId };
}

test("owner selects a specialist and sources, sees streaming progress, saves, and reloads the result receipt", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { workspaceId, agentId, pageId } = await fixture(page.request);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(`/w/${workspaceId}/team`);
  await page
    .locator(".agent-card")
    .filter({ hasText: "Customer researcher" })
    .click();
  await page.getByRole("tab", { name: "Assignments", exact: true }).click();
  await expect(
    page.getByText(/Deterministic test provider — fixture output/),
  ).toBeVisible();
  await page
    .getByLabel("Assignment", { exact: true })
    .fill("Summarize the chosen brief and recommend a founder’s next step.");
  await page
    .getByLabel("Result page title", { exact: true })
    .fill("Founder weekly review");
  await page
    .getByRole("checkbox", {
      name: "Select page: Customer research brief",
      exact: true,
    })
    .check();
  const admitted = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/agent-runs",
  );
  await page
    .getByRole("button", { name: "Run assignment", exact: true })
    .click();
  const run: AgentRun = await (await admitted).json();
  expect(run.sources).toMatchObject([{ id: pageId, kind: "page" }]);
  await expect(page.locator(".run-status")).toHaveText("Working");
  await expect(
    page.getByLabel("Agent response", { exact: true }),
  ).toContainText("Deterministic test output");
  // Browser disconnect does not own the run. The query restores its exact receipt.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Founder weekly review", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".run-status")).toHaveText("Ready to review", {
    timeout: 20000,
  });
  const complete: AgentRun = await (
    await page.request.get(
      `/api/agent-runs/${run.id}?workspaceId=${workspaceId}`,
    )
  ).json();
  expect(complete.events.some((event) => event.type === "output.delta")).toBe(
    true,
  );
  expect(complete.steps).toBe(1);
  expect(complete.messages).toHaveLength(2);
  await page.getByText("Sources and run history", { exact: true }).click();
  await expect(page.locator(".run-sources")).toContainText(
    "Customer research brief",
  );
  await page.screenshot({
    path: testInfo.outputPath("agent-assignment-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Save result to workspace", exact: true })
    .click();
  await expect(page.locator(".run-status")).toHaveText("Saved to workspace");
  await page
    .getByRole("button", { name: "Open saved result", exact: true })
    .click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Founder weekly review",
  );
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Page content", exact: true }),
  ).toContainText("no AI model was called");
  const provenance = page.getByRole("region", {
    name: "Agent result provenance",
  });
  await provenance
    .getByText("Sources and run history", { exact: true })
    .click();
  await expect(provenance).toContainText(run.id);
  await expect(provenance.locator(".run-sources")).toContainText(
    "Customer research brief",
  );
  await expect(provenance.locator(".run-events")).toContainText(
    "owner accepted this result",
  );
  // Responsive assignment history remains reachable through the same agent route.
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`/w/${workspaceId}/team/${agentId}?chat=1&run=${run.id}`);
  await expect(page.locator(".run-status")).toHaveText("Saved to workspace");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("agent-assignment-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("HTTP boundaries cover unauthorized resources and SSE, idempotency, cancellation, and limits", async ({
  request,
  playwright,
}) => {
  const { state, workspaceId, agentId, pageId } = await fixture(request);
  const anonymous = await playwright.request.newContext({ baseURL: origin });
  const payload = {
    operationKey: randomUUID(),
    agentId,
    prompt: "Review the selected source.",
    outputTitle: "HTTP assignment",
    resources: [
      { kind: "page", id: pageId, version: String(state.pages[0].revision) },
    ],
  };
  const submit = (data: object) =>
    request.post(`/api/agent-runs?workspaceId=${workspaceId}`, {
      headers: { Origin: origin },
      data,
    });
  expect(
    (
      await anonymous.get(`/api/agent-runs?workspaceId=${workspaceId}`)
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post(`/api/agent-runs?workspaceId=${workspaceId}`, {
        headers: { Origin: "https://untrusted.example.test" },
        data: payload,
      })
    ).status(),
  ).toBe(403);
  const elsewhere = await command(request, workspaceId, {
    type: "workspace.create",
    name: "Other business",
  });
  expect(
    (
      await submit({
        ...payload,
        resources: [{ kind: "page", id: elsewhere.pages[0].id, version: "1" }],
      })
    ).status(),
  ).toBe(403);
  const response = await submit(payload);
  expect(response.status(), await response.text()).toBe(201);
  const run: AgentRun = await response.json();
  expect((await (await submit(payload)).json()).id).toBe(run.id);
  expect(
    (await submit({ ...payload, prompt: "Altered duplicate" })).status(),
  ).toBe(409);
  expect(
    (
      await anonymous.get(
        `/api/agent-runs/${run.id}/events?workspaceId=${workspaceId}`,
      )
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.get(
        `/api/agent-runs/${run.id}/events?workspaceId=${elsewhere.workspace.id}`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(
        `/api/agent-runs/${run.id}?workspaceId=${elsewhere.workspace.id}`,
      )
    ).status(),
  ).toBe(404);
  const cancel = await request.post(
    `/api/agent-runs/${run.id}?workspaceId=${workspaceId}`,
    { headers: { Origin: origin }, data: { action: "cancel" } },
  );
  expect((await cancel.json()).status).toBe("cancelled");
  const incomplete = await request.post(
    `/api/agent-runs/${run.id}?workspaceId=${workspaceId}`,
    { headers: { Origin: origin }, data: { action: "save" } },
  );
  expect(incomplete.status()).toBe(409);
  const limitedResponse = await submit({
    ...payload,
    operationKey: randomUUID(),
    limits: { maxOutputTokens: 16 },
  });
  expect(limitedResponse.status(), await limitedResponse.text()).toBe(201);
  const limited: AgentRun = await limitedResponse.json();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(
              `/api/agent-runs/${limited.id}?workspaceId=${workspaceId}`,
            )
          ).json()
        ).status,
      { timeout: 20000 },
    )
    .toBe("paused_budget");
  const final: AgentRun = await (
    await request.get(
      `/api/agent-runs/${limited.id}?workspaceId=${workspaceId}`,
    )
  ).json();
  expect(final.errorCode).toBe("OUTPUT_LIMIT");
  const cursor = final.events.at(-2)!.sequence;
  const replay = await request.get(
    `/api/agent-runs/${limited.id}/events?workspaceId=${workspaceId}&after=${cursor}`,
  );
  expect(replay.headers()["content-type"]).toBe("text/event-stream");
  const stream = await replay.text();
  expect(stream).toContain(`id: ${cursor + 1}\n`);
  expect(stream).not.toContain(`id: ${cursor}\n`);
  expect(stream).toContain("event: terminal");
  await anonymous.dispose();
});
