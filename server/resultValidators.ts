import { z } from "zod";

export const fileMetadataSchema = z.object({
  originalName: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9._-]+$/),
  mimeType: z.enum([
    "text/plain", "text/markdown", "text/csv", "application/json", "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg",
  ]),
  byteSize: z.number().int().positive().max(5 * 1024 * 1024),
  storageKey: z.string().regex(/^ryze\/\d+\/(?:uploads|generated|baseline)\/[a-zA-Z0-9._/-]+$/),
});

export const generatedArtifactSchema = fileMetadataSchema.extend({
  source: z.literal("generated"),
  category: z.string().trim().min(1).max(64),
});

export const telegramAcknowledgementSchema = z.object({
  workerId: z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/).optional(),
  status: z.enum(["acknowledged", "completed", "failed"]),
  message: z.string().trim().max(300).optional(),
  chatId: z.string().trim().max(120).optional(),
  messageId: z.string().trim().min(1).max(120).optional(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  fileId: z.string().regex(/^file_[a-zA-Z0-9_-]{14}$/).optional(),
  byteSize: z.number().int().positive().max(5 * 1024 * 1024).optional(),
  mimeType: z.enum([
    "text/plain", "text/markdown", "text/csv", "application/json", "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg",
  ]).optional(),
}).strict();

export function validateFileMetadata(value: unknown) {
  const parsed = fileMetadataSchema.safeParse(value);
  if (!parsed.success) throw new Error("Generated or uploaded file metadata failed strict validation.");
  return parsed.data;
}

export function validateGeneratedArtifact(value: unknown) {
  const parsed = generatedArtifactSchema.safeParse(value);
  if (!parsed.success) throw new Error("Generated artifact failed strict validation.");
  return parsed.data;
}

export function validateTelegramAcknowledgement(value: unknown) {
  const parsed = telegramAcknowledgementSchema.safeParse(value);
  if (!parsed.success) throw new Error("Telegram acknowledgement failed strict validation.");
  return parsed.data;
}
