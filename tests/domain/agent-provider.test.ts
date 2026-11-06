import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configuredProvider,
  providerSettings,
  providerStatus,
} from "../../apps/web/src/lib/server/agent-provider";

const environment = {
  BOOTSTRAP_MODEL_PROVIDER: "openai-compatible",
  BOOTSTRAP_MODEL_ID: "fixture-model",
  BOOTSTRAP_MODEL_BASE_URL: "https://never-dispatched.example.test/v1",
  BOOTSTRAP_MODEL_API_KEY: "fixture-key-no-real-credentials",
};
afterEach(() => vi.unstubAllGlobals());

describe("server-side provider contract (mock transport only)", () => {
  it("passes bounded streaming options and server-only credentials through the installed AI SDK", async () => {
    const events = [
      {
        id: "fixture",
        object: "chat.completion.chunk",
        created: 1,
        model: "fixture-model",
        choices: [
          {
            index: 0,
            delta: { role: "assistant", content: "A fixture response [S1]." },
            finish_reason: null,
          },
        ],
      },
      {
        id: "fixture",
        object: "chat.completion.chunk",
        created: 1,
        model: "fixture-model",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 7, total_tokens: 17 },
      },
    ];
    const fetch = vi.fn(
      async () =>
        new Response(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") +
            "data: [DONE]\n\n",
          { headers: { "content-type": "text/event-stream" } },
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const adapter = await configuredProvider(providerSettings(environment));
    const chunks = [];
    for await (const part of adapter.stream({
      system: "Bound system instruction",
      prompt: "Selected source only",
      maxOutputTokens: 32,
      requestId: "fixed-request-id",
      signal: new AbortController().signal,
    }))
      chunks.push(part);
    expect(chunks.filter((part) => part.type === "text")).toEqual([
      { type: "text", text: "A fixture response [S1]." },
    ]);
    expect(chunks.at(-1)).toMatchObject({
      type: "finish",
      inputTokens: 10,
      outputTokens: 7,
      reason: "stop",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const call = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(call[0])).toBe(
      "https://never-dispatched.example.test/v1/chat/completions",
    );
    const headers = new Headers(call[1].headers);
    expect(headers.get("authorization")).toBe(
      "Bearer fixture-key-no-real-credentials",
    );
    expect(headers.get("x-bootstrap-request-id")).toBe("fixed-request-id");
    const request = JSON.parse(call[1].body as string);
    expect(request.max_tokens).toBe(32);
    expect(request.stream).toBe(true);
    expect(request.tools).toBeUndefined();
    expect(call[1].redirect).toBe("error");
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(providerStatus(environment))).not.toContain(
      environment.BOOTSTRAP_MODEL_API_KEY,
    );
  });

  it("makes no automatic retry and does not expose a provider error body", async () => {
    const fetch = vi.fn(
      async () =>
        new Response('{"error":{"message":"PRIVATE_PROVIDER_DETAIL"}}', {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const adapter = await configuredProvider(providerSettings(environment));
    const consume = async () => {
      for await (const _ of adapter.stream({
        system: "test",
        prompt: "test",
        maxOutputTokens: 10,
        requestId: "no-retry",
        signal: new AbortController().signal,
      })) {
        /* consume */
      }
    };
    await expect(consume()).rejects.toThrow("The model provider failed.");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid endpoints and never silently falls back to the test provider", async () => {
    for (const baseURL of [
      "http://remote.example.test/v1",
      "https://user:pass@example.test/v1",
      "https://example.test/v1?token=secret",
    ])
      expect(
        providerStatus({ ...environment, BOOTSTRAP_MODEL_BASE_URL: baseURL })
          .ready,
      ).toBe(false);
    const missing = providerSettings({
      ...environment,
      BOOTSTRAP_MODEL_API_KEY: "",
    });
    expect(missing.ready).toBe(false);
    await expect(configuredProvider(missing)).rejects.toThrow("not configured");
  });
});
