import { readFileSync } from "node:fs";
import { ENV } from "./_core/env";
import { sqliteMemoryProvider } from "./sqliteMemoryProvider";
import { MemPalaceMemoryProvider } from "./memPalaceMemoryProvider";
import { McpMemPalaceBridge } from "./mempalaceMcpBridge";
import { sqliteMemPalaceProjectionOutbox } from "./mempalaceProjectionOutbox";
import type { MemoryProvider } from "./memoryProvider";
import { validateProjectionApproval } from "./mempalaceProjectionApproval";

export type MemoryProviderMode = "disabled" | "projection-only";

function parseArgs(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(item => typeof item !== "string")) throw new Error("args must be a JSON string array");
    return parsed;
  } catch {
    throw new Error("RYZE_MEMPALACE_ARGS must be a JSON string array when projection-only mode is enabled.");
  }
}

const mode = ENV.memPalaceMode;
let provider: MemoryProvider = sqliteMemoryProvider;
let projectionProvider: MemPalaceMemoryProvider | undefined;
let configurationError: string | undefined;
let approvedManifestSha256: string | undefined;
let approvedOperationCount: number | undefined;
let approvalExpiresAt: string | undefined;

if (mode === "projection-only") {
  try {
    if (!ENV.memPalaceNamespace || !ENV.memPalaceBranch || !ENV.memPalaceProviderRevision || !ENV.memPalaceCommand) {
      throw new Error("projection-only mode requires RYZE_MEMPALACE_NAMESPACE, RYZE_MEMPALACE_BRANCH, RYZE_MEMPALACE_PROVIDER_REVISION, and RYZE_MEMPALACE_COMMAND.");
    }
    if (!ENV.memPalaceManifestPath || !ENV.memPalaceApprovalPath) {
      throw new Error("projection-only mode requires RYZE_MEMPALACE_MANIFEST_PATH and RYZE_MEMPALACE_APPROVAL_PATH.");
    }
    const manifestJson = readFileSync(ENV.memPalaceManifestPath, "utf8");
    const approval = JSON.parse(readFileSync(ENV.memPalaceApprovalPath, "utf8")) as Parameters<typeof validateProjectionApproval>[1];
    const approvalResult = validateProjectionApproval(manifestJson, approval);
    if (!approvalResult.approved) throw new Error(`Projection approval rejected: ${approvalResult.reasons.join("; ")}`);
    if (!approval) throw new Error("Projection approval is absent.");
    if (approvalResult.manifest.provider.commit !== ENV.memPalaceProviderRevision
      || approvalResult.manifest.namespace !== ENV.memPalaceNamespace
      || approvalResult.manifest.branch !== ENV.memPalaceBranch) {
      throw new Error("Projection manifest does not match the configured provider revision, namespace, or branch.");
    }
    const approvedVersions = new Set(approvalResult.manifest.operations.map(operation => `${operation.ryzeMemoryId}:v${operation.version}`));
    approvedManifestSha256 = approval.manifestSha256;
    approvedOperationCount = approval.operationCount;
    approvalExpiresAt = approval.expiresAt;
    const bridge = new McpMemPalaceBridge({
      command: ENV.memPalaceCommand,
      args: parseArgs(ENV.memPalaceArgs),
      cwd: ENV.memPalaceWorkingDirectory || undefined,
      env: ENV.memPalaceNamespace ? { RYZE_MEMPALACE_NAMESPACE: ENV.memPalaceNamespace } : undefined,
    });
    projectionProvider = new MemPalaceMemoryProvider({
      canonical: sqliteMemoryProvider,
      bridge,
      outbox: sqliteMemPalaceProjectionOutbox,
      providerRevision: ENV.memPalaceProviderRevision,
      namespace: ENV.memPalaceNamespace,
      projectionLeaseExpiresAt: approval.expiresAt,
      maxReplayItems: ENV.memPalaceMaxReplayItems,
      searchDerivedCandidates: ENV.memPalaceSearchDerived,
      shouldProject: entry => entry.category !== "system"
        && entry.sensitivity === "normal"
        && entry.status === "active"
        && approvedVersions.has(`${entry.id}:v${entry.version}`),
    });
    provider = projectionProvider;
  } catch (error) {
    configurationError = error instanceof Error ? error.message : String(error);
    provider = sqliteMemoryProvider;
  }
}

export const activeMemoryProvider = provider;

export async function getMemoryProviderRuntimeHealth() {
  if (!projectionProvider) {
    return {
      mode,
      enabled: false,
      searchable: false,
      failClosed: Boolean(configurationError),
      configurationError,
      manifestSha256: approvedManifestSha256,
      approvedOperationCount,
      leaseActive: false,
      leaseExpiresAt: approvalExpiresAt,
      maxReplayItems: ENV.memPalaceMaxReplayItems,
      reconciliationStatus: "healthy",
      canonicalSqliteAvailable: true,
    };
  }
  return {
    mode,
    ...(await projectionProvider.getProjectionHealth()),
    failClosed: false,
    configurationError,
    manifestSha256: approvedManifestSha256,
    approvedOperationCount,
  };
}
