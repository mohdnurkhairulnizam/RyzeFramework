import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ENV } from "./_core/env";
import {
  addTaskLog,
  createTask,
  ensureSession,
  saveFileMetadata,
  updateTask,
} from "./db";
import { storagePut } from "./storage";

const execFileAsync = promisify(execFile);

type CheckStatus = "PASS" | "WARN" | "FAIL";
export type BaselineCheck = {
  name: string;
  status: CheckStatus;
  detail: string;
};

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 17);
}

function homeDocuments() {
  return path.join(process.env.USERPROFILE || os.homedir(), "Documents");
}

async function copyIfPresent(source: string, destination: string) {
  if (await exists(source)) {
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, force: true });
    return true;
  }
  return false;
}

async function exists(target: string) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function sizeOf(target: string): Promise<number> {
  const info = await stat(target);
  if (info.isFile()) return info.size;
  const entries = await readdir(target, { withFileTypes: true });
  let total = 0;
  for (const entry of entries)
    total += await sizeOf(path.join(target, entry.name));
  return total;
}

async function aclReport(targets: string[]) {
  if (process.platform !== "win32")
    return "ACL check skipped: this workflow is intended for Windows; filesystem paths were still verified.";
  const lines: string[] = [];
  for (const target of targets) {
    if (!(await exists(target))) {
      lines.push(`[WARN] Missing path: ${target}`);
      continue;
    }
    try {
      const result = await execFileAsync("icacls.exe", [target], {
        windowsHide: true,
        maxBuffer: 64 * 1024,
      });
      lines.push(`[ACL] ${target}\n${result.stdout.trim()}`);
    } catch (error) {
      const detail =
        error && typeof error === "object" && "stdout" in error
          ? String(error.stdout)
          : String(error);
      lines.push(`[FAIL] icacls failed for ${target}\n${detail.trim()}`);
    }
  }
  return lines.join("\n");
}

async function protectBackupDirectory(target: string) {
  if (process.platform !== "win32") return;
  const identity =
    (process.env.USERDOMAIN ? `${process.env.USERDOMAIN}\\` : "") +
    (process.env.USERNAME || "");
  if (!identity)
    throw new Error(
      "Windows account identity was not available to protect the backup."
    );
  await execFileAsync(
    "icacls.exe",
    [target, "/inheritance:r", "/grant:r", `${identity}:(OI)(CI)F`, "/T", "/C"],
    { windowsHide: true, maxBuffer: 64 * 1024 }
  );
}

export async function createPrivateBackup() {
  if (!ENV.localMode)
    throw new Error("Private backup is available only in the local Windows build.");
  const runStamp = stamp();
  const databaseFile = ENV.databasePath;
  const filesDirectory = ENV.storageDir;
  const installDirectory = process.cwd();
  const envFile = path.join(installDirectory, ".env");
  const backupRoot = path.join(homeDocuments(), "RyzeFramework-backups");
  const backupDirectory = path.join(backupRoot, `Ryze-backup-${runStamp}`);
  await mkdir(backupRoot, { recursive: true });
  await mkdir(path.join(backupDirectory, "data"), { recursive: true });
  await mkdir(path.join(backupDirectory, "config"), { recursive: true });
  await protectBackupDirectory(backupRoot);
  await protectBackupDirectory(backupDirectory);
  const databaseCopied = await copyIfPresent(databaseFile, path.join(backupDirectory, "data", "ryze.sqlite"));
  await copyIfPresent(`${databaseFile}-wal`, path.join(backupDirectory, "data", "ryze.sqlite-wal"));
  await copyIfPresent(`${databaseFile}-shm`, path.join(backupDirectory, "data", "ryze.sqlite-shm"));
  const filesCopied = await copyIfPresent(filesDirectory, path.join(backupDirectory, "data", "files"));
  const configCopied = await copyIfPresent(envFile, path.join(backupDirectory, "config", "app.env"));
  if (!databaseCopied || !configCopied)
    throw new Error("The local database or .env configuration is missing; no usable backup was created.");
  const manifest = {
    format: "ryze-private-backup-v1",
    createdAt: new Date().toISOString(),
    warning: "Private backup: may contain the owner password hash, signing secret, gateway key, and personal data.",
    entries: {
      databaseBytes: await sizeOf(path.join(backupDirectory, "data", "ryze.sqlite")),
      filesBytes: filesCopied ? await sizeOf(path.join(backupDirectory, "data", "files")) : 0,
      configIncluded: configCopied,
    },
  };
  await writeFile(path.join(backupDirectory, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { backupDirectory, manifest };
}

export async function runOperationalBaseline(userId: number) {
  if (!ENV.localMode)
    throw new Error(
      "The operational baseline is available only in the local Windows build."
    );

  const checks: BaselineCheck[] = [];
  const runStamp = stamp();
  const dataRoot = ENV.localDataDir;
  const databaseFile = ENV.databasePath;
  const filesDirectory = ENV.storageDir;
  const logsDirectory = path.join(dataRoot, "logs");
  const installDirectory = process.cwd();
  const envFile = path.join(installDirectory, ".env");
  const backupRoot = path.join(homeDocuments(), "RyzeFramework-backups");
  const backupDirectory = path.join(backupRoot, `Ryze-baseline-${runStamp}`);
  const restoreCheckDirectory = path.join(
    os.tmpdir(),
    `Ryze-restore-check-${runStamp}`
  );

  try {
    await mkdir(backupRoot, { recursive: true });
    await mkdir(path.join(backupDirectory, "data"), { recursive: true });
    await mkdir(path.join(backupDirectory, "config"), { recursive: true });
    await protectBackupDirectory(backupRoot);
    await protectBackupDirectory(backupDirectory);

    const databaseCopied = await copyIfPresent(
      databaseFile,
      path.join(backupDirectory, "data", "ryze.sqlite")
    );
    await copyIfPresent(
      `${databaseFile}-wal`,
      path.join(backupDirectory, "data", "ryze.sqlite-wal")
    );
    await copyIfPresent(
      `${databaseFile}-shm`,
      path.join(backupDirectory, "data", "ryze.sqlite-shm")
    );
    const filesCopied = await copyIfPresent(
      filesDirectory,
      path.join(backupDirectory, "data", "files")
    );
    const configCopied = await copyIfPresent(
      envFile,
      path.join(backupDirectory, "config", "app.env")
    );

    if (!databaseCopied || !configCopied) {
      checks.push({
        name: "Private backup",
        status: "FAIL",
        detail:
          "The database or local configuration was missing, so no usable backup was created.",
      });
      throw new Error("The local database or .env configuration is missing.");
    }
    const manifest = {
      format: "ryze-operational-baseline-v1",
      createdAt: new Date().toISOString(),
      warning:
        "Private backup: may contain the owner password hash, signing secret, gateway key, and personal data.",
      entries: {
        databaseBytes: await sizeOf(
          path.join(backupDirectory, "data", "ryze.sqlite")
        ),
        filesBytes: filesCopied
          ? await sizeOf(path.join(backupDirectory, "data", "files"))
          : 0,
        configIncluded: configCopied,
      },
    };
    await writeFile(
      path.join(backupDirectory, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      { mode: 0o600 }
    );
    checks.push({
      name: "Private backup",
      status: "PASS",
      detail: `Created protected backup folder: ${backupDirectory}`,
    });

    await cp(backupDirectory, restoreCheckDirectory, {
      recursive: true,
      force: true,
    });
    const restoredDatabase = path.join(
      restoreCheckDirectory,
      "data",
      "ryze.sqlite"
    );
    const restoredConfig = path.join(
      restoreCheckDirectory,
      "config",
      "app.env"
    );
    if (!(await exists(restoredDatabase)) || !(await exists(restoredConfig)))
      throw new Error(
        "Restore rehearsal could not find the database and configuration in the temporary copy."
      );
    checks.push({
      name: "Restore rehearsal",
      status: "PASS",
      detail:
        "Backup copied into a temporary restore-check folder. Live data was not replaced.",
    });

    const session = await ensureSession(userId);
    const task = await createTask(
      userId,
      session.id,
      `Operational baseline check ${runStamp}`,
      "operational_baseline"
    );
    await addTaskLog(
      userId,
      task.id,
      "system",
      "info",
      "Baseline check started from the local dashboard button."
    );
    await addTaskLog(
      userId,
      task.id,
      "system",
      "success",
      "Backup and non-destructive restore rehearsal completed."
    );
    await updateTask(userId, task.id, {
      status: "COMPLETED",
      summary: "Operational baseline test record created.",
      completedSteps: 1,
      completedAt: new Date(),
    });
    checks.push({
      name: "Database and log record",
      status: "PASS",
      detail: `Created task ${task.id} with persisted activity logs.`,
    });

    const testContent = `# Ryze operational baseline test\n\nCreated: ${new Date().toISOString()}\nThis file can be deleted after verification.\n`;
    const testName = `ryze-baseline-test-${runStamp}.md`;
    const stored = await storagePut(
      `ryze/${userId}/baseline/${testName}`,
      Buffer.from(testContent, "utf8"),
      "text/markdown"
    );
    const testFile = await saveFileMetadata(userId, {
      taskId: task.id,
      storageKey: stored.key,
      originalName: testName,
      mimeType: "text/markdown",
      byteSize: Buffer.byteLength(testContent),
      category: "baseline-test",
      source: "generated",
    });
    checks.push({
      name: "Uploaded-file record",
      status: "PASS",
      detail: `Created ${testFile.originalName} and stored its bytes under the local files directory.`,
    });

    const pathsForAcl = [
      dataRoot,
      path.dirname(databaseFile),
      databaseFile,
      `${databaseFile}-wal`,
      `${databaseFile}-shm`,
      logsDirectory,
      filesDirectory,
      path.join(filesDirectory, stored.key),
    ];
    const aclText = await aclReport(pathsForAcl);
    const aclSkipped = process.platform !== "win32";
    checks.push({
      name: "Windows ACL inheritance",
      status: aclSkipped
        ? "WARN"
        : aclText.includes("[FAIL]")
          ? "FAIL"
          : "PASS",
      detail: aclSkipped
        ? "This sandbox is not Windows; run the same button on the target Windows computer for the real icacls result."
        : "icacls completed for the live data, database, logs, and test-file paths.",
    });

    const checkText = checks
      .map(check => `[${check.status}] ${check.name}: ${check.detail}`)
      .join("\n");
    const consoleText = [
      `RYZE OPERATIONAL BASELINE · ${new Date().toLocaleString()}`,
      `Platform: ${process.platform} · Local mode: ${ENV.localMode}`,
      `Backup: ${backupDirectory}`,
      `Restore rehearsal: temporary copy only; live data was not replaced`,
      "",
      checkText,
      "",
      "ACL / FILESYSTEM DETAILS",
      aclText,
      "",
      "Copy this entire console to support if a check fails.",
    ].join("\n");
    return {
      ok: checks.every(check => check.status !== "FAIL"),
      checks,
      consoleText,
      backupPath: backupDirectory,
      testFile: testName,
    };
  } finally {
    await rm(restoreCheckDirectory, { recursive: true, force: true }).catch(
      () => undefined
    );
  }
}
