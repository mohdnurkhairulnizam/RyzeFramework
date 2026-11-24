import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  addMemory: vi.fn(),
  addTaskLog: vi.fn(),
  awardSkill: vi.fn(),
  createSession: vi.fn(),
  createTask: vi.fn(),
  ensureSession: vi.fn(),
  exportUserSandbox: vi.fn(),
  getDashboard: vi.fn(),
  listFiles: vi.fn(),
  saveFileMetadata: vi.fn(),
  searchMemory: vi.fn(),
  updateSafeSettings: vi.fn(),
  updateTask: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => storageMocks);

import { appRouter } from "./routers";

function callerFor(userId: number) {
  const ctx: TrpcContext = {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: `User ${userId}`,
      email: `user-${userId}@example.com`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

const userOneDashboard = {
  settings: { userId: 1, externalLlmEnabled: false, emailEnabled: false, telegramEnabled: false },
  sessions: [{ id: "session-1", userId: 1 }],
  tasks: [{ id: "task-1", userId: 1 }],
  logs: [{ id: 1, userId: 1, taskId: "task-1" }],
  memory: [{ id: "memory-1", userId: 1 }],
  skills: [{ id: 1, userId: 1 }],
  files: [{ id: "file-1", userId: 1 }],
};

describe("authenticated PROJECT RYZE procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getDashboard.mockImplementation(async (userId: number) => userId === 1 ? userOneDashboard : { ...userOneDashboard, settings: { ...userOneDashboard.settings, userId }, sessions: [], tasks: [], logs: [], memory: [], skills: [], files: [] });
    dbMocks.exportUserSandbox.mockImplementation(async (userId: number) => ({ schemaVersion: "ryze-sandbox-v1", settings: { userId, externalLlmEnabled: false, emailEnabled: false, telegramEnabled: false }, sessions: userId === 1 ? userOneDashboard.sessions : [], tasks: userId === 1 ? userOneDashboard.tasks : [], taskLogs: userId === 1 ? userOneDashboard.logs : [], memory: userId === 1 ? userOneDashboard.memory : [], skills: userId === 1 ? userOneDashboard.skills : [], files: userId === 1 ? userOneDashboard.files : [] }));
  });

  it("passes the signed-in user ID to the actual dashboard and export procedures", async () => {
    const owner = callerFor(1);
    const otherUser = callerFor(2);
    const ownerDashboard = await owner.ryze.dashboard();
    const otherDashboard = await otherUser.ryze.dashboard();
    const ownerExport = await owner.ryze.exportData();
    const otherExport = await otherUser.ryze.exportData();

    expect(dbMocks.getDashboard).toHaveBeenNthCalledWith(1, 1);
    expect(dbMocks.getDashboard).toHaveBeenNthCalledWith(2, 2);
    expect(dbMocks.exportUserSandbox).toHaveBeenNthCalledWith(1, 1);
    expect(dbMocks.exportUserSandbox).toHaveBeenNthCalledWith(2, 2);
    expect(ownerDashboard.sessions).toEqual([{ id: "session-1", userId: 1 }]);
    expect(otherDashboard.sessions).toEqual([]);
    expect(ownerExport.files).toEqual([{ id: "file-1", userId: 1 }]);
    expect(otherExport.files).toEqual([]);
  });

  it("retries a recoverable generated-note storage failure through the actual authenticated task procedure", async () => {
    const persistedTask: Record<string, unknown> = { id: "task-generated", userId: 1, sessionId: "session-1", prompt: "create a briefing note", action: "generate_note", status: "PENDING", retryCount: 0 };
    const persistedLogs: Array<Record<string, unknown>> = [];
    dbMocks.ensureSession.mockResolvedValue({ id: "session-1", userId: 1 });
    dbMocks.createTask.mockResolvedValue(persistedTask);
    dbMocks.saveFileMetadata.mockResolvedValue({ id: "file_generated_12345678", userId: 1 });
    dbMocks.updateTask.mockImplementation(async (_userId: number, _taskId: string, values: Record<string, unknown>) => Object.assign(persistedTask, values));
    dbMocks.addTaskLog.mockImplementation(async (_userId: number, taskId: string, actor: string, level: string, message: string) => {
      persistedLogs.push({ id: persistedLogs.length + 1, userId: 1, taskId, actor, level, message });
    });
    dbMocks.getDashboard.mockImplementation(async (userId: number) => ({
      settings: { userId, externalLlmEnabled: false, emailEnabled: false, telegramEnabled: false },
      sessions: [{ id: "session-1", userId }],
      tasks: userId === 1 ? [persistedTask] : [],
      logs: userId === 1 ? persistedLogs : [],
      memory: [],
      skills: [],
      files: [],
    }));
    storageMocks.storagePut.mockRejectedValueOnce(new Error("Temporary storage timeout")).mockResolvedValueOnce({ key: "ryze/1/generated/note.md", url: "/manus-storage/ryze/1/generated/note.md" });

    const caller = callerFor(1);
    const result = await caller.ryze.submitTask({ prompt: "create a briefing note" });
    const dashboard = await caller.ryze.dashboard();

    expect(result).toEqual({ taskId: "task-generated", mode: "demo", success: true });
    expect(storageMocks.storagePut).toHaveBeenCalledTimes(2);
    expect(dbMocks.updateTask).toHaveBeenCalledWith(1, "task-generated", expect.objectContaining({ retryCount: 1 }));
    expect(dbMocks.addTaskLog).toHaveBeenCalledWith(1, "task-generated", "nerd", "warning", expect.stringContaining("Attempt 1/3"));
    expect(dbMocks.saveFileMetadata).toHaveBeenCalledWith(1, expect.objectContaining({ taskId: "task-generated", source: "generated" }));
    expect(dbMocks.updateTask).toHaveBeenCalledWith(1, "task-generated", expect.objectContaining({ retryCount: 1 }));
    expect(dbMocks.updateTask).toHaveBeenLastCalledWith(1, "task-generated", expect.objectContaining({ status: "COMPLETED" }));
    expect(dashboard.tasks).toEqual([expect.objectContaining({ id: "task-generated", status: "COMPLETED", retryCount: 1 })]);
    expect(dashboard.logs).toEqual(expect.arrayContaining([expect.objectContaining({ taskId: "task-generated", level: "warning", message: expect.stringContaining("Attempt 1/3") })]));
  });
});
