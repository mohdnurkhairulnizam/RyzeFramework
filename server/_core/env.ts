import os from "node:os";
import path from "node:path";

const localDataDir = path.resolve(
  process.env.RYZE_DATA_DIR ||
    path.join(process.env.LOCALAPPDATA || os.homedir(), "RyzeFramework"),
);
const localMode = process.env.RYZE_LOCAL_MODE === "true";

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
  databaseUrl: localMode ? "" : process.env.DATABASE_URL ?? "",
  oAuthServerUrl: localMode ? "" : process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? process.env.RYZE_LOCAL_OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: localMode ? "" : process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: localMode ? "" : process.env.BUILT_IN_FORGE_API_KEY ?? "",
  workerToken: localMode ? "" : process.env.RYZE_WORKER_TOKEN ?? "",
  workerOwnerOpenId: process.env.RYZE_WORKER_OWNER_OPEN_ID ?? process.env.OWNER_OPEN_ID ?? process.env.RYZE_LOCAL_OWNER_OPEN_ID ?? "",
};
