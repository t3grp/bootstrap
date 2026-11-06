import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { ProviderStatus, RunLimits } from "@bootstrap/core";

export const DEFAULT_RUN_LIMITS: RunLimits = {
  maxSteps: 1,
  maxInputTokens: 16_000,
  maxOutputTokens: 2_048,
  timeoutMs: 120_000,
};
export const HARD_RUN_LIMITS: RunLimits = {
  maxSteps: 1,
  maxInputTokens: 32_000,
  maxOutputTokens: 4_096,
  timeoutMs: 300_000,
};

type Settings = ProviderStatus & {
  fingerprint: string;
  baseURL?: string;
  apiKey?: string;
  delayMs?: number;
};
/** Only this sanitized projection can cross the HTTP boundary. */
export function providerStatus(
  env: NodeJS.ProcessEnv = process.env,
): ProviderStatus {
  const { ready, kind, model, message, limits } = providerSettings(env);
  return { ready, kind, model, message, limits };
}
export function providerSettings(
  env: NodeJS.ProcessEnv = process.env,
): Settings {
  const limits = { ...DEFAULT_RUN_LIMITS };
  const missing = (message: string): Settings => ({
    ready: false,
    kind: "unconfigured",
    model: null,
    message,
    limits,
    fingerprint: "",
  });
  for (const [key, variable] of [
    ["maxInputTokens", "BOOTSTRAP_AGENT_MAX_INPUT_TOKENS"],
    ["maxOutputTokens", "BOOTSTRAP_AGENT_MAX_OUTPUT_TOKENS"],
    ["timeoutMs", "BOOTSTRAP_AGENT_TIMEOUT_MS"],
  ] as const) {
    if (env[variable] !== undefined) {
      const value = Number(env[variable]);
      if (
        !Number.isSafeInteger(value) ||
        value < 1 ||
        value > HARD_RUN_LIMITS[key]
      )
        return missing(
          `Configure ${variable} between 1 and ${HARD_RUN_LIMITS[key]}.`,
        );
      limits[key] = value;
    }
  }
  const kind = env.BOOTSTRAP_MODEL_PROVIDER;
  if (!kind)
    return missing(
      "Agent execution is not configured. Your workspace is available. Set a server-side model provider to run an assignment.",
    );
  if (kind === "deterministic") {
    if (env.BOOTSTRAP_ENABLE_TEST_PROVIDER !== "true")
      return missing(
        "The deterministic test provider requires BOOTSTRAP_ENABLE_TEST_PROVIDER=true. It does not call AI.",
      );
    const delayMs = Number(env.BOOTSTRAP_TEST_PROVIDER_DELAY_MS ?? 40);
    if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 1000)
      return missing(
        "BOOTSTRAP_TEST_PROVIDER_DELAY_MS must be between 0 and 1000.",
      );
    return {
      ready: true,
      kind,
      model: "deterministic-v1",
      message:
        "Deterministic test provider — fixture output, no live AI and no model charges.",
      limits,
      fingerprint: "deterministic-v1",
      delayMs,
    };
  }
  if (kind !== "openai-compatible")
    return missing(
      "BOOTSTRAP_MODEL_PROVIDER must be openai-compatible or deterministic.",
    );
  const model = env.BOOTSTRAP_MODEL_ID?.trim();
  const apiKey = env.BOOTSTRAP_MODEL_API_KEY?.trim();
  const baseURL = env.BOOTSTRAP_MODEL_BASE_URL?.trim();
  if (
    !model ||
    !apiKey ||
    !baseURL ||
    /^(replace-with|change-me|your-)/i.test(apiKey)
  )
    return missing(
      "Set BOOTSTRAP_MODEL_ID, BOOTSTRAP_MODEL_BASE_URL, and BOOTSTRAP_MODEL_API_KEY on the server. No test fallback is used.",
    );
  try {
    const url = new URL(baseURL);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
        ))
    )
      throw new Error();
  } catch {
    return missing(
      "BOOTSTRAP_MODEL_BASE_URL must be HTTPS (or HTTP on loopback for a local provider), without credentials, query, or fragment.",
    );
  }
  return {
    ready: true,
    kind,
    model,
    apiKey,
    baseURL,
    limits,
    message:
      "Live model configured. Assignments use the operator’s provider account and may incur model charges.",
    fingerprint: createHash("sha256")
      .update(`${kind}\n${baseURL}\n${model}`)
      .digest("hex"),
  };
}

export type ProviderInput = {
  system: string;
  prompt: string;
  maxOutputTokens: number;
  requestId: string;
  signal: AbortSignal;
};
export type ProviderChunk =
  | { type: "text"; text: string }
  | {
      type: "finish";
      inputTokens: number | null;
      outputTokens: number | null;
      reason: string;
    };
export interface ModelProvider {
  kind: "deterministic" | "openai-compatible";
  model: string;
  fingerprint: string;
  stream(input: ProviderInput): AsyncIterable<ProviderChunk>;
}

export function deterministicProvider(delayMs = 0): ModelProvider {
  return {
    kind: "deterministic",
    model: "deterministic-v1",
    fingerprint: "deterministic-v1",
    async *stream(input) {
      // Deliberately mechanical: never imply that this fixture reasoned about business data.
      const output = `Deterministic test output — no AI model was called.\n\nAssignment and selected context received:\n${input.prompt.slice(0, 1800)}\n\nReview this fixture before saving. A live provider is needed for an AI-authored response.`;
      const bounded = output.slice(0, input.maxOutputTokens);
      for (let offset = 0; offset < bounded.length; offset += 80) {
        input.signal.throwIfAborted();
        if (delayMs) await delay(delayMs, undefined, { signal: input.signal });
        yield { type: "text", text: bounded.slice(offset, offset + 80) };
      }
      yield {
        type: "finish",
        inputTokens: Buffer.byteLength(input.system + input.prompt),
        outputTokens: bounded.length,
        reason: output.length > bounded.length ? "length" : "stop",
      };
    },
  };
}

export async function configuredProvider(
  settings = providerSettings(),
): Promise<ModelProvider> {
  if (!settings.ready || !settings.model)
    throw new Error("Provider is not configured");
  if (settings.kind === "deterministic")
    return deterministicProvider(settings.delayMs);
  const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
  const { streamText } = await import("ai");
  const provider = createOpenAICompatible({
    name: "bootstrap",
    baseURL: settings.baseURL!,
    apiKey: settings.apiKey!,
    includeUsage: true,
    // Credentials are operator-configured and must not follow an unexpected redirect.
    fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
  });
  return {
    kind: "openai-compatible",
    model: settings.model,
    fingerprint: settings.fingerprint,
    async *stream(input) {
      const result = streamText({
        model: provider(settings.model!),
        instructions: input.system,
        prompt: input.prompt,
        maxOutputTokens: input.maxOutputTokens,
        maxRetries: 0,
        abortSignal: input.signal,
        headers: { "X-Bootstrap-Request-Id": input.requestId },
        onError: () => undefined, // SDK defaults must not log provider bodies or private prompts.
        // No tools, external actions, implicit delegation, or SDK retries.
      });
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") yield { type: "text", text: part.text };
        if (part.type === "error")
          throw new Error("The model provider failed.");
      }
      const usage = await result.totalUsage;
      yield {
        type: "finish",
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        reason: await result.finishReason,
      };
    },
  };
}
