import { describe, expect, it } from "vitest";
import { boundedDemoAttempts, determineDemoAction, makeGeneratedNote, memoryQuery } from "./ryzeDemo";

describe("safe Ryze → Nerd demo action routing", () => {
  it("routes supported memory and document actions", () => {
    expect(determineDemoAction("remember that the dashboard is dark")).toBe("remember");
    expect(determineDemoAction("recall dashboard preferences")).toBe("recall");
    expect(determineDemoAction("inspect uploaded document")).toBe("inspect_upload");
    expect(determineDemoAction("create a briefing note")).toBe("generate_note");
  });

  it("blocks shell, credential, and external-delivery instructions", () => {
    expect(determineDemoAction("run a bash shell command")).toBe("blocked");
    expect(determineDemoAction("send email to a client")).toBe("blocked");
    expect(determineDemoAction("save my API key")).toBe("blocked");
  });

  it("generates a portable, deterministic note", () => {
    const note = makeGeneratedNote("Create a sandbox note", "task_123");
    expect(note).toContain("task_123");
    expect(note).toContain("No external model");
    expect(memoryQuery("recall testing choices")).toBe("testing choices");
  });

  it("models bounded recoverable retries without exceeding the configured attempt limit", () => {
    const retries = boundedDemoAttempts("retry_demo", 3);
    expect(retries).toHaveLength(2);
    expect(retries[0]).toMatchObject({ attempt: 1, outcome: "recoverable" });
    expect(retries[1]).toMatchObject({ attempt: 2, outcome: "success" });
    expect(boundedDemoAttempts("retry_demo", 1)).toHaveLength(1);
    expect(boundedDemoAttempts("remember", 3)).toEqual([{ attempt: 1, outcome: "success", message: "Allowlisted step completed on the first attempt." }]);
  });
});
