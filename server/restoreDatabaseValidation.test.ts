import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { checkRestoreDatabase } from "../scripts/windows/validate-restore-db.mjs";

const roots: string[] = [];
function tempDb() {
  const root = mkdtempSync(path.join(os.tmpdir(), "ryze-restore-validation-"));
  roots.push(root);
  return { root, file: path.join(root, "ryze.sqlite") };
}
function createDatabase(file: string, includeStage2Columns = true) {
  const sqlite = new Database(file);
  const stage2 = includeStage2Columns
    ? "legacyScope text, category text, memoryType text,"
    : "";
  sqlite.exec(`
    CREATE TABLE users (id integer PRIMARY KEY);
    CREATE TABLE ryze_memory (
      id text PRIMARY KEY,
      userId integer NOT NULL,
      scope text NOT NULL,
      ${stage2}
      kind text NOT NULL,
      content text NOT NULL,
      tags text NOT NULL,
      outcome text NOT NULL,
      createdAt integer NOT NULL
    );
    CREATE TABLE ryze_identity_profiles (id text PRIMARY KEY);
    CREATE TABLE ryze_identity_revisions (id text PRIMARY KEY);
    CREATE TABLE ryze_system_memory (id text PRIMARY KEY);
  `);
  sqlite.close();
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("restore database validation", () => {
  it("accepts an intact SQLite database with required Ryze Stage 2 schema", () => {
    const { file } = tempDb();
    createDatabase(file);
    expect(checkRestoreDatabase(file)).toMatchObject({ ok: true });
  });

  it("rejects a SQLite database missing required Stage 2 columns", () => {
    const { file } = tempDb();
    createDatabase(file, false);
    expect(checkRestoreDatabase(file)).toMatchObject({ ok: false, reason: expect.stringContaining("legacyScope") });
  });

  it("rejects corrupted database bytes without throwing", () => {
    const { file } = tempDb();
    writeFileSync(file, "not a SQLite database");
    expect(checkRestoreDatabase(file)).toMatchObject({ ok: false });
  });

  it("rejects a missing database file", () => {
    const { file } = tempDb();
    expect(checkRestoreDatabase(file)).toMatchObject({ ok: false });
  });
});
