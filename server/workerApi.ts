import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  addTaskLog,
  addWorkerEvent,
  addTelegramLog,
  authorizeTelegramSender,
  createTask,
  ensureSession,
  getWorkerCommand,
  getWorkerForUser,
  getUserByOpenId,
  hasTelegramReplyRecord,
  hasTelegramReplyBeenSent,
  isTelegramSenderAllowed,
  listWorkerCommands,
  queueWorkerCommand,
  updateWorkerCommand,
  upsertWorkerHeartbeat,
} from "./db";
import { determineDemoAction } from "./ryzeDemo";
import { runSafeDemo } from "./routers/ryze";
import { ENV } from "./_core/env";

const workerIdSchema = z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/);
const heartbeatSchema = z.object({
  workerId: workerIdSchema,
  hostname: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(64),
  status: z.enum(["online", "paused", "degraded", "offline"]),
  automationPaused: z.boolean(),
});
const inboundSchema = z.object({
  workerId: workerIdSchema,
  chatId: z.string().trim().min(1).max(120),
  senderId: z.string().trim().min(1).max(120),
  senderUsername: z.string().trim().max(64).optional(),
  senderName: z.string().trim().max(160).default(""),
  text: z.string().trim().min(1).max(5000),
  messageId: z.string().trim().min(1).max(120),
});
const eventSchema = z.object({
  workerId: workerIdSchema,
  level: z.enum(["info", "warning", "error"]),
  eventType: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(2000),
});
const ackSchema = z.object({
  status: z.enum(["acknowledged", "completed", "failed"]),
  message: z.string().trim().max(300).optional(),
  chatId: z.string().trim().max(120).optional(),
  messageId: z.string().trim().max(120).optional(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function jsonError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

function workerAuth(req: Request, res: Response, next: () => void) {
  const configured = ENV.workerToken;
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!configured || !token || !safeEqual(token, configured)) {
    jsonError(res, 401, "UNAUTHORIZED_WORKER", "Worker authentication failed.");
    return;
  }
  next();
}

async function ownerId() {
  if (!ENV.workerOwnerOpenId) throw new Error("Worker owner is not configured.");
  const user = await getUserByOpenId(ENV.workerOwnerOpenId);
  if (!user) throw new Error("Worker owner is not registered.");
  return user.id;
}

function parsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  return payload as Record<string, unknown>;
}

export function registerWorkerRoutes(app: Express) {
  const router = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("[worker-api] request failed", error instanceof Error ? error.message : error);
      if (!res.headersSent) jsonError(res, 500, "WORKER_API_ERROR", "Worker request could not be completed.");
    }
  };

  app.post("/api/worker/v1/heartbeat", workerAuth, router(async (req, res) => {
    const input = heartbeatSchema.safeParse(parsePayload(req.body));
    if (!input.success) return void jsonError(res, 400, "INVALID_HEARTBEAT", "Heartbeat payload is invalid.");
    const userId = await ownerId();
    const worker = await upsertWorkerHeartbeat(userId, input.data);
    res.json({ workerId: worker.id, status: worker.status, acceptedAt: new Date().toISOString() });
  }));

  app.get("/api/worker/v1/commands", workerAuth, router(async (req, res) => {
    const workerId = workerIdSchema.safeParse(String(req.query.workerId ?? ""));
    const after = Number(req.query.after ?? 0);
    if (!workerId.success || !Number.isInteger(after) || after < 0) return void jsonError(res, 400, "INVALID_COMMAND_CURSOR", "Worker command cursor is invalid.");
    const userId = await ownerId();
    const commands = await listWorkerCommands(userId, workerId.data, after);
    res.json({ commands: commands.map((command) => ({ ...command, payload: command.payload ? JSON.parse(command.payload) : null })) });
  }));

  app.post("/api/worker/v1/commands/:id/ack", workerAuth, router(async (req, res) => {
    const commandId = Number(req.params.id);
    const input = ackSchema.safeParse(parsePayload(req.body));
    const workerId = workerIdSchema.safeParse(String(req.body?.workerId ?? req.header("x-ryze-worker-id") ?? "primary"));
    if (!Number.isInteger(commandId) || commandId < 1 || !input.success || !workerId.success) return void jsonError(res, 400, "INVALID_ACK", "Command acknowledgement is invalid.");
    const userId = await ownerId();
    const command = await getWorkerCommand(userId, workerId.data, commandId);
    if (!command) return void jsonError(res, 404, "COMMAND_NOT_FOUND", "Worker command was not found.");
    if (command.command === "send_message" && input.data.status === "completed") {
      const payload = command.payload ? JSON.parse(command.payload) as { chatId?: string; contentHash?: string; replyKey?: string; taskId?: string } : {};
      const worker = await getWorkerForUser(userId, workerId.data);
      if (!worker || worker.status !== "online" || worker.automationPaused) return void jsonError(res, 409, "SEND_PAUSED", "Telegram sending is paused or the worker is not online.");
      if (!payload.chatId || input.data.chatId !== payload.chatId || !payload.contentHash || input.data.contentHash !== payload.contentHash || !input.data.messageId) return void jsonError(res, 409, "SEND_VALIDATION_FAILED", "Telegram did not confirm the expected recipient and content.");
      if (payload.replyKey && await hasTelegramReplyBeenSent(userId, payload.replyKey)) return void jsonError(res, 409, "DUPLICATE_REPLY", "This Telegram reply was already recorded as sent.");
      await addTelegramLog(userId, { direction: "outgoing", chatId: payload.chatId, messagePreview: input.data.message ?? "Autonomous same-chat reply sent.", status: `sent:${payload.replyKey ?? commandId}` });
    }
    if (command.command === "send_message" && input.data.status === "failed") {
      await addTelegramLog(userId, { direction: "system", messagePreview: "Autonomous Telegram reply failed; the failure was retained for diagnosis.", status: "send-failed" });
    }
    await updateWorkerCommand(userId, workerId.data, commandId, input.data.status);
    res.json({ ok: true });
  }));

  app.post("/api/worker/v1/events", workerAuth, router(async (req, res) => {
    const input = eventSchema.safeParse(parsePayload(req.body));
    if (!input.success) return void jsonError(res, 400, "INVALID_EVENT", "Worker event is invalid.");
    const userId = await ownerId();
    await addWorkerEvent(userId, input.data);
    res.json({ ok: true });
  }));

  app.post("/api/worker/v1/inbound", workerAuth, router(async (req, res) => {
    const input = inboundSchema.safeParse(parsePayload(req.body));
    if (!input.success) return void jsonError(res, 400, "INVALID_INBOUND", "Inbound Telegram message is invalid.");
    const userId = await ownerId();
    const codeAttempt = input.data.text;
    const temporarilyAuthorized = await authorizeTelegramSender(userId, input.data.senderId, codeAttempt);
    await addTelegramLog(userId, {
      direction: "incoming",
      telegramUserId: input.data.senderId,
      chatId: input.data.chatId,
      messagePreview: temporarilyAuthorized ? "[recovery code redacted]" : input.data.text,
      status: temporarilyAuthorized ? "temporary-authorized" : "received",
    });
    if (temporarilyAuthorized) {
      return void res.status(202).json({ accepted: true, temporaryAuthorized: true, replySent: false });
    }
    if (!(await isTelegramSenderAllowed(userId, input.data.senderId, input.data.senderUsername))) {
      await addTelegramLog(userId, { direction: "system", telegramUserId: input.data.senderId, chatId: input.data.chatId, messagePreview: "Message ignored because sender is not authorized.", status: "ignored-unauthorized" });
      return void res.status(202).json({ accepted: false, ignored: true, replySent: false });
    }
    const session = await ensureSession(userId, undefined);
    const action = determineDemoAction(input.data.text);
    const task = await createTask(userId, session.id, input.data.text, action);
    await addTaskLog(userId, task.id, "system", "info", "Task accepted from the authorized Telegram user-account worker.");
    const result = await runSafeDemo(userId, { ...task, action });
    const replyText = `Ryze: ${result.summary}`.slice(0, 4000);
    const replyKey = crypto.createHash("sha256").update(`${input.data.workerId}\0${input.data.chatId}\0${input.data.messageId}`).digest("hex");
    const worker = await getWorkerForUser(userId, input.data.workerId);
    const contentHash = crypto.createHash("sha256").update(replyText).digest("hex");
    if (worker?.status === "online" && !worker.automationPaused && !(await hasTelegramReplyRecord(userId, replyKey))) {
      await queueWorkerCommand(userId, input.data.workerId, "send_message", { chatId: input.data.chatId, text: replyText, sourceMessageId: input.data.messageId, taskId: task.id, replyKey, contentHash });
      await addTelegramLog(userId, { direction: "system", telegramUserId: input.data.senderId, chatId: input.data.chatId, messagePreview: "Autonomous same-chat reply queued.", status: `queued:${replyKey}` });
    } else {
      await addTelegramLog(userId, { direction: "system", telegramUserId: input.data.senderId, chatId: input.data.chatId, messagePreview: "Reply suppressed because Telegram sending is paused or unavailable.", status: "reply-suppressed" });
    }
    res.status(202).json({ taskId: task.id, accepted: true, replyQueued: worker?.status === "online" && !worker.automationPaused });
  }));
}

export { workerAuth };
