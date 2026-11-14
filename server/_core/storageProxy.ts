import { createReadStream } from "node:fs";
import type { Express, Request, Response } from "express";
import { getFileForUser } from "../db";
import { getStoredFilePath } from "../storage";
import { sdk } from "./sdk";

function safeFilename(name: string): string {
  const cleaned = name.replace(/[\r\n"\\/\0]/g, "_").trim().slice(0, 180);
  return cleaned || "download.bin";
}

export function registerStorageProxy(app: Express) {
  app.get("/api/files/:fileId/download", async (req: Request, res: Response) => {
    const fileId = req.params.fileId;
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(fileId)) {
      res.status(404).send("File not found");
      return;
    }

    try {
      const user = await sdk.authenticateRequest(req);
      const file = await getFileForUser(fileId, user.id);
      if (!file) {
        res.status(404).send("File not found");
        return;
      }
      const filePath = await getStoredFilePath(file.storageKey);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
      res.attachment(safeFilename(file.originalName));
      const stream = createReadStream(filePath);
      stream.on("error", () => {
        if (!res.headersSent) res.status(404).send("File not found");
        else res.destroy();
      });
      stream.pipe(res);
    } catch {
      if (!res.headersSent) res.status(401).send("File not found");
      else res.destroy();
    }
  });
}
