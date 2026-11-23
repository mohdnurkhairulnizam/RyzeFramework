import { describe, expect, it } from "vitest";
import { isTemporaryAuthorizationActive } from "./db";

describe("temporary Telegram authorization expiry", () => {
  it("allows authorization before expiry and rejects it at and after expiry", () => {
    const issuedAt = Date.parse("2026-11-24T00:00:00.000Z");
    const expiresAt = new Date(issuedAt + 60 * 60 * 1000);
    expect(isTemporaryAuthorizationActive(expiresAt, issuedAt + 59 * 60 * 1000)).toBe(true);
    expect(isTemporaryAuthorizationActive(expiresAt, issuedAt + 60 * 60 * 1000)).toBe(false);
    expect(isTemporaryAuthorizationActive(expiresAt, issuedAt + 61 * 60 * 1000)).toBe(false);
  });
});
