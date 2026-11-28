import { createHash } from "node:crypto";

export type ProjectionManifestOperation = {
  operation: "upsert_projection" | "delete_projection";
  ryzeMemoryId: string;
  ownerId: number;
  category: "personal" | "experience" | "system";
  memoryType: string;
  version: number;
  sensitivity: "normal" | "restricted";
  tagsHash: string;
  sanitizedContentHash: string;
  sourceRefClass: "sanitized" | "redacted-reference";
};

export type ProjectionManifest = {
  format: "ryze-mempalace-projection-dry-run-v1";
  mode: "dry-run";
  writesPerformed: false;
  provider: { name: "mempalace"; commit: string };
  namespace: string;
  branch: string;
  recordCount: number;
  operations: ProjectionManifestOperation[];
};

export type ProjectionApproval = {
  manifestSha256: string;
  providerCommit: string;
  namespace: string;
  branch: string;
  operationCount: number;
  expiresAt: string;
};

export type ProjectionApprovalResult =
  | { approved: true; manifest: ProjectionManifest }
  | { approved: false; reasons: string[] };

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isManifest(value: unknown): value is ProjectionManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProjectionManifest>;
  return candidate.format === "ryze-mempalace-projection-dry-run-v1"
    && candidate.mode === "dry-run"
    && candidate.writesPerformed === false
    && candidate.provider?.name === "mempalace"
    && typeof candidate.provider.commit === "string"
    && typeof candidate.namespace === "string"
    && typeof candidate.branch === "string"
    && Number.isInteger(candidate.recordCount)
    && Array.isArray(candidate.operations);
}

export function validateProjectionApproval(manifestJson: string, approval: ProjectionApproval | undefined, now = new Date()): ProjectionApprovalResult {
  const reasons: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestJson.replace(/^\uFEFF/, ""));
  } catch {
    return { approved: false, reasons: ["manifest is not valid JSON"] };
  }
  if (!isManifest(parsed)) return { approved: false, reasons: ["manifest shape is not an approved dry-run format"] };
  const manifest = parsed;
  if (manifest.recordCount !== manifest.operations.length) reasons.push("record count does not match operations");
  const operationKeys = new Set<string>();
  for (const operation of manifest.operations) {
    const operationKey = `${operation.ryzeMemoryId}:v${operation.version}`;
    if (operationKeys.has(operationKey)) reasons.push("manifest contains duplicate record versions");
    operationKeys.add(operationKey);
  }
  if (manifest.operations.some(operation => operation.operation !== "upsert_projection" || operation.ownerId < 1 || operation.version < 1 || operation.sensitivity !== "normal" || operation.category === "system" || !isSha256(operation.tagsHash) || !isSha256(operation.sanitizedContentHash) || !["sanitized", "redacted-reference"].includes(operation.sourceRefClass))) {
    reasons.push("manifest contains an operation outside the default approved scope");
  }
  if (!approval) reasons.push("owner approval is absent");
  else {
    if (sha256(manifestJson) !== approval.manifestSha256) reasons.push("manifest hash changed");
    if (manifest.provider.commit !== approval.providerCommit) reasons.push("provider revision changed");
    if (manifest.namespace !== approval.namespace) reasons.push("namespace changed");
    if (manifest.branch !== approval.branch) reasons.push("branch changed");
    if (manifest.operations.length !== approval.operationCount) reasons.push("operation count changed");
    const expiresAt = Date.parse(approval.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) reasons.push("approval is expired or invalid");
  }
  return reasons.length ? { approved: false, reasons } : { approved: true, manifest };
}

export function manifestSha256(manifestJson: string) {
  return sha256(manifestJson);
}
