import { describe, expect, it } from "vitest";
import { validateRestoreSelection } from "./operationalBaseline";

describe("private backup restore boundary", () => {
  const root = "/safe/RyzeFramework-backups";

  it("accepts only protected Ryze backup folders or archives", () => {
    expect(validateRestoreSelection(root, `${root}/Ryze-backup-20261124`)).toContain("Ryze-backup-20261124");
    expect(validateRestoreSelection(root, `${root}/Ryze-baseline-20261124.zip`)).toContain("Ryze-baseline-20261124.zip");
  });

  it("rejects traversal, outside paths, and unrelated files before live replacement", () => {
    expect(() => validateRestoreSelection(root, "/tmp/Ryze-backup-20261124")).toThrow("outside");
    expect(() => validateRestoreSelection(root, `${root}/notes.txt`)).toThrow("not a Ryze backup");
  });
});
