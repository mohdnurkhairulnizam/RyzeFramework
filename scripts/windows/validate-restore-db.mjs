import Database from "better-sqlite3";
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
  "id",
  "userId",
  "scope",
  "legacyScope",
  "category",
  "memoryType",
  "kind",
  "content",
  "tags",
  "outcome",
  "createdAt",
];

export function checkRestoreDatabase(databasePath) {
  let database;
  try {
    database = new Database(databasePath, { readonly: true, fileMustExist: true });
    const checks = database.pragma("integrity_check");
    if (checks.length !== 1 || checks[0]?.integrity_check !== "ok") {
      return { ok: false, reason: "SQLite integrity_check did not return exactly 'ok'." };
    }

    const tables = new Set(
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map(row => row.name),
    );
    const missingTables = requiredTables.filter(name => !tables.has(name));
    if (missingTables.length) {
      return { ok: false, reason: `Required Ryze tables are missing: ${missingTables.join(", ")}.` };
    }

    const columns = new Set(
      database.pragma("table_info(ryze_memory)").map(column => column.name),
    );
    const missingColumns = requiredMemoryColumns.filter(name => !columns.has(name));
    if (missingColumns.length) {
      return { ok: false, reason: `Required Stage 2 memory columns are missing: ${missingColumns.join(", ")}.` };
    }
    return { ok: true, reason: "SQLite integrity and required Ryze Stage 2 schema checks passed." };
  } catch {
    return { ok: false, reason: "The selected SQLite database could not be opened and validated." };
  } finally {
    database?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const databasePath = process.argv[2];
  if (!databasePath) {
    console.error("Usage: node validate-restore-db.mjs <sqlite-file>");
    process.exitCode = 2;
  } else {
    const result = checkRestoreDatabase(databasePath);
    console.log(result.reason);
    if (!result.ok) process.exitCode = 1;
  }
}
