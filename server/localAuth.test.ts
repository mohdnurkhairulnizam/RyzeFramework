import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes, scryptSync } from "node:crypto";
import express from "express";
import { createServer, type Server } from "node:http";

const testPassphrase = ["Correct", "Horse", "Battery", "42!"].join("-");
const rejectedPassphrase = ["incorrect", "test", "credential", "000"].join("-");
const salt = randomBytes(32);
vi.stubEnv("RYZE_LOCAL_MODE", "true");
vi.stubEnv("JWT_SECRET", randomBytes(48).toString("hex"));
vi.stubEnv("RYZE_LOCAL_PASSWORD_SALT", salt.toString("hex"));
vi.stubEnv("RYZE_LOCAL_PASSWORD_HASH", scryptSync(testPassphrase, salt, 64).toString("hex"));
vi.stubEnv("RYZE_LOCAL_OWNER_OPEN_ID", "ryze-local-auth-test-owner");

const { registerLocalAuthRoutes } = await import("./_core/localAuth");
const { sdk } = await import("./_core/sdk");
let server: Server;
let origin = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "2kb" }));
  registerLocalAuthRoutes(app);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind.");
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  vi.unstubAllEnvs();
});

describe("local owner sign-in", () => {
  it("rejects cross-origin sign-in and accepts a valid password from localhost", async () => {
    const crossOrigin = await fetch(`${origin}/api/local-auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://attacker.example" },
      body: JSON.stringify({ password: testPassphrase }),
    });
    expect(crossOrigin.status).toBe(403);

    const response = await fetch(`${origin}/api/local-auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ password: testPassphrase }),
    });
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("app_session_id=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    const token = cookie.match(/app_session_id=([^;]+)/)?.[1];
    const session = await sdk.verifySession(token);
    expect(session?.openId).toBe("ryze-local-auth-test-owner");
  });

  it("returns a generic denial for wrong passwords and temporarily locks repeated failures", async () => {
    let last: Response | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      last = await fetch(`${origin}/api/local-auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ password: rejectedPassphrase }),
      });
    }
    expect(last?.status).toBe(401);
    const locked = await fetch(`${origin}/api/local-auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ password: testPassphrase }),
    });
    expect(locked.status).toBe(429);
  });
});
