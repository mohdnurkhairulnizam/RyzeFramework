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
  getOpenCodeSessionId,
  getDashboard,
  getTelegramControl,
  issueTelegramSecretCode,
  queueWorkerCommand,
  removeTelegramAccount,
  saveTelegramAccount,
  setTelegramAdminIdentity,
  setTelegramPermanentCode,
  listFiles,
  saveFileMetadata,
  searchMemory,
  saveOpenCodeSessionId,
  updateSafeSettings,
  updateTask,
} from "../db";
import { storagePut } from "../storage";
import {
  determineDemoAction,
  makeGeneratedNote,
  memoryQuery,
  type DemoAction,
} from "../ryzeDemo";
import {
  executeWithBoundedRetry,
  RecoverableDemoError,
} from "../ryzeExecution";
import {
  createOpenCodeConversation,
  getIntegrationStatus,
  sendOpenCodePrompt,
} from "../openCode";
import { runOperationalBaseline } from "../operationalBaseline";
import { ENV } from "../_core/env";
import { protectedProcedure, router } from "../_core/trpc";
import {
  configureTelegramBridge,
  getTelegramBridgeStatus,
  markTelegramBridgePaused,
  removeTelegramBridgeSession,
  sendTelegramBridgeInput,
  startTelegramLogin,
  startTelegramWorker,
  stopTelegramWorker,
  submitTelegramLoginInput,
} from "../telegramBridge";

const maxUploadBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

function cleanFilename(name: string) {
  return (
    name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^_+/, "")
      .slice(0, 120) || "upload.bin"
  );
}

export async function runSafeDemo(
  userId: number,
  task: { id: string; prompt: string; action: DemoAction }
): Promise<{ summary: string; success: boolean }> {
  const action = task.action;
  await updateTask(userId, task.id, { status: "IN_PROGRESS" });
  await addTaskLog(
    userId,
    task.id,
    "ryze",
    "info",
    `Plan selected: ${action.replace(/_/g, " ")}.`
  );
  await addTaskLog(
    userId,
    task.id,
    "nerd",
    "info",
    "Executor accepted the allowlisted demonstration step."
  );

  if (action === "blocked") {
    const summary =
      "The sandbox safely blocked this request. Shell execution, credential handling, external LLM calls, email, and Telegram actions are unavailable until explicitly configured.";
    await addTaskLog(userId, task.id, "system", "warning", summary);
    await awardSkill(userId, "safety", false);
    await updateTask(userId, task.id, {
      status: "FAILED",
      summary,
      completedAt: new Date(),
    });
    return { summary, success: false };
  }

  try {
    const execution = await executeWithBoundedRetry(
      async attempt => {
        if (action === "retry_demo" && attempt === 1)
          throw new RecoverableDemoError(
            "Demo parser returned a simulated recoverable warning."
          );
        let summary =
          "Ryze classified the request and Nerd completed the safe local demonstration without invoking an external provider.";
        let skillDomain = "general";
        if (action === "remember") {
          const content =
            task.prompt
              .replace(/^(remember|memorize|keep in mind)[:\s]*/i, "")
              .trim() || task.prompt;
          await addMemory(userId, {
            scope: "core",
            kind: "preference",
            content,
            tags: content
              .toLowerCase()
              .split(/\s+/)
              .filter(term => term.length > 3),
            outcome: "SUCCESS",
          });
          summary =
            "Nerd added the supplied preference to permanent core memory.";
          skillDomain = "memory";
        } else if (action === "recall") {
          const matches = await searchMemory(userId, memoryQuery(task.prompt));
          summary = `Nerd searched persistent memory and found ${matches.length} relevant entr${matches.length === 1 ? "y" : "ies"}.`;
          skillDomain = "memory";
        } else if (action === "inspect_upload") {
          const files = await listFiles(userId);
          const latest = files[0];
          summary = latest
            ? `Nerd inspected the portable metadata for ${latest.originalName} (${latest.mimeType}, ${latest.byteSize.toLocaleString()} bytes). File content was not executed.`
            : "No uploaded file is available yet. Upload a document first, then run this safe inspection action.";
          skillDomain = "files";
        } else if (action === "generate_note") {
          const content = makeGeneratedNote(task.prompt, task.id);
          const filename = `ryze-note-${task.id}.md`;
          const { key } = await storagePut(
            `ryze/${userId}/generated/${filename}`,
            Buffer.from(content, "utf8"),
            "text/markdown"
          );
          await saveFileMetadata(userId, {
            taskId: task.id,
            storageKey: key,
            originalName: filename,
            mimeType: "text/markdown",
            byteSize: Buffer.byteLength(content),
            category: "documents",
            source: "generated",
          });
          summary =
            "Nerd generated a Markdown note and saved it to the local file store.";
          skillDomain = "files";
        }
        return { summary, skillDomain };
      },
      async event => {
        await addTaskLog(
          userId,
          task.id,
          "nerd",
          "warning",
          `Attempt ${event.attempt}/3: ${event.message}`
        );
        await addTaskLog(
          userId,
          task.id,
          "ryze",
          "info",
          "Ryze classified the error as recoverable and scheduled a bounded retry."
        );
        await updateTask(userId, task.id, { retryCount: event.attempt });
      }
    );
    const { summary, skillDomain } = execution.value;
    await updateTask(userId, task.id, { retryCount: execution.retryCount });
    await addTaskLog(
      userId,
      task.id,
      "nerd",
      "success",
      `Attempt ${execution.attempts}/3 completed.`
    );

    await addMemory(userId, {
      scope: "evolving",
      kind: "task_summary",
      content: summary,
      tags: [action, skillDomain],
      outcome: "SUCCESS",
    });
    await awardSkill(userId, skillDomain, true);
    await addTaskLog(userId, task.id, "nerd", "success", summary);
    await addTaskLog(
      userId,
      task.id,
      "ryze",
      "success",
      "Verified safe completion and persisted learning to the sandbox."
    );
    await updateTask(userId, task.id, {
      status: "COMPLETED",
      summary,
      completedSteps: 1,
      completedAt: new Date(),
    });
    return { summary, success: true };
  } catch (error) {
    const summary =
      error instanceof Error
        ? `The safe workflow stopped after its bounded retry policy: ${error.message}`
        : "The safe workflow stopped after its bounded retry policy.";
    await addTaskLog(userId, task.id, "system", "error", summary);
    await awardSkill(userId, "general", false);
    await updateTask(userId, task.id, {
      status: "FAILED",
      summary,
      completedAt: new Date(),
    });
    return { summary, success: false };
  }
}

async function runOpenCodeChat(
  userId: number,
  sessionId: string,
  task: { id: string; prompt: string }
): Promise<boolean> {
  await updateTask(userId, task.id, { status: "IN_PROGRESS" });
  await addTaskLog(
    userId,
    task.id,
    "ryze",
    "info",
    "Ryze routed this chat to the local OpenCode service and FreeLLMAPI gateway."
  );
  await addTaskLog(
    userId,
    task.id,
    "system",
    "warning",
    "Chat-only mode is active: OpenCode tool permissions are denied, and the prompt is sent to the configured FreeLLMAPI model providers."
  );
  try {
    let openCodeSessionId = await getOpenCodeSessionId(userId, sessionId);
    if (!openCodeSessionId) {
      openCodeSessionId = await createOpenCodeConversation(`Ryze ${sessionId}`);
      await saveOpenCodeSessionId(userId, sessionId, openCodeSessionId);
    }
    const answer = await sendOpenCodePrompt(openCodeSessionId, task.prompt);
    await addTaskLog(userId, task.id, "nerd", "success", answer);
    await addTaskLog(
      userId,
      task.id,
      "ryze",
      "success",
      "OpenCode returned a model response; no local tool or external-delivery action was run."
    );
    await updateTask(userId, task.id, {
      status: "COMPLETED",
      summary: answer,
      completedSteps: 1,
      totalSteps: 1,
      completedAt: new Date(),
    });
    return true;
  } catch (error) {
    const summary =
      error instanceof Error
        ? error.message
        : "OpenCode chat failed. Check the local integration status and logs.";
    await addTaskLog(userId, task.id, "system", "error", summary);
    await updateTask(userId, task.id, {
      status: "FAILED",
      summary,
      completedAt: new Date(),
    });
    return false;
  }
}

export const ryzeRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id)),
  integrationStatus: protectedProcedure.query(() => getIntegrationStatus()),
  telegramBridgeStatus: protectedProcedure.query(() => getTelegramBridgeStatus()),
  configureTelegramBridge: protectedProcedure
    .input(z.object({
      apiId: z.string().trim().regex(/^\d+$/).max(32),
      apiHash: z.string().trim().min(1).max(128),
      phone: z.string().trim().min(5).max(64),
      workerId: z.string().trim().regex(/^[a-zA-Z0-9._-]{1,64}$/).optional(),
    }))
    .mutation(({ input }) => configureTelegramBridge(input)),
  startTelegramLogin: protectedProcedure.mutation(() => startTelegramLogin()),
  submitTelegramLoginCode: protectedProcedure
    .input(z.object({ value: z.string().trim().min(1).max(256) }))
    .mutation(({ input }) => submitTelegramLoginInput(input.value, "code")),
  submitTelegramTwoStepPassword: protectedProcedure
    .input(z.object({ value: z.string().min(1).max(256) }))
    .mutation(({ input }) => sendTelegramBridgeInput(input.value)),
  startTelegramWorker: protectedProcedure.mutation(() => startTelegramWorker()),
  stopTelegramWorker: protectedProcedure.mutation(() => stopTelegramWorker()),
  pauseTelegramWorker: protectedProcedure.mutation(async ({ ctx }) => { await queueWorkerCommand(ctx.user.id, "primary", "pause"); return markTelegramBridgePaused(true); }),
  resumeTelegramWorker: protectedProcedure.mutation(async ({ ctx }) => { await queueWorkerCommand(ctx.user.id, "primary", "resume"); return markTelegramBridgePaused(false); }),
  operationalBaseline: protectedProcedure.mutation(({ ctx }) =>
    runOperationalBaseline(ctx.user.id)
  ),
  createSession: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80).optional() }))
    .mutation(({ ctx, input }) => createSession(ctx.user.id, input.name)),
  submitTask: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().max(40).optional(),
        prompt: z.string().trim().min(2).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ensureSession(ctx.user.id, input.sessionId);
      const action = determineDemoAction(input.prompt);
      const task = await createTask(
        ctx.user.id,
        session.id,
        input.prompt,
        action
      );
      await addTaskLog(
        ctx.user.id,
        task.id,
        "system",
        "info",
        ENV.localMode
          ? "Task accepted by the local Ryze dashboard."
          : "Task accepted by the PROJECT RYZE hosted sandbox."
      );
      const useOpenCode =
        ENV.localMode &&
        Boolean(ENV.freeLlmApiKey) &&
        action === "safe_analysis";
      const success = useOpenCode
        ? await runOpenCodeChat(ctx.user.id, session.id, task)
        : (await runSafeDemo(ctx.user.id, { ...task, action })).success;
      return {
        taskId: task.id,
        mode: useOpenCode ? ("opencode" as const) : ("demo" as const),
        success,
      };
    }),
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(120),
        base64: z.string().min(4),
        byteSize: z.number().int().positive().max(maxUploadBytes),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!allowedMimeTypes.has(input.mimeType))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That file type is not permitted in the safe sandbox.",
        });
      const bytes = Buffer.from(input.base64, "base64");
      if (
        !bytes.length ||
        bytes.length > maxUploadBytes ||
        bytes.length !== input.byteSize
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The upload did not pass size validation.",
        });
      const filename = cleanFilename(input.fileName);
      const { key } = await storagePut(
        `ryze/${ctx.user.id}/uploads/${Date.now()}-${filename}`,
        bytes,
        input.mimeType
      );
      return saveFileMetadata(ctx.user.id, {
        storageKey: key,
        originalName: filename,
        mimeType: input.mimeType,
        byteSize: bytes.length,
        category: "uploads",
        source: "upload",
      });
    }),
  updateSettings: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["local-demo", "ollama-ready", "external-disabled"]),
        ryzeModel: z.string().trim().min(2).max(120),
        nerdModel: z.string().trim().min(2).max(120),
        demoMode: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => updateSafeSettings(ctx.user.id, input)),
  telegramControl: protectedProcedure.query(({ ctx }) => getTelegramControl(ctx.user.id)),
  saveTelegramAccount: protectedProcedure
    .input(z.object({
      label: z.string().trim().min(1).max(80),
      phoneMasked: z.string().trim().min(3).max(32),
      telegramUserId: z.string().trim().regex(/^(?:\d{1,32}|@[A-Za-z0-9_]{5,32})$/).optional(),
      status: z.enum(["configured", "authorized", "paused", "removed"]).optional(),
    }))
    .mutation(({ ctx, input }) => saveTelegramAccount(ctx.user.id, input)),
  removeTelegramAccount: protectedProcedure.mutation(async ({ ctx }) => { await removeTelegramBridgeSession(); return removeTelegramAccount(ctx.user.id); }),
  setTelegramAdminIdentity: protectedProcedure
    .input(z.object({ identity: z.string().trim().regex(/^(?:\d{1,32}|@[A-Za-z0-9_]{5,32})$/) }))
    .mutation(({ ctx, input }) => setTelegramAdminIdentity(ctx.user.id, input.identity)),
  setTelegramPermanentCode: protectedProcedure
    .input(z.object({ code: z.string().trim().min(6).max(128) }))
    .mutation(({ ctx, input }) => setTelegramPermanentCode(ctx.user.id, input.code)),
  issueTelegramSecretCode: protectedProcedure.mutation(({ ctx }) => issueTelegramSecretCode(ctx.user.id)),
  exportData: protectedProcedure.query(({ ctx }) =>
    exportUserSandbox(ctx.user.id)
  ),
});
