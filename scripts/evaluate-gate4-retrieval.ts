import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

type Category = "system" | "experience" | "personal";
type MemoryType = "episodic" | "semantic" | "procedural" | "preference" | "project";
type Sensitivity = "normal" | "restricted";

type FixtureDefinition = {
  key: string;
  openId: "gate4-owner-a" | "gate4-owner-b";
  category: Category;
  memoryType: MemoryType;
  sensitivity: Sensitivity;
  content: string;
  createdAt: string;
  status: "active" | "superseded";
};

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-gate4-retrieval-"));
const databasePath = path.join(dataRoot, "ryze.sqlite");
const originalEnv = {
  dataDir: process.env.RYZE_DATA_DIR,
  databasePath: process.env.RYZE_DATABASE_PATH,
  ownerOpenId: process.env.RYZE_LOCAL_OWNER_OPEN_ID,
  ownerName: process.env.RYZE_LOCAL_OWNER_NAME,
};
process.env.RYZE_DATA_DIR = dataRoot;
process.env.RYZE_DATABASE_PATH = databasePath;
process.env.RYZE_LOCAL_OWNER_OPEN_ID = "gate4-owner-a";
process.env.RYZE_LOCAL_OWNER_NAME = "Synthetic Gate 4 Owner A";

let dbModule: typeof import("../server/db") | undefined;

try {
  const [{ sqliteMemoryProvider }, governance, db] = await Promise.all([
    import("../server/sqliteMemoryProvider"),
    import("../server/memoryGovernance"),
    import("../server/db"),
  ]);
  dbModule = db;
  await db.getDb();
  const ownerA = await db.ensureLocalOwner();
  await db.upsertUser({
    openId: "gate4-owner-b",
    name: "Synthetic Gate 4 Owner B",
    role: "user",
  });
  const ownerB = await db.getUserByOpenId("gate4-owner-b");
  if (!ownerB) throw new Error("Synthetic owner B was not initialized.");

  const fixtures: FixtureDefinition[] = [
    {
      key: "R1",
      openId: "gate4-owner-a",
      category: "personal",
      memoryType: "preference",
      sensitivity: "normal",
      content: "Prefer concise, one-paragraph weekly project updates.",
      createdAt: "2026-09-02T12:00:00.000Z",
      status: "superseded",
    },
    {
      key: "R2",
      openId: "gate4-owner-a",
      category: "personal",
      memoryType: "preference",
      sensitivity: "normal",
      content: "For weekly project reports, use no more than five bullets.",
      createdAt: "2026-11-01T12:00:00.000Z",
      status: "active",
    },
    {
      key: "R3",
      openId: "gate4-owner-a",
      category: "experience",
      memoryType: "project",
      sensitivity: "normal",
      content: "Atlas project decision: use local SQLite persistence for the Atlas workstream.",
      createdAt: "2026-10-01T12:00:00.000Z",
      status: "active",
    },
    {
      key: "R4",
      openId: "gate4-owner-a",
      category: "experience",
      memoryType: "project",
      sensitivity: "normal",
      content: "Atlas 2 is a separate Telegram onboarding project; do not treat it as the Atlas persistence workstream.",
      createdAt: "2026-10-02T12:00:00.000Z",
      status: "active",
    },
    {
      key: "R5",
      openId: "gate4-owner-a",
      category: "experience",
      memoryType: "episodic",
      sensitivity: "normal",
      content: "Synthetic restore exercise dated 2026-11-14: a bad backup was rejected, the pre-restore snapshot was used for recovery, and service resumed.",
      createdAt: "2026-11-14T12:00:00.000Z",
      status: "active",
    },
    {
      key: "R6",
      openId: "gate4-owner-a",
      category: "experience",
      memoryType: "semantic",
      sensitivity: "normal",
      content: "Synthetic migration rule: preserve legacy record IDs, text, tags, outcomes, timestamps, and legacy scope.",
      createdAt: "2026-10-20T12:00:00.000Z",
      status: "active",
    },
    {
      key: "R7",
      openId: "gate4-owner-a",
      category: "system",
      memoryType: "semantic",
      sensitivity: "restricted",
      content: "Synthetic owner-only export rule: ordinary portable exports must not contain credentials or session data.",
      createdAt: "2026-10-25T12:00:00.000Z",
      status: "active",
    },
    {
      key: "R8",
      openId: "gate4-owner-b",
      category: "personal",
      memoryType: "preference",
      sensitivity: "normal",
      content: "Use metric units in measurements.",
      createdAt: "2026-10-30T12:00:00.000Z",
      status: "active",
    },
  ];

  const ownerIds = new Map<string, number>([
    ["gate4-owner-a", ownerA.id],
    ["gate4-owner-b", ownerB.id],
  ]);
  const fixtureIds: Record<string, string> = {};
  for (const fixture of fixtures) {
    const stored = await sqliteMemoryProvider.store({
      ownerId: ownerIds.get(fixture.openId)!,
      category: fixture.category,
      memoryType: fixture.memoryType,
      sensitivity: fixture.sensitivity,
      content: fixture.content,
      tags: [],
      source: { sourceRef: `synthetic:${fixture.key}` },
      createdBy: "owner",
    });
    fixtureIds[fixture.key] = stored.id;
  }

  // Apply the proposal's explicit synthetic dates and historical supersession only
  // inside this disposable database. No production or existing Ryze data is opened.
  await db.closeDb();
  const rawDb = new Database(databasePath);
  try {
    const updateMemory = rawDb.prepare(
      "UPDATE ryze_memory SET createdAt = ?, updatedAt = ?, status = ? WHERE id = ? AND userId = ?",
    );
    const updateSystemMemory = rawDb.prepare(
      "UPDATE ryze_system_memory SET createdAt = ?, updatedAt = ?, status = ? WHERE id = ? AND userId = ?",
    );
    for (const fixture of fixtures) {
      const timestamp = Date.parse(fixture.createdAt);
      const ownerId = ownerIds.get(fixture.openId)!;
      const update = fixture.category === "system" ? updateSystemMemory : updateMemory;
      const result = update.run(timestamp, timestamp, fixture.status, fixtureIds[fixture.key], ownerId);
      if (result.changes !== 1) {
        throw new Error(`Could not apply synthetic date/status to ${fixture.key}.`);
      }
    }
  } finally {
    rawDb.close();
  }

  const ownerAId = ownerIds.get("gate4-owner-a")!;
  const ownerBId = ownerIds.get("gate4-owner-b")!;
  const tests = [
    { id: "Q01", query: "How should I format the current weekly project reports?", expected: ["R2"] },
    { id: "Q02", query: "What was my earlier style for weekly project updates?", expected: ["R1"] },
    { id: "Q03", query: "What is my current preference for weekly project reports?", expected: ["R2"] },
    { id: "Q04", query: "What persistence decision was made for the Atlas project?", expected: ["R3"] },
    { id: "Q05", query: "Which project is the Telegram onboarding work, Atlas or Atlas 2?", expected: ["R4"] },
    { id: "Q06", query: "What happened in the restore exercise on 14 November?", expected: ["R5"] },
    { id: "Q07", query: "Which fields must the migration retain from legacy records?", expected: ["R6"] },
    { id: "Q08", query: "List my Personal Preference records about weekly report format.", expected: ["R1", "R2"], category: "personal" as const, memoryType: "preference" as const },
    { id: "Q09", query: "Show Project memories for Atlas 2.", expected: ["R4"], category: "experience" as const, memoryType: "project" as const },
    { id: "Q10", query: "What is the owner-only export rule?", expected: [], category: "system" as const, context: true },
    { id: "Q11", query: "Include restricted System Memory for this request: what must an ordinary portable export exclude?", expected: ["R7"], category: "system" as const, context: true, includeRestricted: true },
    { id: "Q12", query: "Which measurement units do I prefer?", expected: [] },
    { id: "Q13", query: "What music did I listen to while cooking?", expected: [] },
    { id: "Q14", query: "Show both the earlier and current weekly-report preferences in date order.", expected: ["R1", "R2"] },
  ];

  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  const cases = [];
  for (const test of tests) {
    let entries: Array<{ id: string }>;
    let excludedRestricted = 0;
    if (test.context) {
      const context = await governance.buildRetrievalContext({
        ownerId: ownerAId,
        query: test.query,
        category: "system",
        includeRestricted: test.includeRestricted ?? false,
        limit: 12,
      });
      entries = context.entries;
      excludedRestricted = context.excludedRestricted;
    } else {
      entries = await sqliteMemoryProvider.search({
        ownerId: ownerAId,
        query: test.query,
        category: test.category,
        memoryType: test.memoryType,
        limit: 12,
      });
    }
    const retrievedIds = entries.map(entry => Object.entries(fixtureIds).find(([, id]) => id === entry.id)?.[0] ?? "UNKNOWN");
    const tp = retrievedIds.filter(id => test.expected.includes(id)).length;
    const fp = retrievedIds.filter(id => !test.expected.includes(id)).length;
    const fn = test.expected.filter(id => !retrievedIds.includes(id)).length;
    truePositive += tp;
    falsePositive += fp;
    falseNegative += fn;
    cases.push({
      id: test.id,
      query: test.query,
      expected: test.expected,
      retrieved: retrievedIds,
      truePositive: tp,
      falsePositive: fp,
      falseNegative: fn,
      restrictedExcludedCount: excludedRestricted,
    });
  }

  const q14Expected = tests.find(test => test.id === "Q14")?.expected ?? [];
  const q14Retrieved = cases.find(result => result.id === "Q14")?.retrieved ?? [];
  const chronologicalOrder = {
    queryId: "Q14",
    expected: q14Expected,
    retrieved: q14Retrieved,
    passed: JSON.stringify(q14Retrieved) === JSON.stringify(q14Expected),
  };

  // Supplemental positive controls are not part of the 14-query score. They
  // verify access controls with matching lexical query terms after exact-query
  // cases have been recorded without modification.
  const matchingRestrictedQuery = "Synthetic owner-only export rule ordinary portable exports";
  const restrictedDefaultControl = await governance.buildRetrievalContext({
    ownerId: ownerAId,
    query: matchingRestrictedQuery,
    category: "system",
    includeRestricted: false,
    limit: 12,
  });
  const restrictedExplicitControl = await governance.buildRetrievalContext({
    ownerId: ownerAId,
    query: matchingRestrictedQuery,
    category: "system",
    includeRestricted: true,
    limit: 12,
  });
  const ownerBPositiveControl = await sqliteMemoryProvider.search({
    ownerId: ownerBId,
    query: "Use metric units in measurements",
    category: "personal",
    memoryType: "preference",
    limit: 12,
  });
  const ownerAMatchingIsolationControl = await sqliteMemoryProvider.search({
    ownerId: ownerAId,
    query: "Use metric units in measurements",
    category: "personal",
    memoryType: "preference",
    limit: 12,
  });
  const allOwnerAResults = cases.flatMap(result => result.retrieved);

  const predictionCount = truePositive + falsePositive;
  const precision = predictionCount ? truePositive / predictionCount : null;
  const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 1;
  const f1Precision = precision ?? 0;
  const f1 = f1Precision + recall ? (2 * f1Precision * recall) / (f1Precision + recall) : 0;
  const output = {
    evaluation: "Gate 4 approved synthetic SQLite retrieval query set",
    status: "post-remediation retest; synthetic-only; not a production-data benchmark",
    database: "fresh temporary SQLite database; removed after run",
    fixtureCount: fixtures.length,
    queryCount: tests.length,
    retrievalParameters: {
      defaultLimit: 12,
      Q08: "category=personal, memoryType=preference (explicit filter phrase in approved query)",
      Q09: "category=experience, memoryType=project (explicit filter phrase in approved query)",
      Q10_Q11: "category=system via bounded retrieval context; Q11 explicitly enables includeRestricted",
    },
    measures: {
      averaging: "micro across all expected/retrieved fixture IDs in the 14 fixed queries",
      truePositive,
      falsePositive,
      falseNegative,
      predictionCount,
      precision: precision === null ? null : Number(precision.toFixed(4)),
      precisionNote: precision === null ? "undefined: the evaluation returned no fixtures" : undefined,
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
    },
    fixedQueries: cases,
    chronologicalOrder,
    supplementalControls: {
      matchingRestrictedQuery,
      restrictedDefaultExcluded: restrictedDefaultControl.entries.length === 0 && restrictedDefaultControl.excludedRestricted === 1,
      restrictedExplicitIncluded: restrictedExplicitControl.entries.some(entry => entry.id === fixtureIds.R7 && entry.sensitivity === "restricted"),
      ownerBMatchingQuery: "Use metric units in measurements",
      ownerBCanRetrieveR8: ownerBPositiveControl.some(entry => entry.id === fixtureIds.R8),
      ownerAMatchingQuery: "Use metric units in measurements",
      ownerAMatchingQueryDoesNotRetrieveR8: ownerAMatchingIsolationControl.every(entry => entry.id !== fixtureIds.R8),
      fixedOwnerAQueriesDoNotRetrieveR8: !allOwnerAResults.includes("R8"),
    },
    historicalVersion: {
      R1Status: "superseded",
      R2Status: "active",
      explicitDatesApplied: true,
      note: "Current-preference searches remain active-only. Earlier-version intent retrieves superseded records, while inventory and both-version requests can return active and superseded entries; Q14 asserts chronological order.",
    },
    implementationLimitations: [
      "The SQLite fallback uses bounded, normalized lexical token-overlap scoring and deterministic ranking; it is not an embedding or general semantic-reasoning system.",
      "Superseded records are excluded from current/default searches and included only when history intent is detected or explicitly requested; archived records remain excluded unless explicitly requested.",
      "Q10/Q11 run verbatim through the bounded context path. Restricted inclusion remains a separate explicit trusted option; query wording alone does not grant authorization.",
      "Q08/Q09 use explicit category/type provider filters as recorded in the approved proposal. These filters remain authoritative and owner-scoped.",
      "This fixed synthetic set is not evidence of production-corpus representativeness; a perfect score here does not establish broad semantic retrieval quality.",
    ],
  };

  if (!chronologicalOrder.passed) process.exitCode = 1;
  console.log(JSON.stringify(output, null, 2));
  await db.closeDb();
} finally {
  if (dbModule) await dbModule.closeDb();
  process.env.RYZE_DATA_DIR = originalEnv.dataDir;
  process.env.RYZE_DATABASE_PATH = originalEnv.databasePath;
  process.env.RYZE_LOCAL_OWNER_OPEN_ID = originalEnv.ownerOpenId;
  process.env.RYZE_LOCAL_OWNER_NAME = originalEnv.ownerName;
  rmSync(dataRoot, { recursive: true, force: true });
}
