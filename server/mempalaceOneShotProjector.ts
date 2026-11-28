import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { manifestSha256, validateProjectionApproval, type ProjectionApproval, type ProjectionManifest } from "./mempalaceProjectionApproval";
import type { MemoryEntry, MemoryProvider } from "./memoryProvider";
import type { MemPalaceBridge, MemPalaceDrawer } from "./memPalaceMemoryProvider";
import type { MemPalaceProjectionOutbox, ProjectionReplayReport } from "./mempalaceProjectionOutbox";
import { sqliteMemPalaceProjectionOutbox } from "./mempalaceProjectionOutbox";
import { sqliteMemoryProvider } from "./sqliteMemoryProvider";
import { McpMemPalaceBridge } from "./mempalaceMcpBridge";
import { ENV } from "./_core/env";

const EXPECTED_MODE = "projection-only";
const EXPECTED_PROVIDER = "mempalace";

export type OneShotProjectionOptions = {
  manifestJson: string;
  approval: ProjectionApproval;
  mode: string;
  providerRevision: string;
  namespace: string;
  branch: string;
  canonical?: MemoryProvider;
  bridge: MemPalaceBridge;
  outbox?: MemPalaceProjectionOutbox;
  now?: Date;
};

export type OneShotProjectionReport = {
  status: "completed" | "failed";
  manifestSha256: string;
  provider: string;
  providerRevision: string;
  namespace: string;
  branch: string;
  operationCount: number;
  validated: number;
  attempted: number;
  applied: number;
  failed: number;
  outbox?: unknown;
  error?: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 500);
}

function toDrawer(entry: MemoryEntry): MemPalaceDrawer {
  return {
    drawerId: `ryze:${entry.id}:v${entry.version}`,
    content: entry.content,
    metadata: {
      ryzeMemoryId: entry.id,
      ownerId: entry.ownerId,
      category: entry.category,
      memoryType: entry.memoryType,
      version: entry.version,
      branchId: entry.source.branchId ?? "main",
      sensitivity: entry.sensitivity,
      sourceSystemId: entry.source.sourceSystemId,
      sourceRef: entry.source.sourceRef,
      derivedFrom: entry.source.derivedFrom,
    },
  };
}

function validateRuntime(options: OneShotProjectionOptions, manifest: ProjectionManifest) {
  const reasons: string[] = [];
  if (options.mode !== EXPECTED_MODE) reasons.push(`mode must be ${EXPECTED_MODE}`);
  if (manifest.provider.name !== EXPECTED_PROVIDER) reasons.push("manifest provider is not MemPalace");
  if (manifest.provider.commit !== options.providerRevision) reasons.push("provider revision does not match manifest");
  if (manifest.namespace !== options.namespace) reasons.push("namespace does not match manifest");
  if (manifest.branch !== options.branch) reasons.push("branch does not match manifest");
  if (manifest.writesPerformed !== false) reasons.push("manifest is not a dry-run manifest");
  if (manifest.operations.length !== 8) reasons.push("bounded production projector requires exactly 8 operations");
  return reasons;
}

async function validateCanonicalRecords(manifest: ProjectionManifest, canonical: MemoryProvider) {
  const validated: Array<{ operation: ProjectionManifest["operations"][number]; entry: MemoryEntry }> = [];
  for (const operation of manifest.operations) {
    const entry = await canonical.retrieve(operation.ownerId, operation.ryzeMemoryId);
    if (!entry) throw new Error(`approved memory ${operation.ryzeMemoryId} was not found for owner ${operation.ownerId}`);
    const tags = entry.tags ?? [];
    const reasons: string[] = [];
    if (entry.ownerId !== operation.ownerId) reasons.push("owner mismatch");
    if (entry.category !== operation.category) reasons.push("category mismatch");
    if (entry.memoryType !== operation.memoryType) reasons.push("memory type mismatch");
    if (entry.version !== operation.version) reasons.push("version mismatch");
    if (entry.status !== "active") reasons.push("record is not active");
    if (entry.sensitivity !== "normal") reasons.push("record is not normal sensitivity");
    if (entry.category === "system") reasons.push("System Memory is excluded");
    if (!entry.source.sourceRef) reasons.push("provenance source reference is absent");
    if (sha256(JSON.stringify(tags)) !== operation.tagsHash) reasons.push("tags hash mismatch");
    if (sha256(entry.content) !== operation.sanitizedContentHash) reasons.push("content hash mismatch");
    const sourceRefClass = entry.source.sourceRef?.startsWith("sanitized://") ? "sanitized" : "redacted-reference";
    if (sourceRefClass !== operation.sourceRefClass) reasons.push("source reference class mismatch");
    if (reasons.length) throw new Error(`approved memory ${operation.ryzeMemoryId} failed canonical validation: ${reasons.join(", ")}`);
    validated.push({ operation, entry });
  }
  return validated;
}

export async function runOneShotProjection(options: OneShotProjectionOptions): Promise<OneShotProjectionReport> {
  const hash = manifestSha256(options.manifestJson);
  const base = {
    manifestSha256: hash,
    provider: EXPECTED_PROVIDER,
    providerRevision: options.providerRevision,
    namespace: options.namespace,
    branch: options.branch,
    operationCount: 0,
    validated: 0,
    attempted: 0,
    applied: 0,
    failed: 0,
  };
  try {
    const approvalResult = validateProjectionApproval(options.manifestJson, options.approval, options.now);
    if (!approvalResult.approved) throw new Error(`approval validation failed: ${approvalResult.reasons.join("; ")}`);
    const manifest = approvalResult.manifest;
    const runtimeReasons = validateRuntime(options, manifest);
    if (runtimeReasons.length) throw new Error(`runtime validation failed: ${runtimeReasons.join("; ")}`);
    const canonical = options.canonical ?? sqliteMemoryProvider;
    const validated = await validateCanonicalRecords(manifest, canonical);
    const outbox = options.outbox ?? sqliteMemPalaceProjectionOutbox;
    await outbox.recoverAfterRestart();
    const before = await outbox.getHealth?.();
    if (before && (before.pending > 0 || before.inFlight > 0 || before.failed > 0)) {
      throw new Error("projection outbox is not clean; refusing to mix unrelated or failed work into bounded replay");
    }
    for (const { entry } of validated) {
      const drawer = toDrawer(entry);
      await outbox.enqueue({ userId: entry.ownerId, memoryId: entry.id, operation: "upsert", projectionKey: drawer.drawerId, drawer });
    }
    const replay: ProjectionReplayReport = await outbox.replay(options.bridge, manifest.operations.length);
    const after = await outbox.getHealth?.();
    const report: OneShotProjectionReport = { ...base, status: "failed", operationCount: manifest.operations.length, validated: validated.length, ...replay, outbox: after };
    if (replay.failed || replay.applied !== manifest.operations.length || replay.attempted !== manifest.operations.length) {
      return { ...report, status: "failed", error: "bounded projection did not apply every approved operation" };
    }
    return { ...report, status: "completed" };
  } catch (error) {
    return { ...base, status: "failed", error: safeError(error) };
  }
}

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  if (!process.argv.includes("--confirm-bounded-projection")) throw new Error("Refusing to run without --confirm-bounded-projection.");
  const manifestPath = arg("--manifest") ?? ENV.memPalaceManifestPath;
  const approvalPath = arg("--approval") ?? ENV.memPalaceApprovalPath;
  const manifestJson = readFileSync(manifestPath, "utf8");
  const approval = JSON.parse(readFileSync(approvalPath, "utf8")) as ProjectionApproval;
  let args: string[];
  try {
    const parsed = JSON.parse(ENV.memPalaceArgs);
    if (!Array.isArray(parsed) || parsed.some(item => typeof item !== "string")) throw new Error("not a string array");
    args = parsed;
  } catch {
    throw new Error("RYZE_MEMPALACE_ARGS must be a JSON array of strings.");
  }
  const bridge = new McpMemPalaceBridge({ command: ENV.memPalaceCommand, args, cwd: ENV.memPalaceWorkingDirectory || undefined });
  try {
    const report = await runOneShotProjection({
      manifestJson,
      approval,
      mode: ENV.memPalaceMode,
      providerRevision: ENV.memPalaceProviderRevision,
      namespace: ENV.memPalaceNamespace,
      branch: ENV.memPalaceBranch,
      bridge,
    });
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "completed") process.exitCode = 1;
  } finally {
    await bridge.close();
  }
}

if (process.argv[1]?.endsWith("mempalaceOneShotProjector.ts")) void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
