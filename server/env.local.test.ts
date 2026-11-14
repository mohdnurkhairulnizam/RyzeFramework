import { afterAll, describe, expect, it, vi } from "vitest";

vi.stubEnv("RYZE_LOCAL_MODE", "true");
vi.stubEnv("OAUTH_SERVER_URL", "https://oauth.invalid");
vi.stubEnv("DATABASE_URL", "mysql://unexpected.invalid/example");
vi.stubEnv("BUILT_IN_FORGE_API_URL", "https://forge.invalid");
vi.stubEnv("BUILT_IN_FORGE_API_KEY", "inherited-test-secret");
vi.stubEnv("RYZE_WORKER_TOKEN", "inherited-test-worker-token");

const { ENV } = await import("./_core/env");

afterAll(() => vi.unstubAllEnvs());

describe("standalone local environment boundary", () => {
  it("ignores inherited hosted endpoints and credentials", () => {
    expect(ENV.localMode).toBe(true);
    expect(ENV.oAuthServerUrl).toBe("");
    expect(ENV.databaseUrl).toBe("");
    expect(ENV.forgeApiUrl).toBe("");
    expect(ENV.forgeApiKey).toBe("");
    expect(ENV.workerToken).toBe("");
  });
});
