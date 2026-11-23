import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: {
    localMode: true,
    openCodeBaseUrl: "http://127.0.0.1:4096",
    openCodeServerUsername: "opencode",
    openCodeServerPassword: "test-password",
    freeLlmApiBaseUrl: "https://gateway.example/v1",
    freeLlmApiKey: "gateway-test-key",
    freeLlmApiModel: "test-model",
  },
}));

import { createOpenCodeConversation, getIntegrationStatus, OpenCodeError, sendOpenCodePrompt } from "./openCode";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

describe("OpenCode chat adapter", () => {
  it("probes the local OpenCode service and the configured gateway without returning credentials", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/api/info")) return jsonResponse({ version: "test" });
      if (url.endsWith("/models")) return jsonResponse({ data: [{ id: "auto" }] });
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const status = await getIntegrationStatus();
    expect(status).toEqual({ localMode: true, openCode: "connected", freeLlmApi: "connected", chatReady: true });
    const gatewayRequest = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/models"))?.[1];
    expect(new Headers(gatewayRequest?.headers).get("Authorization")).toBe("Bearer gateway-test-key");
    expect(JSON.stringify(status)).not.toContain("gateway-test-key");
  });

  it("creates a Ryze session with the OpenCode API's providerID/id model reference", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        agent: "ryze-chat",
        model: { providerID: "freellmapi", id: "selected" },
      });
      return jsonResponse({ data: { id: "ses_1234567890" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createOpenCodeConversation("A test session")).resolves.toBe("ses_1234567890");
  });

  it("sends prompt text and extracts only assistant text content from the OpenCode message list", async () => {
    vi.stubGlobal("setTimeout", ((callback: (...args: unknown[]) => void) => {
      callback();
      return 0;
    }) as typeof setTimeout);
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/prompt")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({ text: "Hello Ryze", resume: true });
        return jsonResponse({ data: { id: "message-user" } });
      }
      if (url.includes("/message?")) {
        return jsonResponse({ data: [{
          id: "message-assistant",
          type: "assistant",
          time: { created: Date.now(), completed: Date.now() },
          finish: "stop",
          content: [
            { type: "reasoning", text: "private reasoning is not shown" },
            { type: "text", text: "Hello from FreeLLMAPI." },
          ],
        }], cursor: { previous: null, next: null } });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendOpenCodePrompt("ses_1234567890", "Hello Ryze")).resolves.toBe("Hello from FreeLLMAPI.");
  });

  it("does not expose gateway or OpenCode secrets in a failed prompt error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "private upstream error" }, 500)));
    await expect(sendOpenCodePrompt("ses_1234567890", "Hello Ryze")).rejects.toMatchObject({
      name: "OpenCodeError",
      message: expect.not.stringContaining("private upstream error"),
    } satisfies Partial<OpenCodeError>);
  });
});
