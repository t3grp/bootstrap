import type {
  ApiErrorBody,
  SetupInput,
  SetupStatus,
  WorkspaceCommand,
  WorkspaceSnapshot,
  AgentRun,
  AssignmentInput,
  ProviderStatus,
  RunStatus,
} from "@bootstrap/core";

export class ApiError extends Error {
  status: number;
  code?: string;
  currentRevision?: number;
  constructor(
    status: number,
    body: Partial<ApiErrorBody> & { message?: string },
  ) {
    super(body.error || body.message || `Request failed (${status}).`);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.currentRevision = body.currentRevision;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({
    error: "The server returned an unexpected response. Try again.",
  }));
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export function getWorkspace(workspaceId?: string) {
  return request<WorkspaceSnapshot>(
    `/api/workspace${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`,
  );
}

export function command(workspaceId: string, command: WorkspaceCommand) {
  return request<WorkspaceSnapshot>("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, command }),
  });
}

export function uploadFile(workspaceId: string, file: File) {
  const data = new FormData();
  data.set("file", file);
  return request<WorkspaceSnapshot>(
    `/api/files?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "POST", body: data },
  );
}

export function getSetupStatus() {
  return request<SetupStatus>("/api/setup");
}
export function setup(input: SetupInput) {
  return request<{ initialized: boolean }>("/api/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
export async function signIn(email: string, password: string) {
  await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });
}
export async function signOut() {
  await request("/api/auth/sign-out", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export type RunListItem = {
  id: string;
  title: string;
  status: RunStatus;
  createdAt: string;
};
export function getAgentRuns(workspaceId: string, agentId: string) {
  return request<{ provider: ProviderStatus; runs: RunListItem[] }>(
    `/api/agent-runs?workspaceId=${encodeURIComponent(workspaceId)}&agentId=${encodeURIComponent(agentId)}`,
  );
}
export function getAgentRun(workspaceId: string, runId: string) {
  return request<AgentRun>(
    `/api/agent-runs/${encodeURIComponent(runId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}
export function submitAssignment(workspaceId: string, input: AssignmentInput) {
  return request<AgentRun>(
    `/api/agent-runs?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}
export function changeAgentRun(
  workspaceId: string,
  runId: string,
  action: "cancel" | "save",
) {
  return request<AgentRun>(
    `/api/agent-runs/${encodeURIComponent(runId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
}
