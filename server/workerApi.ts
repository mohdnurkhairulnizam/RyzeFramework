import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import express, { type Express, type Request, type Response } from "express";
import { z } from "zod";
import {
  addTaskLog,
  addWorkerEvent,
  addTelegramLog,
  authorizeTelegramSender,
  createTask,
  ensureSession,
  getFileForUser,
  getLatestTelegramFile,
  getTelegramFileByOrigin,
  getWorkerCommand,
  getWorkerForUser,
  getUserByOpenId,
  hasTelegramReplyRecord,
  hasTelegramReplyBeenSent,
  isTelegramSenderAllowed,
  listWorkerCommands,
  queueWorkerCommand,
  saveTelegramFileMetadata,
  updateTask,
  updateWorkerCommand,
  upsertWorkerHeartbeat,
} from "./db";
import { determineDemoAction } from "./ryzeDemo";
import { runOpenCodeChat, runSafeDemo } from "./routers/ryze";
import { getStoredFilePath, storagePut } from "./storage";
import { ENV } from "./_core/env";
import { telegramAcknowledgementSchema, validateFileMetadata } from "./resultValidators";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ANALYSIS_BYTES = 64 * 1024;
const workerIdSchema = z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/);
const fileIdSchema = z.string().regex(/^file_[a-zA-Z0-9_-]{14}$/);
const allowedMimeTypes = new Set([
  "text/plain", "text/markdown", "text/csv", "application/json", "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg",
]);
const readableMimeTypes = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);
const heartbeatSchema = z.object({
  workerId: workerIdSchema,
  hostname: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(64),
  status: z.enum(["online", "paused", "degraded", "offline"]),
  automationPaused: z.boolean(),
});
const inboundSchema = z.object({
  workerId: workerIdSchema,
  chatId: z.string().trim().regex(/^\d{1,32}$/),
  senderId: z.string().trim().regex(/^\d{1,32}$/),
  senderUsername: z.string().trim().max(64).optional(),
  senderName: z.string().trim().max(160).default(""),
  text: z.string().trim().min(1).max(5000),
  messageId: z.string().trim().regex(/^\d{1,32}$/),
  isPrivate: z.boolean(),
  fileId: fileIdSchema.optional(),
});
const eventSchema = z.object({
  workerId: workerIdSchema,
  level: z.enum(["info", "warning", "error"]),
  eventType: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(2000),
});
const ackSchema = telegramAcknowledgementSchema;
const fileCommandSchema = z.object({
  fileId: fileIdSchema,
  chatId: z.string().regex(/^\d{1,32}$/),
  senderId: z.string().regex(/^\d{1,32}$/),
  sourceMessageId: z.string().min(1).max(120),
  replyKey: z.string().regex(/^[a-f0-9]{64}$/),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  byteSize: z.number().int().positive().max(MAX_FILE_BYTES),
  mimeType: z.enum([
    "text/plain", "text/markdown", "text/csv", "application/json", "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg",
  ]),
  originalName: z.string().regex(/^[a-zA-Z0-9._-]{1,120}$/),
  caption: z.string().max(800),
  taskId: z.string().max(64).optional(),
}).strict();

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

function cleanFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "").slice(0, 120) || "telegram-file.bin";
}

function validateActualFile(bytes: Buffer, mimeType: string): boolean {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES || !allowedMimeTypes.has(mimeType)) return false;
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  try {
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (content.includes("\0")) return false;
    if (mimeType === "application/json") JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

function replyKeyFor(workerId: string, chatId: string, messageId: string, purpose = "text") {
  return crypto.createHash("sha256").update(`${workerId}\0${chatId}\0${messageId}\0${purpose}`).digest("hex");
}

function requestsFileContent(text: string) {
  return /\b(file|document|attachment|attached|content)\b/i.test(text);
}

function requestsLatestFile(text: string) {
  return /\b(send|return|resend|deliver)\b.{0,40}\b(?:(?:me|my|the|that|this|last|latest|please)\s+)*(?:file|document)\b/i.test(text)
    || /\b(?:file|document)\b.{0,30}\b(back|again|to me)\b/i.test(text);
}

async function queueTextReply(userId: number, input: { workerId: string; chatId: string; senderId: string; messageId: string }, text: string, taskId?: string, purpose = "text") {
  const worker = await getWorkerForUser(userId, input.workerId);
  const replyKey = replyKeyFor(input.workerId, input.chatId, input.messageId, purpose);
  if (!worker || worker.status !== "online" || worker.automationPaused || await hasTelegramReplyRecord(userId, replyKey)) return false;
  const boundedText = text.slice(0, 4000);
  const contentHash = crypto.createHash("sha256").update(boundedText).digest("hex");
  await queueWorkerCommand(userId, input.workerId, "send_message", {
    chatId: input.chatId, text: boundedText, sourceMessageId: input.messageId, taskId, replyKey, contentHash,
  });
  await addTelegramLog(userId, { direction: "system", telegramUserId: input.senderId, chatId: input.chatId, messagePreview: "Authorized same-chat text reply queued.", status: `queued:${replyKey}` });
  return true;
}

async function queueTelegramFile(userId: number, input: { workerId: string; chatId: string; senderId: string; messageId: string }, fileId: string, taskId?: string, caption = "Here is the file you requested.") {
  const parsedFileId = fileIdSchema.safeParse(fileId);
  if (!parsedFileId.success) return "suppressed" as const;
  const file = await getFileForUser(fileId, userId);
  if (!file || file.telegramChatId !== input.chatId || file.telegramSenderId !== input.senderId) return "suppressed" as const;
  const worker = await getWorkerForUser(userId, input.workerId);
  if (!worker || worker.status !== "online" || worker.automationPaused) return "suppressed" as const;
  const path = await getStoredFilePath(file.storageKey);
  const bytes = await readFile(path);
  if (!bytes.length || bytes.length > MAX_FILE_BYTES || bytes.length !== file.byteSize || !allowedMimeTypes.has(file.mimeType)) return "suppressed" as const;
  if (!validateActualFile(bytes, file.mimeType)) return "suppressed" as const;
  const contentHash = crypto.createHash("sha256").update(bytes).digest("hex");
  const replyKey = crypto.createHash("sha256").update(`${input.workerId}\0${input.chatId}\0${input.messageId}\0file:${file.id}`).digest("hex");
  if (await hasTelegramReplyRecord(userId, replyKey)) return "existing" as const;
  const payload = fileCommandSchema.parse({
    fileId: file.id,
    chatId: input.chatId,
    senderId: input.senderId,
    sourceMessageId: input.messageId,
    replyKey,
    contentHash,
    byteSize: bytes.length,
    mimeType: file.mimeType,
    originalName: file.originalName,
    caption: caption.slice(0, 800),
    taskId,
  });
  await queueWorkerCommand(userId, input.workerId, "send_file", payload);
  await addTelegramLog(userId, { direction: "system", telegramUserId: input.senderId, chatId: input.chatId, messagePreview: `Authorized same-chat file delivery queued (${file.mimeType}; ${file.byteSize} bytes).`, status: `queued:${replyKey}` });
  return "queued" as const;
}

async function loadTextFileContext(userId: number, chatId: string, senderId: string, fileId?: string) {
  const file = fileId
    ? await getFileForUser(fileId, userId)
    : await getLatestTelegramFile(userId, chatId, senderId);
  if (!file || file.telegramChatId !== chatId || file.telegramSenderId !== senderId) return { error: "I could not find a recent file from this private chat. Please send the file again and ask about it in the same message." };
  if (!file.createdAt || Date.now() - file.createdAt.getTime() > 24 * 60 * 60 * 1000) return { error: "That file is older than the 24-hour analysis window. Please send it again." };
  if (!readableMimeTypes.has(file.mimeType)) return { error: `I received ${file.originalName}, but content reading currently supports only TXT, Markdown, CSV, and JSON files.` };
  if (file.byteSize > MAX_ANALYSIS_BYTES) return { error: `I received ${file.originalName}, but text analysis is limited to ${MAX_ANALYSIS_BYTES / 1024} KiB per file. The file itself remains stored locally.` };
  const bytes = await readFile(await getStoredFilePath(file.storageKey));
  if (bytes.length !== file.byteSize || bytes.length > MAX_ANALYSIS_BYTES) return { error: "The stored file did not pass size validation; no content was sent for analysis." };
  try {
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (content.includes("\0")) return { error: "That file is not valid UTF-8 text and was not sent for analysis." };
    return { fileContext: { originalName: file.originalName, mimeType: file.mimeType, content } };
  } catch {
    return { error: "That file is not valid UTF-8 text and was not sent for analysis." };
  }
}

export function registerWorkerRoutes(app: Express) {
  const router = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("[worker-api] request failed", error instanceof Error ? error.name : "unknown error");
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
      await addTelegramLog(userId, { direction: "outgoing", chatId: payload.chatId, messagePreview: input.data.message ?? "Authorized same-chat reply sent.", status: `sent:${payload.replyKey ?? commandId}` });
    }

    if (command.command === "send_file" && input.data.status === "completed") {
      const parsed = fileCommandSchema.safeParse(command.payload ? JSON.parse(command.payload) : null);
      const payload = parsed.success ? parsed.data : null;
      const worker = await getWorkerForUser(userId, workerId.data);
      if (!payload || !worker || worker.status !== "online" || worker.automationPaused) return void jsonError(res, 409, "FILE_SEND_PAUSED", "File sending is paused or the worker is not online.");
      if (input.data.chatId !== payload.chatId || input.data.fileId !== payload.fileId || input.data.contentHash !== payload.contentHash || input.data.byteSize !== payload.byteSize || input.data.mimeType !== payload.mimeType || !input.data.messageId) return void jsonError(res, 409, "FILE_SEND_VALIDATION_FAILED", "Telegram did not confirm the expected file, content, and originating chat.");
      if (await hasTelegramReplyBeenSent(userId, payload.replyKey)) return void jsonError(res, 409, "DUPLICATE_FILE_SEND", "This Telegram file delivery was already recorded as sent.");
      const file = await getFileForUser(payload.fileId, userId);
      if (!file || file.telegramChatId !== payload.chatId || file.telegramSenderId !== payload.senderId || file.byteSize !== payload.byteSize || file.mimeType !== payload.mimeType) return void jsonError(res, 409, "FILE_ORIGIN_VALIDATION_FAILED", "The file is not bound to this authorized private chat.");
      await addTelegramLog(userId, { direction: "outgoing", telegramUserId: payload.senderId, chatId: payload.chatId, messagePreview: `File sent (${file.mimeType}; ${file.byteSize} bytes).`, status: `sent:${payload.replyKey}` });
      if (payload.taskId) await updateTask(userId, payload.taskId, { status: "COMPLETED", summary: "File delivered to the originating private chat.", completedSteps: 1, completedAt: new Date() });
    }

    if ((command.command === "send_message" || command.command === "send_file") && input.data.status === "failed") {
      const payload = command.payload ? JSON.parse(command.payload) as { taskId?: string; originalName?: string; fileId?: string } : {};
      const detail = command.command === "send_file" ? "Telegram file delivery failed." : "Authorized Telegram reply failed.";
      await addTelegramLog(userId, { direction: "system", messagePreview: `${detail} ${input.data.message || "Worker reported a failure."}`, status: "send-failed" });
      if (payload.taskId) await updateTask(userId, payload.taskId, { status: "FAILED", summary: detail, completedAt: new Date() });
    }

    await updateWorkerCommand(userId, workerId.data, commandId, input.data.status);
    res.json({ ok: true });
  }));

  app.get("/api/worker/v1/files/:fileId/download", workerAuth, router(async (req, res) => {
    const fileId = fileIdSchema.safeParse(String(req.params.fileId ?? ""));
    const workerId = workerIdSchema.safeParse(String(req.query.workerId ?? ""));
    const commandId = Number(req.query.commandId ?? 0);
    if (!fileId.success || !workerId.success || !Number.isInteger(commandId) || commandId < 1) return void jsonError(res, 400, "INVALID_FILE_REQUEST", "Worker file request is invalid.");
    const userId = await ownerId();
    const command = await getWorkerCommand(userId, workerId.data, commandId);
    const payload = fileCommandSchema.safeParse(command?.payload ? JSON.parse(command.payload) : null);
    const worker = await getWorkerForUser(userId, workerId.data);
    if (!command || command.command !== "send_file" || command.status !== "acknowledged" || !payload.success || payload.data.fileId !== fileId.data) return void jsonError(res, 404, "FILE_COMMAND_NOT_FOUND", "No active same-chat file delivery command was found.");
    if (!worker || worker.status !== "online" || worker.automationPaused) return void jsonError(res, 409, "SEND_PAUSED", "Telegram sending is paused or the worker is not online.");
    const file = await getFileForUser(fileId.data, userId);
    if (!file || file.telegramChatId !== payload.data.chatId || file.telegramSenderId !== payload.data.senderId || file.byteSize !== payload.data.byteSize || file.mimeType !== payload.data.mimeType) return void jsonError(res, 403, "FILE_ORIGIN_VALIDATION_FAILED", "The file is not bound to this authorized private chat.");
    const bytes = await readFile(await getStoredFilePath(file.storageKey));
    if (bytes.length !== payload.data.byteSize || bytes.length > MAX_FILE_BYTES || crypto.createHash("sha256").update(bytes).digest("hex") !== payload.data.contentHash || !validateActualFile(bytes, file.mimeType)) return void jsonError(res, 409, "FILE_INTEGRITY_FAILED", "The stored file did not pass delivery integrity checks.");
    res.status(200);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.setHeader("X-Ryze-File-Id", file.id);
    res.setHeader("X-Ryze-File-Name", encodeURIComponent(file.originalName));
    res.setHeader("X-Ryze-Mime-Type", file.mimeType);
    res.setHeader("X-Ryze-Byte-Size", String(bytes.length));
    res.setHeader("X-Ryze-SHA256", payload.data.contentHash);
    res.send(bytes);
  }));

  app.post("/api/worker/v1/inbound-file", workerAuth, express.raw({ type: "application/octet-stream", limit: MAX_FILE_BYTES }), router(async (req, res) => {
    const workerId = workerIdSchema.safeParse(String(req.header("x-ryze-worker-id") ?? ""));
    const chatId = z.string().regex(/^\d{1,32}$/).safeParse(String(req.header("x-ryze-chat-id") ?? ""));
    const senderId = z.string().regex(/^\d{1,32}$/).safeParse(String(req.header("x-ryze-sender-id") ?? ""));
    const messageId = z.string().trim().regex(/^\d{1,32}$/).safeParse(String(req.header("x-ryze-message-id") ?? ""));
    const mimeType = z.string().max(120).safeParse(String(req.header("x-ryze-mime-type") ?? ""));
    const senderUsername = String(req.header("x-ryze-sender-username") ?? "").trim().slice(0, 64);
    const isPrivate = req.header("x-ryze-private") === "true";
    const hasCaption = req.header("x-ryze-has-caption") === "true";
    let decodedName = "";
    try { decodedName = decodeURIComponent(String(req.header("x-ryze-file-name") ?? "")); } catch { /* invalid encoding */ }
    if (!workerId.success || !chatId.success || !senderId.success || !messageId.success || !mimeType.success || !decodedName || !isPrivate) return void jsonError(res, 400, "INVALID_FILE_INBOUND", "Private-chat file metadata is invalid.");
    if (!allowedMimeTypes.has(mimeType.data)) return void jsonError(res, 415, "UNSUPPORTED_FILE_TYPE", "This file type is not permitted.");
    if (!Buffer.isBuffer(req.body)) return void jsonError(res, 400, "INVALID_FILE_BODY", "File bytes were not received as a binary body.");
    const bytes = req.body as Buffer;
    if (!bytes.length || bytes.length > MAX_FILE_BYTES || Number(req.header("content-length")) !== bytes.length || !validateActualFile(bytes, mimeType.data)) return void jsonError(res, 400, "FILE_VALIDATION_FAILED", "The file did not pass actual-byte, type, or size validation.");
    if (chatId.data !== senderId.data) return void jsonError(res, 403, "PRIVATE_CHAT_REQUIRED", "Files are accepted only in the sender's private chat.");
    const userId = await ownerId();
    const worker = await getWorkerForUser(userId, workerId.data);
    if (!worker || worker.status !== "online" || worker.automationPaused) return void jsonError(res, 409, "FILE_INTAKE_PAUSED", "File intake is paused or the worker is not online.");
    if (!(await isTelegramSenderAllowed(userId, senderId.data, senderUsername))) {
      await addTelegramLog(userId, { direction: "system", telegramUserId: senderId.data, chatId: chatId.data, messagePreview: "Private Telegram file ignored because sender is not authorized.", status: "ignored-unauthorized-file" });
      return void res.status(202).json({ accepted: false, ignored: true });
    }
    const originalName = cleanFilename(decodedName);
    let storageKey: string;
    const existing = await getTelegramFileByOrigin(userId, chatId.data, messageId.data);
    if (existing) {
      if (!hasCaption) await queueTextReply(userId, { workerId: workerId.data, chatId: chatId.data, senderId: senderId.data, messageId: messageId.data }, `Ryze: I received and stored ${existing.originalName} in your local file store. Ask me about it in this private chat within 24 hours. Text analysis supports TXT, Markdown, CSV, or JSON up to 64 KiB; file content is sent to your configured model provider only when you ask for analysis.`, undefined, "file-received");
      return void res.status(202).json({ accepted: true, duplicate: true, fileId: existing.id, originalName: existing.originalName, mimeType: existing.mimeType, byteSize: existing.byteSize });
    }
    ({ key: storageKey } = await storagePut(`ryze/${userId}/uploads/telegram-${messageId.data}-${originalName}`, bytes, mimeType.data));
    validateFileMetadata({ originalName, mimeType: mimeType.data, byteSize: bytes.length, storageKey });
    const file = await saveTelegramFileMetadata(userId, { storageKey, originalName, mimeType: mimeType.data, byteSize: bytes.length, chatId: chatId.data, senderId: senderId.data, messageId: messageId.data });
    await addTelegramLog(userId, { direction: "incoming", telegramUserId: senderId.data, chatId: chatId.data, messagePreview: `[File received; ${file.mimeType}; ${file.byteSize} bytes]`, status: "file-received" });
    if (!hasCaption) await queueTextReply(userId, { workerId: workerId.data, chatId: chatId.data, senderId: senderId.data, messageId: messageId.data }, `Ryze: I received and stored ${file.originalName} in your local file store. Ask me about it in this private chat within 24 hours. Text analysis supports TXT, Markdown, CSV, or JSON up to 64 KiB; file content is sent to your configured model provider only when you ask for analysis.`, undefined, "file-received");
    res.status(202).json({ accepted: true, fileId: file.id, originalName: file.originalName, mimeType: file.mimeType, byteSize: file.byteSize });
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
    if (!input.data.isPrivate || input.data.chatId !== input.data.senderId) {
      await addTelegramLog(userId, { direction: "system", telegramUserId: input.data.senderId, chatId: input.data.chatId, messagePreview: "Telegram message ignored because Stage 1 accepts private chats only.", status: "ignored-non-private" });
      return void res.status(202).json({ accepted: false, ignored: true });
    }
    const temporarilyAuthorized = await authorizeTelegramSender(userId, input.data.senderId, input.data.text);
    await addTelegramLog(userId, {
      direction: "incoming",
      telegramUserId: input.data.senderId,
      chatId: input.data.chatId,
      messagePreview: temporarilyAuthorized ? "[recovery code redacted]" : input.data.text,
      status: temporarilyAuthorized ? "temporary-authorized" : "received",
    });
    if (temporarilyAuthorized) return void res.status(202).json({ accepted: true, temporaryAuthorized: true, replySent: false });
    if (!(await isTelegramSenderAllowed(userId, input.data.senderId, input.data.senderUsername))) {
      await addTelegramLog(userId, { direction: "system", telegramUserId: input.data.senderId, chatId: input.data.chatId, messagePreview: "Message ignored because sender is not authorized.", status: "ignored-unauthorized" });
      return void res.status(202).json({ accepted: false, ignored: true, replySent: false });
    }

    const eventKey = replyKeyFor(input.data.workerId, input.data.chatId, input.data.messageId, "inbound");
    if (await hasTelegramReplyRecord(userId, eventKey)) return void res.status(202).json({ accepted: true, duplicate: true, replyQueued: false });
    await addTelegramLog(userId, { direction: "system", telegramUserId: input.data.senderId, chatId: input.data.chatId, messagePreview: "Authorized private-chat request accepted for bounded processing.", status: `queued:${eventKey}` });

    const requestFile = requestsFileContent(input.data.text) || Boolean(input.data.fileId);
    let fileContext: { originalName: string; mimeType: string; content: string } | undefined;
    let fileContextError: string | undefined;
    if (requestFile) {
      const loaded = await loadTextFileContext(userId, input.data.chatId, input.data.senderId, input.data.fileId);
      if ("fileContext" in loaded && loaded.fileContext) fileContext = loaded.fileContext;
      else if ("error" in loaded) fileContextError = loaded.error;
    }

    const session = await ensureSession(userId, undefined);
    const action = fileContext ? "safe_analysis" : determineDemoAction(input.data.text);
    const task = await createTask(userId, session.id, input.data.text, action);
    await addTaskLog(userId, task.id, "system", "info", "Task accepted from an authorized private Telegram chat; reply destination is bound to that chat.");

    if (requestsLatestFile(input.data.text)) {
      const latest = await getLatestTelegramFile(userId, input.data.chatId, input.data.senderId);
      if (latest && latest.createdAt && Date.now() - latest.createdAt.getTime() <= 24 * 60 * 60 * 1000) {
        await updateTask(userId, task.id, { status: "IN_PROGRESS" });
        const delivery = await queueTelegramFile(userId, { workerId: input.data.workerId, chatId: input.data.chatId, senderId: input.data.senderId, messageId: input.data.messageId }, latest.id, task.id);
        if (delivery === "queued" || delivery === "existing") {
          await addTaskLog(userId, task.id, "system", "success", "The requested file is queued only for its originating authorized private chat.");
          if (delivery === "existing") await updateTask(userId, task.id, { status: "COMPLETED", summary: "The requested file is already queued or was already delivered." });
          return void res.status(202).json({ taskId: task.id, accepted: true, fileQueued: delivery === "queued", duplicate: delivery === "existing" });
        }
      }
      const summary = latest ? "File delivery is paused or failed a same-chat integrity check." : "No file from this authorized private chat is available within the 24-hour window.";
      await updateTask(userId, task.id, { status: "FAILED", summary, completedAt: new Date() });
      await addTaskLog(userId, task.id, "system", "warning", summary);
      const queued = await queueTextReply(userId, input.data, `Ryze: ${summary}`, task.id, "file-send-unavailable");
      return void res.status(202).json({ taskId: task.id, accepted: true, replyQueued: queued, fileQueued: false });
    }

    if (fileContextError) {
      await updateTask(userId, task.id, { status: "FAILED", summary: fileContextError, completedAt: new Date() });
      await addTaskLog(userId, task.id, "system", "warning", fileContextError);
      const queued = await queueTextReply(userId, input.data, `Ryze: ${fileContextError}`, task.id, "file-analysis-unavailable");
      return void res.status(202).json({ taskId: task.id, accepted: true, replyQueued: queued, fileAnalyzed: false });
    }

    let result: { summary: string; success: boolean; fileId?: string };
    if (fileContext) {
      if (!ENV.localMode || !ENV.freeLlmApiKey) {
        result = { summary: "File content was not sent for analysis because OpenCode and the configured model gateway are unavailable.", success: false };
        await updateTask(userId, task.id, { status: "FAILED", summary: result.summary, completedAt: new Date() });
      } else {
        result = await runOpenCodeChat(userId, session.id, task, fileContext);
      }
    } else if (ENV.localMode && Boolean(ENV.freeLlmApiKey) && action === "safe_analysis") {
      result = await runOpenCodeChat(userId, session.id, task);
    } else {
      const telegramOrigin = { chatId: input.data.chatId, senderId: input.data.senderId, messageId: input.data.messageId };
      result = await runSafeDemo(userId, { ...task, action, telegramOrigin });
    }

    const replyText = `Ryze: ${result.summary}`.slice(0, 4000);
    const textQueued = await queueTextReply(userId, input.data, replyText, task.id);
    let fileQueued = false;
    if (result.success && result.fileId) {
      const delivery = await queueTelegramFile(userId, { workerId: input.data.workerId, chatId: input.data.chatId, senderId: input.data.senderId, messageId: input.data.messageId }, result.fileId, task.id, "Here is the Markdown note you requested.");
      fileQueued = delivery === "queued" || delivery === "existing";
      if (!fileQueued) await addTaskLog(userId, task.id, "system", "warning", "Generated file remains available in the dashboard; Telegram file delivery was suppressed by a same-chat or pause check.");
    }
    if (!textQueued && !fileQueued) await addTelegramLog(userId, { direction: "system", telegramUserId: input.data.senderId, chatId: input.data.chatId, messagePreview: "Reply suppressed because Telegram sending is paused or unavailable.", status: "reply-suppressed" });
    res.status(202).json({ taskId: task.id, accepted: true, replyQueued: textQueued, fileQueued });
  }));
}

export { workerAuth };
