import type Database from "better-sqlite3";

const memoryColumns: Record<string, string> = {
  legacyScope: "text",
  category: "text",
  memoryType: "text",
  ownerScope: "text DEFAULT 'owner' NOT NULL",
  sourceSystemId: "text",
  branchId: "text DEFAULT 'main' NOT NULL",
  sourceRef: "text",
  derivedFrom: "text",
  createdBy: "text",
  // SQLite rejects a non-constant default when adding a column to a populated table.
  updatedAt: "integer",
  version: "integer",
  status: "text DEFAULT 'legacy_unclassified'",
  sensitivity: "text DEFAULT 'normal'",
  syncStatus: "text DEFAULT 'local'",
};

const fileColumns: Record<string, string> = {
  sourceFileId: "text",
  sourceContentHash: "text",
  generatorLabel: "text",
};

/**
 * Repairs databases where Drizzle skipped migration 0005 because its journal
 * timestamp is earlier than migration 0004. This operation only adds missing
 * Stage 2 schema objects and backfills compatibility metadata; it never
 * removes or rewrites existing memory content.
 */
export function ensureStage2SchemaCompatibility(sqlite: Database.Database) {
  const tables = new Set(
    (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map(row => row.name),
  );
  if (!tables.has("ryze_memory")) return;

  sqlite.transaction(() => {
    const columns = new Set(
      (sqlite.pragma("table_info(ryze_memory)") as Array<{ name: string }>).map(column => column.name),
    );
    for (const [name, definition] of Object.entries(memoryColumns)) {
      if (!columns.has(name)) {
        sqlite.exec(`ALTER TABLE ryze_memory ADD COLUMN \`${name}\` ${definition}`);
      }
    }

    if (tables.has("ryze_files")) {
      const fileTableColumns = new Set(
        (sqlite.pragma("table_info(ryze_files)") as Array<{ name: string }>).map(column => column.name),
      );
      for (const [name, definition] of Object.entries(fileColumns)) {
        if (!fileTableColumns.has(name)) sqlite.exec(`ALTER TABLE ryze_files ADD COLUMN \`${name}\` ${definition}`);
      }
    }

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ryze_identity_profiles (
        id text PRIMARY KEY NOT NULL,
        userId integer NOT NULL,
        name text NOT NULL,
        role text NOT NULL,
        description text NOT NULL,
        communicationStyle text NOT NULL,
        workingPrinciples text NOT NULL,
        version integer DEFAULT 1 NOT NULL,
        createdAt integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updatedAt integer DEFAULT (unixepoch() * 1000) NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ryze_identity_profiles_user_uq
        ON ryze_identity_profiles (userId);
      CREATE TABLE IF NOT EXISTS ryze_identity_revisions (
        id text PRIMARY KEY NOT NULL,
        profileId text NOT NULL,
        userId integer NOT NULL,
        name text NOT NULL,
        role text NOT NULL,
        description text NOT NULL,
        communicationStyle text NOT NULL,
        workingPrinciples text NOT NULL,
        version integer NOT NULL,
        changedBy text NOT NULL,
        createdAt integer DEFAULT (unixepoch() * 1000) NOT NULL,
        FOREIGN KEY (profileId) REFERENCES ryze_identity_profiles(id) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (userId) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
      );
      CREATE TABLE IF NOT EXISTS ryze_system_memory (
        id text PRIMARY KEY NOT NULL,
        userId integer NOT NULL,
        memoryType text NOT NULL,
        content text NOT NULL,
        tags text NOT NULL,
        sourceSystemId text NOT NULL,
        branchId text DEFAULT 'main' NOT NULL,
        sourceRef text,
        derivedFrom text,
        createdBy text NOT NULL,
        version integer DEFAULT 1 NOT NULL,
        status text DEFAULT 'active' NOT NULL,
        sensitivity text DEFAULT 'normal' NOT NULL,
        syncStatus text DEFAULT 'local' NOT NULL,
        createdAt integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updatedAt integer DEFAULT (unixepoch() * 1000) NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
      );
      UPDATE ryze_memory
      SET legacyScope = scope,
          updatedAt = COALESCE(updatedAt, unixepoch() * 1000),
          status = 'legacy_unclassified',
          sensitivity = 'normal',
          syncStatus = 'local'
      WHERE legacyScope IS NULL;
    `);
  })();
}
