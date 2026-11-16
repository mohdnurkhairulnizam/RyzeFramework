import os from "node:os";
import path from "node:path";

const localDataDir = path.resolve(
  process.env.RYZE_DATA_DIR ||
    path.join(process.env.LOCALAPPDATA || os.homedir(), "RyzeFramework"),
);
const localMode = process.env.RYZE_LOCAL_MODE === "true";

function getFreeLlmApiBaseUrl() {
  if (!localMode) return "";
  const raw = process.env.RYZE_FREELLMAPI_BASE_URL?.trim();
  if (!raw) return "";
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new Error("RYZE_FREELLMAPI_BASE_URL must be a valid HTTPS URL (or an HTTP loopback URL). Configure it with Configure-FreeLLMAPI.cmd."); }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname.toLowerCase());
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) {
    throw new Error("FreeLLMAPI must use HTTPS unless it is on this laptop's loopback address; URL credentials, query strings, and fragments are not allowed.");
  }
  return url.toString().replace(/\/+$/, "");
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "ryze-local",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databasePath: path.resolve(process.env.RYZE_DATABASE_PATH || path.join(localDataDir, "data", "ryze.sqlite")),
  storageDir: path.resolve(process.env.RYZE_STORAGE_DIR || path.join(localDataDir, "files")),
  localDataDir,
  localMode,
  localOwnerOpenId: process.env.RYZE_LOCAL_OWNER_OPEN_ID ?? "ryze-local-owner",
  localOwnerName: process.env.RYZE_LOCAL_OWNER_NAME ?? "Local Owner",
  localOwnerPasswordSalt: process.env.RYZE_LOCAL_PASSWORD_SALT ?? "",
  localOwnerPasswordHash: process.env.RYZE_LOCAL_PASSWORD_HASH ?? "",
  freeLlmApiBaseUrl: getFreeLlmApiBaseUrl(),
  freeLlmApiKey: localMode ? process.env.RYZE_FREELLMAPI_API_KEY ?? "" : "",
  freeLlmApiModel: localMode ? process.env.RYZE_FREELLMAPI_MODEL ?? "auto" : "",
  openCodeBaseUrl: localMode ? process.env.RYZE_OPENCODE_BASE_URL ?? "http://127.0.0.1:4096" : "",
  openCodeServerUsername: localMode ? process.env.RYZE_OPENCODE_SERVER_USERNAME ?? "opencode" : "",
  openCodeServerPassword: localMode ? process.env.RYZE_OPENCODE_SERVER_PASSWORD ?? "" : "",
  databaseUrl: localMode ? "" : process.env.DATABASE_URL ?? "",
  oAuthServerUrl: localMode ? "" : process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? process.env.RYZE_LOCAL_OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: localMode ? "" : process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: localMode ? "" : process.env.BUILT_IN_FORGE_API_KEY ?? "",
  workerToken: localMode ? "" : process.env.RYZE_WORKER_TOKEN ?? "",
  workerOwnerOpenId: process.env.RYZE_WORKER_OWNER_OPEN_ID ?? process.env.OWNER_OPEN_ID ?? process.env.RYZE_LOCAL_OWNER_OPEN_ID ?? "",
};
