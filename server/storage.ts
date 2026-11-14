import { randomUUID } from "node:crypto";
import { mkdir, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

function normalizedKey(relKey: string): string {
  const key = relKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!key || key.includes("\0") || key.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid local storage key");
  }
  if (/^[a-zA-Z]:/.test(key) || key.startsWith("//")) throw new Error("Invalid local storage key");
  return key;
}

function withUniqueSuffix(key: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 12);
  const ext = path.posix.extname(key);
  const base = ext ? key.slice(0, -ext.length) : key;
  return `${base}_${hash}${ext}`;
}

function resolveKey(key: string): string {
  const normalized = normalizedKey(key);
  const root = path.resolve(ENV.storageDir);
  const target = path.resolve(root, ...normalized.split("/"));
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid local storage key");
  }
  return target;
}

async function ensureWithinStorageRoot(target: string): Promise<void> {
  const root = await realpath(ENV.storageDir);
  const parent = await realpath(path.dirname(target));
  const relative = path.relative(root, parent);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Storage path escaped configured root");
  }
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = withUniqueSuffix(normalizedKey(relKey));
  const target = resolveKey(key);
  const parent = path.dirname(target);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  await ensureWithinStorageRoot(target);
  const temp = `${target}.${randomUUID()}.tmp`;
  const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
  await writeFile(temp, bytes, { flag: "wx", mode: 0o600 });
  await rename(temp, target);
  // A downloadable URL is assigned only after metadata is stored under a file ID.
  return { key, url: "" };
}

export async function getStoredFilePath(key: string): Promise<string> {
  const target = resolveKey(key);
  const root = await realpath(ENV.storageDir);
  const file = await realpath(target);
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Storage path escaped configured root");
  }
  return file;
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizedKey(relKey);
  return { key, url: "" };
}

export async function storageGetSignedUrl(_relKey: string): Promise<string> {
  throw new Error("Signed cloud URLs are unavailable in local storage mode");
}
