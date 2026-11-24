import { describe, expect, it } from "vitest";
import { parseActionProposal, proposalForDemoAction } from "./actionProposal";
import { validateRuntimeConfiguration } from "./runtimeConfig";
import { validateFileMetadata, validateGeneratedArtifact, validateTelegramAcknowledgement } from "./resultValidators";

const localConfig = {
  schemaVersion: "v1" as const,
  localMode: true,
  providerBaseUrl: "https://gateway.example/v1",
  providerApiKey: "secret",
  providerModel: "auto",
  openCodeBaseUrl: "http://127.0.0.1:4096",
  workerToken: "worker",
  workerOwnerOpenId: "owner",
  hostedDatabaseUrl: "",
  hostedOAuthUrl: "",
};

describe("Stage 1 hardening boundaries", () => {
  it("accepts the v1 local contract with explicit auto and rejects contradictions", () => {
    expect(validateRuntimeConfiguration(localConfig)).toEqual([]);
    expect(validateRuntimeConfiguration({ ...localConfig, providerModel: "" })).toContain("FreeLLMAPI URL requires an explicit model selector or auto");
    expect(validateRuntimeConfiguration({ ...localConfig, hostedDatabaseUrl: "mysql://unexpected" })).toContain("local mode cannot define DATABASE_URL");
  });

  it("parses only the structured no-side-effect action proposal", () => {
    expect(proposalForDemoAction("generate_note", "write a note")?.permission).toBe("L1_LOCAL_WRITE");
    expect(proposalForDemoAction("blocked", "run powershell")).toBeNull();
    expect(() => parseActionProposal({ version: "v1", action: "send_email", permission: "L1_LOCAL_WRITE", rationale: "x", input: "x", requiresExternalSideEffect: true })).toThrow();
  });

  it("rejects unsafe metadata and accepts generated artifacts only with a bounded key", () => {
    expect(validateFileMetadata({ originalName: "note.md", mimeType: "text/markdown", byteSize: 10, storageKey: "ryze/1/uploads/1-note.md" }).mimeType).toBe("text/markdown");
    expect(() => validateFileMetadata({ originalName: "../secret", mimeType: "text/markdown", byteSize: 10, storageKey: "ryze/1/uploads/secret" })).toThrow();
    expect(validateGeneratedArtifact({ originalName: "note.md", mimeType: "text/markdown", byteSize: 10, storageKey: "ryze/1/generated/note.md", source: "generated", category: "documents" }).source).toBe("generated");
  });

  it("requires a bounded Telegram acknowledgement shape", () => {
    expect(validateTelegramAcknowledgement({ status: "completed", chatId: "123", messageId: "456", contentHash: "a".repeat(64) }).status).toBe("completed");
    expect(() => validateTelegramAcknowledgement({ status: "completed", chatId: "123", messageId: "456", contentHash: "not-a-hash", privateToken: "do-not-accept" })).toThrow();
    expect(validateTelegramAcknowledgement({ status: "completed", chatId: "123", messageId: "456", contentHash: "b".repeat(64), fileId: `file_${"a".repeat(14)}`, byteSize: 100, mimeType: "text/markdown" }).fileId).toBe(`file_${"a".repeat(14)}`);
    expect(() => validateTelegramAcknowledgement({ status: "completed", chatId: "123", messageId: "456", contentHash: "b".repeat(64), fileId: "../other", byteSize: 100, mimeType: "text/markdown" })).toThrow();
  });
});
