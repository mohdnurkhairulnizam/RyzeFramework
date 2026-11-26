import fs from "node:fs";
import process from "node:process";
import Database from "better-sqlite3";

const databasePath = process.argv[2];
if (!databasePath) {
  console.error("Usage: node validate-restore-db.mjs <path-to-ryze.sqlite>");
  process.exit(2);
}
if (!fs.existsSync(databasePath)) {
  console.error(`SQLite file not found: ${databasePath}`);
  process.exit(2);
}

const db = new Database(databasePath, { readonly: true, fileMustExist: true });
try {
  const result = db.pragma("integrity_check");
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  console.log(`SQLite path: ${databasePath}`);
  console.log(`Integrity check: ${Array.isArray(result) ? result.join(", ") : String(result)}`);
  console.log(`Tables discovered: ${rows.map(row => row.name).join(", ") || "none"}`);
  if (!Array.isArray(result) || result.length !== 1 || result[0] !== "ok") process.exitCode = 1;
} finally {
  db.close();
}
