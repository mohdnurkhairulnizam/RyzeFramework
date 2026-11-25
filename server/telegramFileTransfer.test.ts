import express from "express";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-telegram-files-"));
vi.stubEnv("RYZE_DATA_DIR", dataRoot);
vi.stubEnv("RYZE_LOCAL_OWNER_OPEN_ID", "ryze-file-transfer-test");
vi.stubEnv("RYZE_WORKER_OWNER_OPEN_ID", "ryze-file-transfer-test");
vi.stubEnv("RYZE_WORKER_TOKEN", "test-worker-token");
vi.stubEnv("RYZE_LOCAL_MODE", "false");

const db = await import("./db");
const { registerWorkerRoutes } = await import("./workerApi");
const storage = await import("./storage");

let server: Server;
let baseUrl = "";
let ownerId = 0;
const auth = { Authorization: "Bearer test-worker-token" };

beforeAll(async () => {
  const owner = await db.ensureLocalOwner();
  ownerId = owner.id;
  await db.setTelegramAdminIdentity(ownerId, "12345");
  await db.upsertWorkerHeartbeat(ownerId, {
    workerId: "primary", hostname: "test", version: "test", status: "online", automationPaused: false,
  });
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  registerWorkerRoutes(app);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind a port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await db.closeDb();
  vi.unstubAllEnvs();
  rmSync(dataRoot, { recursive: true, force: true });
});

async function uploadFile(overrides: Record<string, string> = {}, body = Buffer.from("# Stage 1 file\nContent for test.\n")) {
  return fetch(`${baseUrl}/api/worker/v1/inbound-file`, {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.length),
      "X-Ryze-Worker-Id": "primary",
      "X-Ryze-Chat-Id": "12345",
      "X-Ryze-Sender-Id": "12345",
      "X-Ryze-Sender-Username": "owner",
      "X-Ryze-Message-Id": "9001",
      "X-Ryze-File-Name": encodeURIComponent("brief.md"),
      "X-Ryze-Mime-Type": "text/markdown",
      "X-Ryze-Private": "true",
      "X-Ryze-Has-Caption": "false",
      ...overrides,
    },
    body,
  });
}

describe("Telegram file transfer boundary", () => {
  it("accepts stable text-only worker payloads without weakening the private-chat boundary", async () => {
    const endpoint = `${baseUrl}/api/worker/v1/inbound`;
    const legacy = {
      workerId: "primary", chatId: "12345", senderId: "12345", senderUsername: "owner",
      senderName: "Owner", text: "Give me a brief status update.", messageId: "9020",
    };
    const restored = await fetch(endpoint, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(legacy),
    });
    expect(restored.status).toBe(202);
    expect(await restored.json()).toMatchObject({ accepted: true, replyQueued: true });

    const currentWorkerPayload = await fetch(endpoint, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ ...legacy, messageId: "9023", isPrivate: true }),
    });
    expect(currentWorkerPayload.status).toBe(202);
    expect(await currentWorkerPayload.json()).toMatchObject({ accepted: true, replyQueued: true });

    const formerWorkerPayload = await fetch(endpoint, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ ...legacy, messageId: "9024", isPrivate: true, fileId: null }),
    });
    expect(formerWorkerPayload.status).toBe(400);
    expect(await formerWorkerPayload.json()).toMatchObject({ error: { code: "INVALID_INBOUND" } });

    const mismatchedChat = await fetch(endpoint, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ ...legacy, chatId: "98765", messageId: "9021" }),
    });
    expect(mismatchedChat.status).toBe(202);
    expect(await mismatchedChat.json()).toMatchObject({ accepted: false, ignored: true });

    const explicitlyNonPrivate = await fetch(endpoint, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ ...legacy, messageId: "9022", isPrivate: false }),
    });
    expect(explicitlyNonPrivate.status).toBe(202);
    expect(await explicitlyNonPrivate.json()).toMatchObject({ accepted: false, ignored: true });
  });

  it("stores only authorized private-chat file bytes with immutable source binding", async () => {
    const unauthorized = await uploadFile({ "X-Ryze-Sender-Id": "98765", "X-Ryze-Chat-Id": "98765", "X-Ryze-Message-Id": "9000" });
    expect(unauthorized.status).toBe(202);
    expect(await unauthorized.json()).toMatchObject({ accepted: false, ignored: true });
    expect((await db.listFiles(ownerId)).length).toBe(0);

    const notPrivate = await uploadFile({ "X-Ryze-Chat-Id": "54321", "X-Ryze-Message-Id": "9002" });
    expect(notPrivate.status).toBe(403);

    const response = await uploadFile();
    expect(response.status).toBe(202);
    const received = await response.json() as { accepted: boolean; fileId: string; byteSize: number };
    expect(received.accepted).toBe(true);
    expect(received.byteSize).toBe(Buffer.byteLength("# Stage 1 file\nContent for test.\n"));
    const file = await db.getFileForUser(received.fileId, ownerId);
    expect(file).toMatchObject({
      source: "telegram", originalName: "brief.md", mimeType: "text/markdown",
      telegramChatId: "12345", telegramSenderId: "12345", telegramMessageId: "9001",
    });
    expect(await db.getFileForUser(received.fileId, ownerId + 1)).toBeNull();
    const stored = await readFile(await storage.getStoredFilePath(file!.storageKey));
    expect(stored.toString("utf8")).toContain("Stage 1 file");

    const duplicate = await uploadFile();
    expect(duplicate.status).toBe(202);
    expect(await duplicate.json()).toMatchObject({ accepted: true, duplicate: true, fileId: received.fileId });
    const unsupported = await uploadFile({ "X-Ryze-File-Name": "virus.exe", "X-Ryze-Mime-Type": "application/octet-stream", "X-Ryze-Message-Id": "9003" });
    expect(unsupported.status).toBe(415);
  });

  it("keeps captioned-file receipt and its linked private text request working", async () => {
    const upload = await uploadFile({ "X-Ryze-Message-Id": "9030", "X-Ryze-Has-Caption": "true" });
    expect(upload.status).toBe(202);
    const received = await upload.json() as { accepted: boolean; fileId: string };
    expect(received.accepted).toBe(true);

    const caption = await fetch(`${baseUrl}/api/worker/v1/inbound`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: "primary", chatId: "12345", senderId: "12345", senderUsername: "owner",
        senderName: "Owner", text: "Please summarize the content of this file.", messageId: "9030",
        isPrivate: true, fileId: received.fileId,
      }),
    });
    expect(caption.status).toBe(202);
    expect(await caption.json()).toMatchObject({ accepted: true, replyQueued: true });
  });

  it("serves only the command-bound bytes and accepts exact same-chat delivery acknowledgements once", async () => {
    const response = await uploadFile({ "X-Ryze-Message-Id": "9010" });
    const received = await response.json() as { fileId: string };
    const file = await db.getFileForUser(received.fileId, ownerId);
    const bytes = await readFile(await storage.getStoredFilePath(file!.storageKey));
    const contentHash = crypto.createHash("sha256").update(bytes).digest("hex");
    const replyKey = "a".repeat(64);
    const command = await db.queueWorkerCommand(ownerId, "primary", "send_file", {
      fileId: file!.id, chatId: "12345", senderId: "12345", sourceMessageId: "9010",
      replyKey, contentHash, byteSize: file!.byteSize, mimeType: file!.mimeType,
      originalName: file!.originalName, caption: "Test delivery",
    });

    const tooEarly = await fetch(`${baseUrl}/api/worker/v1/files/${file!.id}/download?workerId=primary&commandId=${command!.id}`, { headers: auth });
    expect(tooEarly.status).toBe(404);
    await db.updateWorkerCommand(ownerId, "primary", command!.id, "acknowledged");
    const download = await fetch(`${baseUrl}/api/worker/v1/files/${file!.id}/download?workerId=primary&commandId=${command!.id}`, { headers: auth });
    expect(download.status).toBe(200);
    expect(download.headers.get("x-ryze-sha256")).toBe(contentHash);
    expect(Buffer.from(await download.arrayBuffer()).equals(bytes)).toBe(true);

    const wrongChat = await fetch(`${baseUrl}/api/worker/v1/commands/${command!.id}/ack`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: "primary", status: "completed", chatId: "54321", messageId: "444", contentHash, fileId: file!.id, byteSize: file!.byteSize, mimeType: file!.mimeType }),
    });
    expect(wrongChat.status).toBe(409);

    const ack = await fetch(`${baseUrl}/api/worker/v1/commands/${command!.id}/ack`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: "primary", status: "completed", chatId: "12345", messageId: "444", contentHash, fileId: file!.id, byteSize: file!.byteSize, mimeType: file!.mimeType }),
    });
    expect(ack.status).toBe(200);
    const duplicateAck = await fetch(`${baseUrl}/api/worker/v1/commands/${command!.id}/ack`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: "primary", status: "completed", chatId: "12345", messageId: "444", contentHash, fileId: file!.id, byteSize: file!.byteSize, mimeType: file!.mimeType }),
    });
    expect(duplicateAck.status).toBe(409);
    expect(await db.hasTelegramReplyBeenSent(ownerId, replyKey)).toBe(true);
  });
});
