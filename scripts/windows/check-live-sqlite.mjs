import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const requiredTables = [
  "users",
  "ryze_memory",
  "ryze_identity_profiles",
  "ryze_identity_revisions",
  "ryze_system_memory",
];

const requiredMemoryColumns = [
  "id", "userId", "scope", "legacyScope", "category", "memoryType", "kind",
  "content", "tags", "outcome", "createdAt",
];

function fingerprint(database) {
  const rows = database.prepare(`
    SELECT id, userId, category, memoryType, version, status, sensitivity,
           sourceSystemId, sourceRef, branchId, content, tags, createdAt, updatedAt
    FROM ryze_memory
    ORDER BY userId, id, version, createdAt
  `).all();
  const canonical = rows.map(row => JSON.stringify(row)).join("\n");
  return {
    rows: rows.length,
    sha256: createHash("sha256").update(canonical).digest("hex"),
  };
}

export function checkLiveSqlite(databasePath) {
  let database;
  try {
    database = new Database(databasePath, { readonly: true, fileMustExist: true });
    const integrity = database.pragma("integrity_check");
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
      return { ok: false, reason: "SQLite integrity_check did not return exactly 'ok'." };
    }
    const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name));
    const missingTables = requiredTables.filter(name => !tables.has(name));
    if (missingTables.length) return { ok: false, reason: `Required tables missing: ${missingTables.join(", ")}.` };
    const columns = new Set(database.pragma("table_info(ryze_memory)").map(column => column.name));
    const missingColumns = requiredMemoryColumns.filter(name => !columns.has(name));
    if (missingColumns.length) return { ok: false, reason: `Required memory columns missing: ${missingColumns.join(", ")}.` };
    const counts = {
      users: database.prepare("SELECT COUNT(*) AS count FROM users").get().count,
      memories: database.prepare("SELECT COUNT(*) AS count FROM ryze_memory").get().count,
      identities: database.prepare("SELECT COUNT(*) AS count FROM ryze_identity_profiles").get().count,
      identityRevisions: database.prepare("SELECT COUNT(*) AS count FROM ryze_identity_revisions").get().count,
      systemMemory: database.prepare("SELECT COUNT(*) AS count FROM ryze_system_memory").get().count,
    };
    return { ok: true, reason: "SQLite integrity and required Ryze Stage 2 schema checks passed.", counts, fingerprint: fingerprint(database) };
  } catch {
    return { ok: false, reason: "The selected SQLite database could not be opened and validated." };
  } finally {
    database?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const databasePath = process.argv[2];
  if (!databasePath) {
    console.error("Usage: node scripts/windows/check-live-sqlite.mjs <sqlite-file>");
    process.exitCode = 2;
  } else {
    const result = checkLiveSqlite(databasePath);
    if (!result.ok) {
      console.error(`integrity=FAIL reason=${result.reason}`);
      process.exitCode = 1;
    } else {
      console.log("integrity=PASS");
      console.log(result.reason);
      console.log(`counts=${JSON.stringify(result.counts)}`);
      console.log(`memory_rows=${result.fingerprint.rows}`);
      console.log(`memory_sha256=${result.fingerprint.sha256}`);
      console.log("read_only=PASS");
    }
  }
}
