import { describe, expect, it } from "vitest";
import { activeMemoryProvider, getMemoryProviderRuntimeHealth } from "./memoryProviderRuntime";
import { sqliteMemoryProvider } from "./sqliteMemoryProvider";

describe("memory provider runtime selector", () => {
  it("keeps the default runtime disabled and SQLite-backed", async () => {
    expect(activeMemoryProvider).toBe(sqliteMemoryProvider);
    await expect(getMemoryProviderRuntimeHealth()).resolves.toMatchObject({
      mode: "disabled",
      enabled: false,
      searchable: false,
      canonicalSqliteAvailable: true,
    });
  });
});
