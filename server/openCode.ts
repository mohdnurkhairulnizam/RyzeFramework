import { ENV } from "./_core/env";

type OpenCodeMessage = {
  id?: string;
  type?: string;
  time?: { created?: number; completed?: number };
  finish?: string;
  outcome?: string;
  error?: { message?: string };
  content?: Array<{ type?: string; text?: string }>;
  parts?: Array<{ type?: string; text?: string }>;
};

export type IntegrationStatus = {
  localMode: boolean;
  openCode: "connected" | "unavailable" | "not_configured";
  freeLlmApi: "connected" | "unavailable" | "unauthorized" | "not_configured";
  chatReady: boolean;
};

export class OpenCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenCodeError";
  }
}

function openCodeAuthHeader() {
  if (!ENV.openCodeServerPassword) throw new OpenCodeError("The local OpenCode password is missing. Preserve the local data folder and .env before repairing the installation.");
  const token = Buffer.from(`${ENV.openCodeServerUsername}:${ENV.openCodeServerPassword}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function timedSignal(timeoutMs: number) {
  return AbortSignal.timeout(timeoutMs);
}

async function openCodeRequest(path: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const base = ENV.openCodeBaseUrl.replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: openCodeAuthHeader(),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      signal: timedSignal(timeoutMs),
    });
  } catch {
    throw new OpenCodeError("The local OpenCode service is unavailable. Start Ryze again and check opencode-error.log.");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new OpenCodeError("The local OpenCode service rejected its private credential. Stop and restart Ryze.");
    const message = response.status >= 500
      ? "OpenCode could not complete the request. Check the FreeLLMAPI URL, selected model, gateway key, and OpenCode logs."
      : `OpenCode rejected the request (HTTP ${response.status}).`;
    throw new OpenCodeError(message);
  }
  if (response.status === 204) return null;
  try { return await response.json() as any; }
  catch { throw new OpenCodeError("OpenCode returned an unreadable response."); }
}

async function probeFreeLlmApi(): Promise<IntegrationStatus["freeLlmApi"]> {
  if (!ENV.localMode || !ENV.freeLlmApiKey || !ENV.freeLlmApiBaseUrl) return "not_configured";
  try {
    const base = ENV.freeLlmApiBaseUrl.replace(/\/+$/, "");
    const response = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${ENV.freeLlmApiKey}` },
      signal: timedSignal(5_000),
      redirect: "error",
    });
    if (response.status === 401 || response.status === 403) return "unauthorized";
    return response.ok ? "connected" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  if (!ENV.localMode) return { localMode: false, openCode: "not_configured", freeLlmApi: "not_configured", chatReady: false };
  const [openCodeResponse, freeLlmApi] = await Promise.all([
    openCodeRequest("/api/info").then(() => true).catch(() => false),
    probeFreeLlmApi(),
  ]);
  const openCode = openCodeResponse ? "connected" : "unavailable";
  return { localMode: true, openCode, freeLlmApi, chatReady: openCode === "connected" && freeLlmApi === "connected" };
}

async function createOpenCodeSession(title: string) {
  const response = await openCodeRequest("/api/session", {
    method: "POST",
    body: JSON.stringify({
      title: title.slice(0, 80),
      agent: "ryze-chat",
      model: { providerID: "freellmapi", id: "selected" },
    }),
  });
  const sessionId = response?.data?.id ?? response?.id;
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(sessionId)) {
    throw new OpenCodeError("OpenCode did not return a valid conversation ID.");
  }
  return sessionId;
}

export async function createOpenCodeConversation(title: string) {
  return createOpenCodeSession(title);
}

function extractText(message: OpenCodeMessage) {
  const content = message.content ?? message.parts ?? [];
  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function sendOpenCodePrompt(sessionId: string, prompt: string) {
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(sessionId)) throw new OpenCodeError("The saved OpenCode conversation ID is invalid.");
  const encodedId = encodeURIComponent(sessionId);
  const startedAt = Date.now();
  await openCodeRequest(`/api/session/${encodedId}/prompt`, {
    method: "POST",
    body: JSON.stringify({ text: prompt.slice(0, 5000), resume: true }),
  }, 15_000);

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const result = await openCodeRequest(`/api/session/${encodedId}/message?limit=20&order=desc&type=assistant`, {}, 8_000);
    const messages = Array.isArray(result?.data) ? result.data as OpenCodeMessage[] : [];
    const latest = messages.find((message) => message.type === "assistant" && typeof message.time?.created === "number" && message.time.created >= startedAt);
    if (!latest) continue;
    if (latest.error || latest.finish === "error" || latest.outcome === "failed") {
      throw new OpenCodeError("FreeLLMAPI/OpenCode reported a model error. Check the configured gateway, model, key, and quota.");
    }
    if (typeof latest.time?.completed === "number" || latest.finish) {
      const answer = extractText(latest);
      if (answer) return answer.slice(0, 10_000);
      throw new OpenCodeError("The model completed without a text reply. Check the FreeLLMAPI model configuration.");
    }
  }
  throw new OpenCodeError("The model did not finish within two minutes. Check FreeLLMAPI status and retry.");
}
