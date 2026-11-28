import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { McpMemPalaceBridge } from "../server/mempalaceMcpBridge";
import type { MemPalaceDrawer } from "../server/memPalaceMemoryProvider";

type InputRecord = {
  id: string;
  ownerId: number;
  category: "personal" | "experience" | "system";
  memoryType: string;
  content: string;
  tags?: string[];
  sourceRef?: string;
};

const forbiddenKey = /(password|secret|token|api[_-]?key|session|credential|cookie|private[_-]?key)/i;
const sensitivePattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|bearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{12,}|\b(?:\d[ -]?){13,19}\b)/i;

function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function redactContent(content: string) {
  return content
    .replace(/https?:\/\/[^\s]+/gi, "[REDACTED_URL]")
    .replace(/[A-Z]:\\[^\s]+/gi, "[REDACTED_PATH]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]")
    .replace(/\b(?:password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function loadRecords(inputPath: string): InputRecord[] {
  // Windows PowerShell 5.1 writes UTF-8 text with a BOM by default.
  // Remove only the BOM; keep all other input validation strict.
  const raw = readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Input must be a non-empty JSON array of explicitly sanitized records.");
  for (const [index, record] of parsed.entries()) {
    if (!record || typeof record !== "object") throw new Error(`Record ${index} is not an object.`);
    for (const key of Object.keys(record)) if (forbiddenKey.test(key)) throw new Error(`Record ${index} contains a forbidden secret-like field name.`);
    if (typeof record.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(record.id)) throw new Error(`Record ${index} has an invalid id.`);
    if (!Number.isInteger(record.ownerId) || record.ownerId < 1) throw new Error(`Record ${index} has an invalid ownerId.`);
    if (!["personal", "experience", "system"].includes(record.category)) throw new Error(`Record ${index} has an invalid category.`);
    if (typeof record.memoryType !== "string" || !record.memoryType) throw new Error(`Record ${index} has an invalid memoryType.`);
    if (typeof record.content !== "string" || !record.content || sensitivePattern.test(record.content)) throw new Error(`Record ${index} contains empty or sensitive-looking content.`);
  }
  return parsed.map(record => ({ ...record, content: redactContent(record.content), tags: Array.isArray(record.tags) ? record.tags.filter((tag: unknown): tag is string => typeof tag === "string").slice(0, 20) : [] }));
}

function createDisposableDatabase(databasePath: string, records: InputRecord[]) {
  mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const database = new Database(databasePath);
  database.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS sanitized_memory (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      source_ref TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active'
    );
  `);
  const insert = database.prepare(`INSERT INTO sanitized_memory (id, owner_id, category, memory_type, content, tags_json, source_ref) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const transaction = database.transaction(() => {
    for (const record of records) insert.run(record.id, record.ownerId, record.category, record.memoryType, record.content, JSON.stringify(record.tags ?? []), record.sourceRef ?? `sanitized://${record.id}`);
  });
  transaction();
  const integrity = database.pragma("integrity_check");
  if (integrity[0]?.integrity_check !== "ok") throw new Error("Disposable sanitized database failed integrity_check.");
  database.close();
}

const inputPath = arg("--input");
const databasePath = arg("--database", resolve(process.cwd(), ".tmp/sanitized-mempalace.sqlite"))!;
const palace = arg("--palace");
const command = arg("--command", "mempalace-mcp")!;
if (!inputPath) throw new Error("Usage: tsx scripts/sanitized-mempalace-copy.ts --input <sanitized-json> [--database <disposable.sqlite>] [--palace <palace>] [--command <mcp-command>]");
const records = loadRecords(inputPath);
createDisposableDatabase(databasePath, records);
console.log(`sanitized_records=${records.length}`);
console.log(`disposable_database=${databasePath}`);
console.log(`database_sha256=${createHash("sha256").update(JSON.stringify(records)).digest("hex")}`);
console.log("sanitized_input=PASS");
console.log("disposable_sqlite_integrity=PASS");

if (palace) {
  const bridge = new McpMemPalaceBridge({ command, args: ["--palace", palace] });
  try {
    for (const record of records) {
      const drawer: MemPalaceDrawer = {
        drawerId: `ryze-sanitized:${record.id}:v1`,
        content: record.content,
        metadata: {
          ryzeMemoryId: record.id,
          ownerId: record.ownerId,
          category: record.category,
          memoryType: record.memoryType,
          version: 1,
          branchId: "sanitized-test",
          sensitivity: "normal",
          sourceSystemId: "ryze-sanitized-copy-test",
          sourceRef: record.sourceRef ?? `sanitized://${record.id}`,
        },
      };
      await bridge.addDrawer(drawer);
    }
    console.log("mempalace_projection=PASS");
  } finally {
    await bridge.close();
  }
} else {
  console.log("mempalace_projection=SKIPPED (provide --palace to project into a disposable palace)");
}
