import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type SanitizedRecord = {
  id: string;
  ownerId: number;
  category: "personal" | "experience" | "system";
  memoryType: string;
  content: string;
  tags?: string[];
  sourceRef?: string;
  version?: number;
  status?: "active" | "archived" | "superseded";
  sensitivity?: "normal" | "restricted";
};

const providerCommit = "4df7b830ff1398332d4118884520a24f1aab9cc1";
const forbiddenKey = /(password|secret|token|api[_-]?key|session|credential|cookie|private[_-]?key)/i;
const sensitivePattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|bearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{12,}|\b(?:\d[ -]?){13,19}\b)/i;

function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function loadAndValidate(inputPath: string): SanitizedRecord[] {
  const raw = readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
  const records = JSON.parse(raw);
  if (!Array.isArray(records) || records.length === 0) throw new Error("Dry-run input must be a non-empty JSON array of sanitized records.");
  const seen = new Set<string>();
  return records.map((record, index) => {
    if (!record || typeof record !== "object") throw new Error(`Record ${index} is not an object.`);
    for (const key of Object.keys(record)) if (forbiddenKey.test(key)) throw new Error(`Record ${index} contains a forbidden secret-like field name.`);
    if (typeof record.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(record.id) || seen.has(record.id)) throw new Error(`Record ${index} has a missing, invalid, or duplicate id.`);
    seen.add(record.id);
    if (!Number.isInteger(record.ownerId) || record.ownerId < 1) throw new Error(`Record ${index} has an invalid ownerId.`);
    if (!["personal", "experience", "system"].includes(record.category)) throw new Error(`Record ${index} has an invalid category.`);
    if (typeof record.memoryType !== "string" || !record.memoryType) throw new Error(`Record ${index} has an invalid memoryType.`);
    if (typeof record.content !== "string" || !record.content || sensitivePattern.test(record.content)) throw new Error(`Record ${index} contains empty or sensitive-looking content.`);
    if (record.category === "system") throw new Error("System Memory is excluded from this dry-run gate and requires a separate reviewed policy.");
    if (record.sensitivity === "restricted") throw new Error("Restricted records require a separate explicit approval and are excluded from this dry-run gate.");
    if (record.status && record.status !== "active") throw new Error(`Record ${index} is not active and cannot enter the dry-run allowlist.`);
    return record;
  });
}

const inputPath = arg("--input");
const outputPath = arg("--manifest", resolve(process.cwd(), ".tmp/mempalace-dry-run-manifest.json"))!;
const namespace = arg("--namespace", "ryze-dry-run-sanitized")!;
const branch = arg("--branch", "sanitized-test")!;
if (!inputPath) throw new Error("Usage: tsx scripts/mempalace-production-gate-dry-run.ts --input <sanitized-json> [--manifest <output-json>] [--namespace <namespace>] [--branch <branch>]");
if (!namespace.startsWith("ryze-dry-run-")) throw new Error("Dry-run namespace must start with ryze-dry-run-.");

const records = loadAndValidate(inputPath);
const manifest = {
  format: "ryze-mempalace-projection-dry-run-v1",
  mode: "dry-run",
  writesPerformed: false,
  provider: { name: "mempalace", commit: providerCommit },
  namespace,
  branch,
  recordCount: records.length,
  operations: records.map(record => ({
    operation: "upsert_projection",
    ryzeMemoryId: record.id,
    ownerId: record.ownerId,
    category: record.category,
    memoryType: record.memoryType,
    version: record.version ?? 1,
    sensitivity: record.sensitivity ?? "normal",
    tagsHash: sha256(JSON.stringify(record.tags ?? [])),
    sanitizedContentHash: sha256(record.content),
    sourceRefClass: record.sourceRef?.startsWith("sanitized://") ? "sanitized" : "redacted-reference",
  })),
};
const canonical = JSON.stringify(manifest, null, 2) + "\n";
mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, canonical, "utf8");
console.log("mode=dry-run");
console.log("writes_performed=FALSE");
console.log(`manifest=${resolve(outputPath)}`);
console.log(`manifest_sha256=${sha256(canonical)}`);
console.log(`provider_commit=${providerCommit}`);
console.log(`namespace=${namespace}`);
console.log(`record_count=${records.length}`);
console.log("owner_approval_required=TRUE");
console.log("live_database_opened=FALSE");
console.log("provider_contacted=FALSE");
