import { describe, expect, it } from "vitest";
import { hasExplicitFreeLlmApiModelSelector } from "./stage1SelfTest";

describe("Stage 1 FreeLLMAPI model selector", () => {
  it("rejects a blank or missing selector", () => {
    expect(hasExplicitFreeLlmApiModelSelector(undefined)).toBe(false);
    expect(hasExplicitFreeLlmApiModelSelector(" ")).toBe(false);
  });

  it("accepts explicit auto delegation", () => {
    expect(hasExplicitFreeLlmApiModelSelector("auto")).toBe(true);
  });

  it("accepts an explicit named model", () => {
    expect(hasExplicitFreeLlmApiModelSelector("provider/model-id")).toBe(true);
  });
});
