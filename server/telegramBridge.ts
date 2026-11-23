import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { promisify } from "node:util";
import { ENV } from "./_core/env";

const execFileAsync = promisify(execFile);

type BridgePhase = "not_configured" | "installing" | "ready" | "awaiting_code" | "awaiting_2fa" | "authorized" | "running" | "paused" | "stopped" | "error";

type BridgeStatus = {
  phase: BridgePhase;
  message: string;
  workerId: string;
  phoneMasked?: string;
  configured: boolean;
  processRunning: boolean;
  updatedAt: string;
};

type TelegramSetup = {
  apiId: string;
  apiHash: string;
  phone: string;
  workerId?: string;
};

const state: { process: ChildProcessWithoutNullStreams | null; status: BridgeStatus } = {
  process: null,
  status: {
    phase: "not_configured",
    message: "Telegram worker is not configured.",
    workerId: "primary",
    configured: false,
    processRunning: false,
    updatedAt: new Date().toISOString(),
  },
};

function workerRoot() {
  return path.join(process.env.LOCALAPPDATA || os.homedir(), "RyzeFramework", "telegram-worker");
}
function workerEnvPath() { return path.join(workerRoot(), "worker.env"); }
function workerPythonPath() { return path.join(workerRoot(), ".venv", process.platform === "win32" ? "Scripts\\python.exe" : "bin/python"); }
function workerEntryPath() { return path.resolve(process.cwd(), "worker", "ryze_telegram_worker.py"); }
function setStatus(phase: BridgePhase, message: string, extra: Partial<BridgeStatus> = {}) {
  state.status = { ...state.status, ...extra, phase, message, processRunning: Boolean(state.process && !state.process.killed), updatedAt: new Date().toISOString() };
}
function validateSetup(input: TelegramSetup) {
  for (const [name, value, max] of [["Telegram API ID", input.apiId, 32], ["Telegram API hash", input.apiHash, 128], ["Telegram phone number", input.phone, 64]] as const) {
    if (!value.trim() || value.length > max || /[\r\n]/.test(value)) throw new Error(`${name} is required and must be a single line.`);
  }
  if (!/^\d+$/.test(input.apiId.trim())) throw new Error("Telegram API ID must be numeric.");
  if (!/^\+?[0-9 ()-]{5,64}$/.test(input.phone.trim())) throw new Error("Telegram phone number format is invalid.");
}
async function protectWorkerRoot() {
  if (process.platform !== "win32") return;
  try {
    const { stdout } = await execFileAsync("whoami", [], { windowsHide: true });
    await execFileAsync("icacls.exe", [workerRoot(), "/inheritance:r", "/grant:r", `${stdout.trim()}:(OI)(CI)F`, "/T", "/C"], { windowsHide: true });
  } catch {
    throw new Error("Ryze could not protect the local Telegram worker folder.");
  }
}
async function repairWorkerAcls() {
  if (process.platform !== "win32") return;
  try {
    await execFileAsync("icacls.exe", [workerRoot(), "/reset"], { windowsHide: true });
  } catch {
    throw new Error("Ryze could not repair access to the local Telegram worker folder. Stop Ryze and run the operational baseline before retrying.");
  }
  try {
    await execFileAsync("icacls.exe", [workerEnvPath(), "/reset"], { windowsHide: true });
  } catch {
    // worker.env may not exist on a first setup; the write below creates it.
  }
}
async function ensurePythonEnvironment() {
  const pythonPath = workerPythonPath();
  try { await readFile(pythonPath); return pythonPath; } catch { /* create below */ }
  const python = process.platform === "win32" ? "py" : "python3";
  setStatus("installing", "Preparing the private Telegram worker environment.");
  await execFileAsync(python, ["-m", "venv", path.join(workerRoot(), ".venv")], { windowsHide: true, timeout: 120000 });
  await execFileAsync(pythonPath, ["-m", "pip", "install", "--disable-pip-version-check", "-r", path.resolve(process.cwd(), "worker", "requirements.txt")], { windowsHide: true, timeout: 300000 });
  return pythonPath;
}
async function writeWorkerEnvironment(input: TelegramSetup) {
  validateSetup(input);
  await mkdir(path.join(workerRoot(), "data"), { recursive: true });
  await repairWorkerAcls();
  const token = ENV.workerToken;
  if (!token) throw new Error("Ryze worker token is not available. Run the Ryze updater and restart Ryze.");
  const session = path.join(workerRoot(), "data", "ryze-user");
  const workerId = input.workerId?.trim() || "primary";
  const lines = [
    "RYZE_API_BASE_URL=http://127.0.0.1:3777",
    `RYZE_WORKER_TOKEN=${token}`,
    `RYZE_WORKER_ID=${workerId}`,
    `TELEGRAM_API_ID=${input.apiId.trim()}`,
    `TELEGRAM_API_HASH=${input.apiHash.trim()}`,
    `TELEGRAM_PHONE=${input.phone.trim()}`,
    `TELEGRAM_SESSION_PATH=${session}`,
    "RYZE_WORKER_VERSION=0.2.0-dashboard-bridge-inbound",
  ].join("\n") + "\n";
  await writeFile(workerEnvPath(), lines, { encoding: "utf8", mode: 0o600 });
  try { await chmod(workerEnvPath(), 0o600); } catch { /* Windows ACL is applied below. */ }
  await protectWorkerRoot();
  return { workerId, phoneMasked: `${input.phone.trim().slice(0, 3)}••••${input.phone.trim().slice(-2)}` };
}
async function readWorkerEnvironment() {
  const text = await readFile(workerEnvPath(), "utf8");
  const values = new Map(text.split(/\r?\n/).filter(line => line.includes("=")).map(line => {
    const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)];
  }));
  return values;
}
function attachProcess(child: ChildProcessWithoutNullStreams, mode: "login" | "run") {
  state.process = child;
  let output = "";
  child.stdout.on("data", chunk => {
    output = (output + String(chunk)).slice(-2000);
    if (mode === "login") {
      if (output.includes('"event": "code_required"') || output.includes('"event":"code_required"')) setStatus("awaiting_code", "Telegram sent a login code. Enter it in the dashboard.");
      else if (output.toLowerCase().includes("two-step password")) setStatus("awaiting_2fa", "Telegram requires the account's two-step password. Enter it in the dashboard.");
      else if (output.includes('"event": "connected"') || output.includes('"event":"connected"')) setStatus("authorized", "Telegram account login completed.");
    }
  });
  child.stderr.on("data", () => { /* Never expose worker stderr; it may contain provider details. */ });
  child.on("error", () => setStatus("error", "Telegram worker process could not be started."));
  child.on("close", code => {
    state.process = null;
    if (code === 0 && mode === "login") setStatus("authorized", "Telegram account login completed.");
    else if (mode === "run" && code === 0) setStatus("stopped", "Telegram worker stopped.");
    else if (state.status.phase !== "authorized") setStatus("error", "Telegram worker stopped before completing the requested operation.");
  });
}

export async function getTelegramBridgeStatus(): Promise<BridgeStatus> {
  try {
    const values = await readWorkerEnvironment();
    if (!state.status.configured) state.status.configured = Boolean(values.get("TELEGRAM_API_ID") && values.get("TELEGRAM_API_HASH"));
    state.status.processRunning = Boolean(state.process && !state.process.killed);
  } catch {
    state.status.configured = false;
  }
  return { ...state.status };
}

export async function configureTelegramBridge(input: TelegramSetup) {
  const result = await writeWorkerEnvironment(input);
  await ensurePythonEnvironment();
  setStatus("ready", "Telegram worker is configured. Start login from this dashboard.", { configured: true, workerId: result.workerId, phoneMasked: result.phoneMasked });
  return getTelegramBridgeStatus();
}
export async function startTelegramLogin() {
  if (state.process) throw new Error("A Telegram setup operation is already running.");
  const python = await ensurePythonEnvironment();
  const child = spawn(python, ["-u", workerEntryPath(), "login"], { cwd: process.cwd(), env: { ...process.env, ...(await Object.fromEntries((await readWorkerEnvironment()).entries())), PYTHONUNBUFFERED: "1", NO_PROXY: "127.0.0.1,localhost" }, stdio: "pipe", windowsHide: true });
  setStatus("awaiting_code", "Starting Telegram login. Waiting for Telegram's response.");
  attachProcess(child, "login");
  return getTelegramBridgeStatus();
}
export async function submitTelegramLoginInput(value: string, kind: "code" | "password") {
  if (!state.process || state.process.stdin.destroyed) throw new Error("No Telegram login prompt is active.");
  if (!value.trim() || value.length > 256 || /[\r\n]/.test(value)) throw new Error("The login value is invalid.");
  state.process.stdin.write(`${value.trim()}\n`);
  setStatus(kind === "code" ? "awaiting_2fa" : "authorized", kind === "code" ? "Login code submitted. Waiting for Telegram." : "Two-step password submitted. Waiting for Telegram.");
  return getTelegramBridgeStatus();
}
export async function startTelegramWorker() {
  if (state.process) throw new Error("The Telegram worker is already running.");
  const python = await ensurePythonEnvironment();
  const env = Object.fromEntries((await readWorkerEnvironment()).entries());
  const child = spawn(python, ["-u", workerEntryPath(), "run"], { cwd: process.cwd(), env: { ...process.env, ...env, PYTHONUNBUFFERED: "1", NO_PROXY: "127.0.0.1,localhost" }, stdio: "pipe", windowsHide: true });
  setStatus("running", "Telegram worker is running. Inbound messages are being monitored.", { configured: true });
  attachProcess(child, "run");
  return getTelegramBridgeStatus();
}
export async function stopTelegramWorker() {
  if (state.process) {
    state.process.kill();
    state.process = null;
  }
  setStatus("stopped", "Telegram worker is stopped.");
  return getTelegramBridgeStatus();
}
export async function removeTelegramBridgeSession() {
  await stopTelegramWorker();
  try {
    const values = await readWorkerEnvironment();
    const session = values.get("TELEGRAM_SESSION_PATH");
    if (session) {
      await rm(session, { force: true });
      await rm(`${session}-journal`, { force: true });
      await rm(`${session}.lock`, { force: true });
    }
  } catch {
    // A missing worker environment/session is already a disconnected state.
  }
  setStatus("not_configured", "Telegram account disconnected. Configure a new account to continue.", { configured: false, phoneMasked: undefined });
  return getTelegramBridgeStatus();
}
export async function markTelegramBridgePaused(paused: boolean) {
  setStatus(paused ? "paused" : "running", paused ? "Telegram worker is paused; no inbound messages will be forwarded." : "Telegram worker is running. Inbound messages are being monitored.");
  return getTelegramBridgeStatus();
}
export async function sendTelegramBridgeInput(value: string) {
  if (!state.process || state.status.phase !== "awaiting_2fa") throw new Error("The dashboard is not waiting for a two-step password.");
  return submitTelegramLoginInput(value, "password");
}
