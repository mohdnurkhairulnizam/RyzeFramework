import { describe, expect, it } from "vitest";
import { filterOwnedRecords, requireOwnedRecord } from "./ryzeOwnership";

describe("PROJECT RYZE ownership boundary", () => {
  const records = [
    { id: "task_a", userId: 1, prompt: "owner one" },
    { id: "task_b", userId: 2, prompt: "owner two" },
  ];

  it("returns only records belonging to the authenticated user", () => {
    expect(filterOwnedRecords(records, 1)).toEqual([{ id: "task_a", userId: 1, prompt: "owner one" }]);
    expect(filterOwnedRecords(records, 2)).toEqual([{ id: "task_b", userId: 2, prompt: "owner two" }]);
  });

  it("rejects cross-user and missing records before data can be returned", () => {
    expect(requireOwnedRecord(records[0], 1).id).toBe("task_a");
    expect(() => requireOwnedRecord(records[0], 2)).toThrow("authenticated user");
    expect(() => requireOwnedRecord(undefined, 1)).toThrow("authenticated user");
  });
});
