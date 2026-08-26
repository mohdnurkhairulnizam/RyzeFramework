import { describe, expect, it } from "vitest";
import { buildPortableExport } from "./ryzeExport";

describe("portable PROJECT RYZE export", () => {
  it("keeps file bytes out of the export while retaining metadata and disabled settings", () => {
    const output = buildPortableExport({
      settings: { externalLlmEnabled: false, emailEnabled: false, telegramEnabled: false },
      sessions: [],
      tasks: [],
      taskLogs: [],
      memory: [],
      skills: [],
      files: [{ originalName: "briefing.md", storageKey: "ryze/1/file.md" }],
    });
    expect(output.schemaVersion).toBe("ryze-sandbox-v1");
    expect(output.settings).toMatchObject({ externalLlmEnabled: false, emailEnabled: false, telegramEnabled: false });
    expect(JSON.stringify(output)).not.toContain("fileBytes");
    expect(output.localization.notes.join(" ")).toContain("disabled");
  });
});
