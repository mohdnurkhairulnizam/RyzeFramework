import { describe, expect, it } from "vitest";
import { buildUserScopedExport, scopeDashboardData } from "./db";

describe("actual dashboard query-helper scope and export path", () => {
  const mixedDashboard = {
    settings: { userId: 1, externalLlmEnabled: false, emailEnabled: false, telegramEnabled: false },
    sessions: [{ id: "s1", userId: 1 }, { id: "s2", userId: 2 }],
    tasks: [{ id: "t1", userId: 1 }, { id: "t2", userId: 2 }],
    logs: [{ id: 1, userId: 1, taskId: "t1" }, { id: 2, userId: 2, taskId: "t2" }],
    memory: [{ id: "m1", userId: 1 }, { id: "m2", userId: 2 }],
    skills: [{ id: 1, userId: 1 }, { id: 2, userId: 2 }],
    files: [{ id: "f1", userId: 1, storageKey: "one" }, { id: "f2", userId: 2, storageKey: "two" }],
  };

  it("removes foreign sessions, tasks, logs, memory, skills, and files from the query helper output", () => {
    const scoped = scopeDashboardData(1, mixedDashboard);
    expect(scoped.sessions).toEqual([{ id: "s1", userId: 1 }]);
    expect(scoped.tasks).toEqual([{ id: "t1", userId: 1 }]);
    expect(scoped.logs).toEqual([{ id: 1, userId: 1, taskId: "t1" }]);
    expect(scoped.memory).toEqual([{ id: "m1", userId: 1 }]);
    expect(scoped.skills).toEqual([{ id: 1, userId: 1 }]);
    expect(scoped.files).toEqual([{ id: "f1", userId: 1, storageKey: "one" }]);
  });

  it("uses the same scoped dashboard data when producing the portable export", () => {
    const output = buildUserScopedExport(1, mixedDashboard);
    expect(output.sessions).toHaveLength(1);
    expect(output.tasks).toHaveLength(1);
    expect(output.taskLogs).toHaveLength(1);
    expect(output.memory).toHaveLength(1);
    expect(output.skills).toHaveLength(1);
    expect(output.files).toEqual([{ id: "f1", userId: 1, storageKey: "one" }]);
    expect(output.settings).toMatchObject({ userId: 1, externalLlmEnabled: false, emailEnabled: false, telegramEnabled: false });
  });
});
