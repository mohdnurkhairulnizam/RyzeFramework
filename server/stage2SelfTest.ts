import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type CheckStatus = "PASS" | "FAIL" | "WARN" | "NOT_RUN";
export type Stage2SelfTestCheck = {
  name: string;
  status: CheckStatus;
  detail: string;
};

const focusedTestFiles = [
  "server/localStorage.sqlite.test.ts",
  "server/stage2SchemaCompatibility.test.ts",
  "server/restoreDatabaseValidation.test.ts",
  "server/memoryProvider.test.ts",
  "server/memoryGovernance.test.ts",
  "server/ryzeExport.test.ts",
  "server/db.scope.test.ts",
];
const maxCapturedCharacters = 24_000;
const testTimeoutMs = 120_000;

function safeChildEnvironment(tempRoot: string): NodeJS.ProcessEnv {
  const inheritedKeys = [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "ProgramFiles",
    "ProgramFiles(x86)",
    "ComSpec",
    "PATHEXT",
    "HOME",
  ];
  const env: NodeJS.ProcessEnv = {};
  for (const key of inheritedKeys) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  Object.assign(env, {
    CI: "1",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    NODE_ENV: "test",
    RYZE_DATA_DIR: tempRoot,
    RYZE_DATABASE_PATH: path.join(tempRoot, "data", "synthetic-stage2.sqlite"),
    RYZE_STORAGE_DIR: path.join(tempRoot, "files"),
    RYZE_LOCAL_OWNER_OPEN_ID: "stage2-synthetic-owner",
  });
  return env;
}

function redactOutput(value: string) {
  return value
    .replace(/(api[_ -]?key|password|token|secret)(\s*[=:]\s*)[^\s,;]+/gi, "$1$2[REDACTED]")
    .replace(/([A-Za-z]:\\Users\\)[^\\\s]+/g, "$1[REDACTED]")
    .replace(/\/home\/[^/\s]+/g, "/home/[REDACTED]");
}

function appendBounded(current: string, next: string) {
  if (current.length >= maxCapturedCharacters) return current;
  return `${current}${next}`.slice(0, maxCapturedCharacters);
}

async function runFocusedTests(projectRoot: string, tempRoot: string) {
  const vitestEntrypoint = path.join(projectRoot, "node_modules", "vitest", "vitest.mjs");
  try {
    await access(vitestEntrypoint);
  } catch {
    return {
      available: false,
      code: null as number | null,
      timedOut: false,
      output: "Vitest is not installed in this Ryze folder. Reinstall/update using the full installer package, then retry.",
    };
  }

  return new Promise<{
    available: boolean;
    code: number | null;
    timedOut: boolean;
    output: string;
  }>(resolve => {
    const args = [
      vitestEntrypoint,
      "run",
      "--reporter=verbose",
      "--maxWorkers=1",
      "--minWorkers=1",
      ...focusedTestFiles,
    ];
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      env: safeChildEnvironment(tempRoot),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    let timedOut = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, testTimeoutMs);

    const collect = (chunk: Buffer) => {
      output = appendBounded(output, chunk.toString("utf8"));
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        available: false,
        code: null,
        timedOut,
        output: `${output}\nCould not start the local test runner: ${error.message}`,
      });
    });
    child.once("close", code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ available: true, code, timedOut, output });
    });
  });
}

export async function runStage2SelfTest() {
  const checks: Stage2SelfTestCheck[] = [];
  let tempRoot = "";
  let testResult: Awaited<ReturnType<typeof runFocusedTests>> | null = null;
  try {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "ryze-stage2-self-test-"));
    testResult = await runFocusedTests(process.cwd(), tempRoot);
    checks.push({
      name: "Synthetic SQLite, governance, retrieval boundaries, and portable export tests",
      status: !testResult.available ? "WARN" : testResult.timedOut || testResult.code !== 0 ? "FAIL" : "PASS",
      detail: !testResult.available
        ? "The focused test runner could not be started. No user database or files were opened."
        : testResult.timedOut
          ? `The focused synthetic test suite exceeded ${testTimeoutMs / 1000} seconds and was stopped.`
          : testResult.code === 0
            ? `The focused Vitest suite passed on ${process.platform} (${os.release()}) with Node ${process.version}. It uses temporary synthetic SQLite/storage fixtures only.`
            : `The focused Vitest suite exited with code ${String(testResult.code)}. Review the captured test output below.`
    });
  } catch (error) {
    checks.push({
      name: "Synthetic SQLite, governance, retrieval boundaries, and portable export tests",
      status: "FAIL",
      detail: error instanceof Error ? error.message : "The focused test suite could not be completed.",
    });
  } finally {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }

  checks.push({
    name: "Target-Windows install, restart, ACL, integrity-checked restore, and rollback acceptance",
    status: "NOT_RUN",
    detail: "This button never stops or modifies the live Ryze installation and does not create/restore a real backup. Complete the disposable-Windows procedure in docs/stage2-one-click-test.md.",
  });
  checks.push({
    name: "Representative owner-approved retrieval relevance evaluation",
    status: "NOT_RUN",
    detail: "The focused tests are synthetic regression checks, not a representative relevance study. Approve and run the documented query set before formal Gate 4 acceptance.",
  });

  const runnerOutput = testResult?.output ? redactOutput(testResult.output) : "(No test-runner output.)";
  const truncated = Boolean(testResult?.output && testResult.output.length >= maxCapturedCharacters);
  const consoleText = [
    `RYZE STAGE 2 ACCEPTANCE PREFLIGHT · ${new Date().toISOString()}`,
    `Platform: ${process.platform} ${os.release()} · Node: ${process.version}`,
    "Data scope: synthetic fixtures and temporary directories only; no live Ryze database, files, credentials, Telegram session, or provider was used.",
    "",
    ...checks.map(check => `[${check.status}] ${check.name}: ${check.detail}`),
    "",
    "FOCUSED TEST OUTPUT",
    runnerOutput,
    truncated ? "\n[Output truncated at the safety limit.]" : "",
    "",
    "Interpretation: PASS applies only to the focused synthetic tests. NOT_RUN requires the separate Windows/owner-reviewed steps. This report is evidence for review, not Stage 2 acceptance sign-off.",
    "The test runner receives a reduced environment without Ryze API keys, passwords, worker tokens, or session secrets. No private backup is created or uploaded.",
  ].filter(Boolean).join("\n");

  return {
    ok: checks.every(check => check.status === "PASS" || check.status === "NOT_RUN"),
    checks,
    consoleText,
  };
}
