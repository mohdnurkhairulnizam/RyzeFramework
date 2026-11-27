import { describe, expect, it } from "vitest";
import { hasValidFreeLlmApiModelSelector } from "./stage1SelfTest";

describe("Stage 1 FreeLLMAPI model selector", () => {
  it("accepts a blank or missing selector for automatic selection", () => {
    expect(hasValidFreeLlmApiModelSelector(undefined)).toBe(true);
    expect(hasValidFreeLlmApiModelSelector(" ")).toBe(true);
  });

  it("accepts explicit auto delegation", () => {
    expect(hasValidFreeLlmApiModelSelector("auto")).toBe(true);
  });

  it("accepts an explicit named model", () => {
    expect(hasValidFreeLlmApiModelSelector("provider/model-id")).toBe(true);
  });
});
