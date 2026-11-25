import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { ensureStage2SchemaCompatibility } from "./stage2SchemaCompatibility";

describe("Stage 2 SQLite schema compatibility", () => {
  it("repairs a pre-0005 database without changing legacy memory content", () => {
    const sqlite = new Database(":memory:");
    try {
      sqlite.exec(`
        CREATE TABLE users (id integer PRIMARY KEY);
        CREATE TABLE ryze_memory (
          id text PRIMARY KEY,
          userId integer NOT NULL,
          scope text NOT NULL,
          kind text NOT NULL,
          content text NOT NULL,
          tags text NOT NULL,
          outcome text NOT NULL,
          createdAt integer NOT NULL
        );
        INSERT INTO users (id) VALUES (1);
        INSERT INTO ryze_memory
          (id, userId, scope, kind, content, tags, outcome, createdAt)
        VALUES ('memory-1', 1, 'core', 'legacy', 'Keep the original content', '[]', 'NEUTRAL', 1234);
      `);

      ensureStage2SchemaCompatibility(sqlite);
      ensureStage2SchemaCompatibility(sqlite);

      const columns = new Set(
        (sqlite.pragma("table_info(ryze_memory)") as Array<{ name: string }>).map(column => column.name),
      );
      expect(columns.has("legacyScope")).toBe(true);
      expect(columns.has("category")).toBe(true);
      expect(columns.has("memoryType")).toBe(true);
      expect(columns.has("syncStatus")).toBe(true);
      expect(sqlite.prepare("SELECT content, scope, legacyScope, status FROM ryze_memory WHERE id = ?").get("memory-1"))
        .toMatchObject({
          content: "Keep the original content",
          scope: "core",
          legacyScope: "core",
          status: "legacy_unclassified",
        });
      const tables = new Set(
        (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map(row => row.name),
      );
      expect(tables.has("ryze_identity_profiles")).toBe(true);
      expect(tables.has("ryze_identity_revisions")).toBe(true);
      expect(tables.has("ryze_system_memory")).toBe(true);
    } finally {
      sqlite.close();
    }
  });
});
