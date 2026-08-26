import { describe, expect, it } from "vitest";
import { executeWithBoundedRetry, RecoverableDemoError } from "./ryzeExecution";

describe("generic safe-demo retry engine", () => {
  it("retries a recoverable execution failure for any supported operation and persists the retry count", async () => {
    const retryEvents: string[] = [];
    const result = await executeWithBoundedRetry(
      async (attempt) => {
        if (attempt === 1) throw new RecoverableDemoError("Temporary storage timeout during generated note creation.");
        return { action: "generate_note", fileSaved: true };
      },
      (event) => retryEvents.push(`${event.attempt}:${event.message}`),
    );
    expect(result).toEqual({ value: { action: "generate_note", fileSaved: true }, attempts: 2, retryCount: 1 });
    expect(retryEvents).toHaveLength(1);
    expect(retryEvents[0]).toContain("Temporary storage timeout");
  });

  it("does not retry non-recoverable execution errors", async () => {
    let calls = 0;
    await expect(executeWithBoundedRetry(async () => { calls += 1; throw new Error("Unsafe input validation failed."); }, () => undefined)).rejects.toThrow("Unsafe input validation failed.");
    expect(calls).toBe(1);
  });
});
