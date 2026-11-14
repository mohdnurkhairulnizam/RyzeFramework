import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addMemory,
  addTaskLog,
  awardSkill,
  createSession,
  createTask,
  ensureSession,
  exportUserSandbox,
  getDashboard,
  listFiles,
  saveFileMetadata,
  searchMemory,
  updateSafeSettings,
  updateTask,
} from "../db";
import { storagePut } from "../storage";
import { determineDemoAction, makeGeneratedNote, memoryQuery, type DemoAction } from "../ryzeDemo";
import { executeWithBoundedRetry, RecoverableDemoError } from "../ryzeExecution";
import { protectedProcedure, router } from "../_core/trpc";

const maxUploadBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "text/plain", "text/markdown", "text/csv", "application/json", "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg",
]);

function cleanFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "").slice(0, 120) || "upload.bin";
}

export async function runSafeDemo(userId: number, task: { id: string; prompt: string; action: DemoAction }): Promise<string> {
  const action = task.action;
  await updateTask(userId, task.id, { status: "IN_PROGRESS" });
  await addTaskLog(userId, task.id, "ryze", "info", `Plan selected: ${action.replace(/_/g, " ")}.`);
  await addTaskLog(userId, task.id, "nerd", "info", "Executor accepted the allowlisted demonstration step.");

  if (action === "blocked") {
    const summary = "The sandbox safely blocked this request. Shell execution, credential handling, external LLM calls, email, and Telegram actions are unavailable until explicitly configured.";
    await addTaskLog(userId, task.id, "system", "warning", summary);
    await awardSkill(userId, "safety", false);
    await updateTask(userId, task.id, { status: "FAILED", summary, completedAt: new Date() });
    return summary;
  }

  try {
    const execution = await executeWithBoundedRetry(async (attempt) => {
      if (action === "retry_demo" && attempt === 1) throw new RecoverableDemoError("Demo parser returned a simulated recoverable warning.");
      let summary = "Ryze classified the request and Nerd completed the safe local demonstration without invoking an external provider.";
      let skillDomain = "general";
      if (action === "remember") {
        const content = task.prompt.replace(/^(remember|memorize|keep in mind)[:\s]*/i, "").trim() || task.prompt;
        await addMemory(userId, { scope: "core", kind: "preference", content, tags: content.toLowerCase().split(/\s+/).filter((term) => term.length > 3), outcome: "SUCCESS" });
        summary = "Nerd added the supplied preference to permanent core memory.";
        skillDomain = "memory";
      } else if (action === "recall") {
        const matches = await searchMemory(userId, memoryQuery(task.prompt));
        summary = `Nerd searched persistent memory and found ${matches.length} relevant entr${matches.length === 1 ? "y" : "ies"}.`;
        skillDomain = "memory";
      } else if (action === "inspect_upload") {
        const files = await listFiles(userId);
        const latest = files[0];
        summary = latest ? `Nerd inspected the portable metadata for ${latest.originalName} (${latest.mimeType}, ${latest.byteSize.toLocaleString()} bytes). File content was not executed.` : "No uploaded file is available yet. Upload a document first, then run this safe inspection action.";
        skillDomain = "files";
      } else if (action === "generate_note") {
        const content = makeGeneratedNote(task.prompt, task.id);
        const filename = `ryze-note-${task.id}.md`;
        const { key } = await storagePut(`ryze/${userId}/generated/${filename}`, Buffer.from(content, "utf8"), "text/markdown");
        await saveFileMetadata(userId, { taskId: task.id, storageKey: key, originalName: filename, mimeType: "text/markdown", byteSize: Buffer.byteLength(content), category: "documents", source: "generated" });
        summary = "Nerd generated a Markdown note and saved it to the local file store.";
        skillDomain = "files";
      }
      return { summary, skillDomain };
    }, async (event) => {
      await addTaskLog(userId, task.id, "nerd", "warning", `Attempt ${event.attempt}/3: ${event.message}`);
      await addTaskLog(userId, task.id, "ryze", "info", "Ryze classified the error as recoverable and scheduled a bounded retry.");
      await updateTask(userId, task.id, { retryCount: event.attempt });
    });
    const { summary, skillDomain } = execution.value;
    await updateTask(userId, task.id, { retryCount: execution.retryCount });
    await addTaskLog(userId, task.id, "nerd", "success", `Attempt ${execution.attempts}/3 completed.`);

    await addMemory(userId, { scope: "evolving", kind: "task_summary", content: summary, tags: [action, skillDomain], outcome: "SUCCESS" });
    await awardSkill(userId, skillDomain, true);
    await addTaskLog(userId, task.id, "nerd", "success", summary);
    await addTaskLog(userId, task.id, "ryze", "success", "Verified safe completion and persisted learning to the sandbox.");
    await updateTask(userId, task.id, { status: "COMPLETED", summary, completedSteps: 1, completedAt: new Date() });
    return summary;
  } catch (error) {
    const summary = error instanceof Error ? `The safe workflow stopped after its bounded retry policy: ${error.message}` : "The safe workflow stopped after its bounded retry policy.";
    await addTaskLog(userId, task.id, "system", "error", summary);
    await awardSkill(userId, "general", false);
    await updateTask(userId, task.id, { status: "FAILED", summary, completedAt: new Date() });
    return summary;
  }
}

export const ryzeRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id)),
  createSession: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(80).optional() })).mutation(({ ctx, input }) => createSession(ctx.user.id, input.name)),
  submitTask: protectedProcedure.input(z.object({ sessionId: z.string().max(40).optional(), prompt: z.string().trim().min(2).max(5000) })).mutation(async ({ ctx, input }) => {
    const session = await ensureSession(ctx.user.id, input.sessionId);
    const action = determineDemoAction(input.prompt);
    const task = await createTask(ctx.user.id, session.id, input.prompt, action);
    await addTaskLog(ctx.user.id, task.id, "system", "info", "Task accepted by the PROJECT RYZE hosted sandbox.");
    await runSafeDemo(ctx.user.id, { ...task, action });
    return { taskId: task.id };
  }),
  upload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), base64: z.string().min(4), byteSize: z.number().int().positive().max(maxUploadBytes) })).mutation(async ({ ctx, input }) => {
    if (!allowedMimeTypes.has(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "That file type is not permitted in the safe sandbox." });
    const bytes = Buffer.from(input.base64, "base64");
    if (!bytes.length || bytes.length > maxUploadBytes || bytes.length !== input.byteSize) throw new TRPCError({ code: "BAD_REQUEST", message: "The upload did not pass size validation." });
    const filename = cleanFilename(input.fileName);
    const { key } = await storagePut(`ryze/${ctx.user.id}/uploads/${Date.now()}-${filename}`, bytes, input.mimeType);
    return saveFileMetadata(ctx.user.id, { storageKey: key, originalName: filename, mimeType: input.mimeType, byteSize: bytes.length, category: "uploads", source: "upload" });
  }),
  updateSettings: protectedProcedure.input(z.object({ provider: z.enum(["local-demo", "ollama-ready", "external-disabled"]), ryzeModel: z.string().trim().min(2).max(120), nerdModel: z.string().trim().min(2).max(120), demoMode: z.boolean() })).mutation(({ ctx, input }) => updateSafeSettings(ctx.user.id, input)),
  exportData: protectedProcedure.query(({ ctx }) => exportUserSandbox(ctx.user.id)),
});
