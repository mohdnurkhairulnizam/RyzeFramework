import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadEnv() {
  vi.resetModules();
  return (await import("./_core/env")).ENV;
}

describe("FreeLLMAPI endpoint validation", () => {
  it("accepts a hosted HTTPS API base URL", async () => {
    vi.stubEnv("RYZE_LOCAL_MODE", "true");
    vi.stubEnv("RYZE_FREELLMAPI_BASE_URL", "https://gateway.example/v1");
    expect((await loadEnv()).freeLlmApiBaseUrl).toBe("https://gateway.example/v1");
  });

  it("accepts HTTP only for a loopback gateway", async () => {
    vi.stubEnv("RYZE_LOCAL_MODE", "true");
    vi.stubEnv("RYZE_FREELLMAPI_BASE_URL", "http://127.0.0.1:3001/v1");
    expect((await loadEnv()).freeLlmApiBaseUrl).toBe("http://127.0.0.1:3001/v1");
  });

  it.each([
    "http://gateway.example/v1",
    "https://user:pass@gateway.example/v1",
    "https://gateway.example/v1?key=secret",
    "https://gateway.example/v1#fragment",
    "not-a-url",
  ])("rejects unsafe or malformed endpoint %s", async (baseUrl) => {
    vi.stubEnv("RYZE_LOCAL_MODE", "true");
    vi.stubEnv("RYZE_FREELLMAPI_BASE_URL", baseUrl);
    await expect(loadEnv()).rejects.toThrow();
  });

  it("does not use a hosted endpoint in non-local mode", async () => {
    vi.stubEnv("RYZE_LOCAL_MODE", "false");
    vi.stubEnv("RYZE_FREELLMAPI_BASE_URL", "https://gateway.example/v1");
    expect((await loadEnv()).freeLlmApiBaseUrl).toBe("");
  });
});
