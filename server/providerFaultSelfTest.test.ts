import { describe, expect, it } from "vitest";
import { runProviderFaultSelfTest } from "./providerFaultSelfTest";

describe("provider fault self-test", () => {
  it("classifies every controlled provider failure locally", () => {
    const report = runProviderFaultSelfTest();
    expect(report.ok).toBe(true);
    expect(report.results).toHaveLength(4);
    expect(report.results.every(result => result.passed)).toBe(true);
    expect(report.consoleText).toContain("Network calls: none");
    expect(report.consoleText).toContain("[PASS] Provider timeout");
    expect(report.consoleText).toContain("[PASS] Provider rate limit");
    expect(report.consoleText).toContain("[PASS] Provider refusal");
    expect(report.consoleText).toContain("[PASS] Malformed provider response");
  });
});
