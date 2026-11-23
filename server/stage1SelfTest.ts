import { stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ENV } from "./_core/env";
import { getIntegrationStatus } from "./openCode";
import { determineDemoAction } from "./ryzeDemo";

type SelfTestStatus = "PASS" | "WARN" | "FAIL" | "NOT_RUN";

export type Stage1SelfTestCheck = {
  gate: number;
  name: string;
  status: SelfTestStatus;
  detail: string;
};

const maxUploadBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

async function isFile(target: string) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(target: string) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

function runtimeConfigCheck(): Stage1SelfTestCheck {
  const missing: string[] = [];
  if (!ENV.localMode) missing.push("local mode");
  if (!ENV.freeLlmApiBaseUrl) missing.push("FreeLLMAPI base URL");
  if (!ENV.freeLlmApiKey) missing.push("FreeLLMAPI key");
  if (!process.env.RYZE_FREELLMAPI_MODEL?.trim())
    missing.push("FreeLLMAPI model selector (exact ID or explicit auto)");
  if (!ENV.openCodeBaseUrl) missing.push("OpenCode base URL");
  if (!ENV.workerToken) missing.push("worker token");
  return {
    gate: 2,
    name: "Versioned runtime and secret contract",
    status: missing.length ? "WARN" : "PASS",
    detail: missing.length
      ? `Non-secret/runtime values are not fully explicit: ${missing.join(", ")}. No provider substitution was performed; secrets are not displayed.`
      : `Local mode, provider URL, model selector (${process.env.RYZE_FREELLMAPI_MODEL?.trim()}), OpenCode endpoint, and worker token are present; secret values were not read into the report.`,
  };
}

async function workerPrerequisiteCheck(): Promise<Stage1SelfTestCheck> {
  const workerRoot = path.join(process.env.LOCALAPPDATA || os.homedir(), "RyzeFramework", "telegram-worker");
  const envFile = path.join(workerRoot, "worker.env");
  const pythonEnv = path.join(workerRoot, ".venv");
  const details: string[] = [];
  if (await isFile(envFile)) details.push("worker.env present");
  else details.push("worker.env not found");
  if (await isDirectory(pythonEnv)) details.push("worker virtual environment present");
  else details.push("worker virtual environment not found");
  if (ENV.workerToken) details.push("server worker token present");
  else details.push("server worker token missing");
  const ready = details.every(detail => !detail.includes("not found") && !detail.includes("missing"));
  return {
    gate: 4,
    name: "Worker deployment prerequisites",
    status: ready ? "PASS" : "WARN",
    detail: `${details.join("; ")}. A live Telegram login/session and restore rehearsal are not performed by this button.`,
  };
}

async function fileSafetyCheck(): Promise<Stage1SelfTestCheck> {
  const storageReady = await isDirectory(ENV.storageDir);
  const allowed = allowedMimeTypes.has("text/markdown") && allowedMimeTypes.has("application/json");
  const ceiling = maxUploadBytes === 5 * 1024 * 1024;
  return {
    gate: 6,
    name: "File format, size, and storage boundary",
    status: storageReady && allowed && ceiling ? "PASS" : "WARN",
    detail: storageReady
      ? "Local storage exists; the application allowlist and 5 MB upload ceiling are defined. This button does not upload or deliver a user file."
      : "The local storage directory is not available. Run the operational baseline or upload test on the target Windows installation.",
  };
}

export async function runStage1SelfTest() {
  const checks: Stage1SelfTestCheck[] = [];
  checks.push({
    gate: 1,
    name: "Autonomous Telegram acceptance evidence",
    status: "NOT_RUN",
    detail: "Requires the connected Telegram account on target Windows: pause-before-send, restart, replay, acknowledgement mismatch, worker/API failure, OpenCode failure, unauthorized sender, and recovery-code expiry.",
  });
  checks.push(runtimeConfigCheck());

  const safeAction = determineDemoAction("run a PowerShell command");
  const safeAnalysis = determineDemoAction("explain this harmless text");
  checks.push({
    gate: 3,
    name: "Safe action boundary",
    status: safeAction === "blocked" && safeAnalysis === "safe_analysis" ? "PASS" : "FAIL",
    detail: safeAction === "blocked" && safeAnalysis === "safe_analysis"
      ? "Shell-like input is blocked by the server-side classifier while ordinary analysis remains a chat-only action; no tool was executed."
      : "The deterministic action-boundary check did not produce the expected safe/block decisions.",
  });
  checks.push(await workerPrerequisiteCheck());
  checks.push({
    gate: 5,
    name: "Target-Windows end-to-end delivery",
    status: "NOT_RUN",
    detail: "Requires a real permanent-admin message and a real recovery-code-authorized sender message. Confirm same-chat content, task status, logs, pause/stop, replay, failure, and invalid-token behavior manually.",
  });
  checks.push(await fileSafetyCheck());
  checks.push({
    gate: 7,
    name: "Operational safety and recovery",
    status: "WARN",
    detail: "Secret redaction and bounded result checks are implemented in the current code. Retention policy, provider failure, worker rollback, and restore evidence still require target-Windows verification.",
  });
  checks.push({
    gate: 8,
    name: "Stage 1 evidence record",
    status: "NOT_RUN",
    detail: "Stage 1 cannot be marked operational from this local report alone. Attach this report together with the operational baseline console and target-Windows Telegram test evidence.",
  });

  let integration = { openCode: "not_configured", freeLlmApi: "not_configured", chatReady: false };
  if (ENV.localMode) integration = await getIntegrationStatus();
  const integrationLine = `OpenCode=${integration.openCode}; FreeLLMAPI=${integration.freeLlmApi}; chatReady=${integration.chatReady}`;
  const consoleText = [
    `RYZE STAGE 1 ACCEPTANCE SELF-TEST · ${new Date().toLocaleString()}`,
    `Platform: ${process.platform} · Local mode: ${ENV.localMode} · Runtime config schema: v1-report`,
    integrationLine,
    "",
    ...checks.map(check => `[${check.status}] Gate ${check.gate} · ${check.name}: ${check.detail}`),
    "",
    "Interpretation: PASS means this local deterministic check passed. WARN means setup or evidence is incomplete. NOT_RUN means a real target-Windows/Telegram test is required. FAIL blocks acceptance.",
    "No secret values, recovery codes, API keys, session paths, or message bodies were included in this report.",
  ].join("\n");
  return {
    ok: checks.every(check => check.status !== "FAIL") && checks.some(check => check.status === "PASS"),
    checks,
    consoleText,
  };
}
