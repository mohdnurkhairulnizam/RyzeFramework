import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-retrieval-eval-"));
const originalEnv = {
  dataDir: process.env.RYZE_DATA_DIR,
  ownerId: process.env.RYZE_LOCAL_OWNER_OPEN_ID,
};
process.env.RYZE_DATA_DIR = dataRoot;
process.env.RYZE_LOCAL_OWNER_OPEN_ID = "synthetic-retrieval-eval-owner";

const names: Record<string, string> = {};

try {
  const db = await import("../server/db");
  const { sqliteMemoryProvider } = await import(
    "../server/sqliteMemoryProvider"
  );
  const { buildRetrievalContext } = await import("../server/memoryGovernance");
  await db.getDb();
  const ownerId = (await db.ensureLocalOwner()).id;
  await db.upsertUser({
    openId: "synthetic-retrieval-eval-other",
    name: "Synthetic other owner",
    role: "user",
  });
  const otherOwnerId = (await db.getUserByOpenId(
    "synthetic-retrieval-eval-other"
  ))!.id;

  const fixtures = [
    {
      name: "personal_concise_reports",
      ownerId,
      category: "personal" as const,
      memoryType: "preference" as const,
      sensitivity: "normal" as const,
      content:
        "Prefer concise executive summaries for weekly project status reports.",
      tags: ["reporting", "writing"],
    },
    {
      name: "migration_recovery_procedure",
      ownerId,
      category: "experience" as const,
      memoryType: "procedural" as const,
      sensitivity: "normal" as const,
      content:
        "If a SQLite migration fails, preserve the current database, capture logs, restore a verified backup, and retry on a clean copy.",
      tags: ["migration", "recovery"],
    },
    {
      name: "project_atlas_dashboard",
      ownerId,
      category: "experience" as const,
      memoryType: "project" as const,
      sensitivity: "normal" as const,
      content:
        "Project Atlas dashboard uses navy styling and PostgreSQL metrics for the operator console.",
      tags: ["atlas", "dashboard"],
    },
    {
      name: "project_atlas_2_ingestion",
      ownerId,
      category: "experience" as const,
      memoryType: "project" as const,
      sensitivity: "normal" as const,
      content:
        "Project Atlas 2 is a separate ingestion migration using SQLite and telemetry.",
      tags: ["atlas-2", "ingestion"],
    },
    {
      name: "project_beacon_windows_restore",
      ownerId,
      category: "experience" as const,
      memoryType: "episodic" as const,
      sensitivity: "normal" as const,
      content:
        "Project Beacon Windows restore on 2026-11-12 completed after resetting data folder ACLs.",
      tags: ["beacon", "windows", "restore"],
    },
    {
      name: "restricted_deployment_credential",
      ownerId,
      category: "system" as const,
      memoryType: "semantic" as const,
      sensitivity: "restricted" as const,
      content:
        "Production deployment unlock credential is provisioned by the Windows administrator.",
      tags: ["deployment", "credential"],
    },
    {
      name: "other_owner_atlas_note",
      ownerId: otherOwnerId,
      category: "experience" as const,
      memoryType: "project" as const,
      sensitivity: "normal" as const,
      content:
        "Project Atlas is owned by the other account; synthetic isolation marker ORANGE-731.",
      tags: ["atlas", "isolation"],
    },
  ];

  for (const fixture of fixtures) {
    const entry = await sqliteMemoryProvider.store({
      ownerId: fixture.ownerId,
      category: fixture.category,
      memoryType: fixture.memoryType,
      content: fixture.content,
      tags: fixture.tags,
      sensitivity: fixture.sensitivity,
      createdBy: "owner",
    });
    names[entry.id] = fixture.name;
    (fixture as typeof fixture & { id: string }).id = entry.id;
  }

  const ownerFixtures = fixtures.filter(
    fixture => fixture.ownerId === ownerId
  ) as Array<(typeof fixtures)[number] & { id: string }>;
  const byName = Object.fromEntries(
    ownerFixtures.map(fixture => [fixture.name, fixture.id])
  );
  const cases = [
    {
      name: "literal preference retrieval",
      query: "weekly project status reports",
      expected: [byName.personal_concise_reports],
    },
    {
      name: "migration recovery retrieval",
      query: "migration fails restore backup",
      expected: [byName.migration_recovery_procedure],
    },
    {
      name: "similarly named Atlas project discrimination",
      query: "Atlas dashboard navy styling",
      expected: [byName.project_atlas_dashboard],
    },
    {
      name: "Atlas 2 project discrimination",
      query: "Atlas 2 SQLite telemetry",
      expected: [byName.project_atlas_2_ingestion],
    },
    {
      name: "dated Windows restore retrieval",
      query: "Beacon Windows restore resetting ACLs",
      expected: [byName.project_beacon_windows_restore],
    },
    {
      name: "semantic paraphrase recall check",
      query: "brief executive memo",
      expected: [byName.personal_concise_reports],
    },
    {
      name: "unrelated query returns no matches",
      query: "canary observability",
      expected: [],
    },
    { name: "owner isolation marker", query: "ORANGE-731", expected: [] },
  ];

  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  const caseResults = [];
  for (const testCase of cases) {
    const found = await sqliteMemoryProvider.search({
      ownerId,
      query: testCase.query,
      limit: 12,
    });
    const foundIds = found.map(entry => entry.id);
    const expectedIds = testCase.expected;
    const tp = foundIds.filter(id => expectedIds.includes(id)).length;
    const fp = foundIds.filter(id => !expectedIds.includes(id)).length;
    const fn = expectedIds.filter(id => !foundIds.includes(id)).length;
    truePositive += tp;
    falsePositive += fp;
    falseNegative += fn;
    caseResults.push({
      name: testCase.name,
      query: testCase.query,
      expected: expectedIds.map(id => names[id]),
      retrieved: foundIds.map(id => names[id]),
      tp,
      fp,
      fn,
    });
  }

  const restrictedDefault = await buildRetrievalContext({
    ownerId,
    category: "system",
    query: "deployment unlock credential",
    limit: 12,
  });
  const restrictedExplicit = await buildRetrievalContext({
    ownerId,
    category: "system",
    query: "deployment unlock credential",
    includeRestricted: true,
    limit: 12,
  });
  const crossOwnerSearch = await sqliteMemoryProvider.search({
    ownerId,
    query: "ORANGE-731",
    limit: 12,
  });
  const otherOwnerSearch = await sqliteMemoryProvider.search({
    ownerId: otherOwnerId,
    query: "ORANGE-731",
    limit: 12,
  });

  const precision =
    truePositive + falsePositive
      ? truePositive / (truePositive + falsePositive)
      : 1;
  const recall =
    truePositive + falseNegative
      ? truePositive / (truePositive + falseNegative)
      : 1;
  const f1 =
    precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const output = {
    evaluation: "Gate 3 SQLite retrieval — isolated synthetic evaluation",
    fixtureCount: fixtures.length,
    ownerQueryCount: cases.length,
    measures: {
      microPrecision: Number(precision.toFixed(4)),
      microRecall: Number(recall.toFixed(4)),
      microF1: Number(f1.toFixed(4)),
      truePositive,
      falsePositive,
      falseNegative,
    },
    checks: {
      restrictedDefaultExcluded:
        restrictedDefault.entries.length === 0 &&
        restrictedDefault.excludedRestricted === 1,
      restrictedExplicitlyIncluded:
        restrictedExplicit.entries.length === 1 &&
        restrictedExplicit.entries[0]?.sensitivity === "restricted",
      ownerIsolation:
        crossOwnerSearch.length === 0 && otherOwnerSearch.length === 1,
    },
    cases: caseResults,
    note: "Synthetic fixtures only; this is not a production-data evaluation or formal Gate 4 acceptance. The paraphrase case intentionally measures the current lexical SQLite fallback's semantic-recall limitation.",
  };
  console.log(JSON.stringify(output, null, 2));
  await db.closeDb();
} finally {
  process.env.RYZE_DATA_DIR = originalEnv.dataDir;
  process.env.RYZE_LOCAL_OWNER_OPEN_ID = originalEnv.ownerId;
  rmSync(dataRoot, { recursive: true, force: true });
}
