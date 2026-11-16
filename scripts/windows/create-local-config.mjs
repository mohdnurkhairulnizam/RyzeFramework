import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const encodedPassword = input.replace(/\r?\n$/, "");
const passwordBytes = Buffer.from(encodedPassword, "base64");
const password = passwordBytes.toString("utf8");
if (passwordBytes.toString("base64") !== encodedPassword) {
  console.error("Could not read the owner password from the secure installer prompt.");
  process.exit(2);
}
if (password.length < 16 || password.length > 1024 || /[\r\n]/.test(password)) {
  console.error("Owner password must contain 16–1024 characters and no newline.");
  process.exit(2);
}

const appDir = process.cwd();
const envPath = path.join(appDir, ".env");
if (existsSync(envPath)) {
  console.error("A .env file already exists. Refusing to replace local configuration.");
  process.exit(3);
}
const localDataDir = path.resolve(
  process.env.LOCALAPPDATA || os.homedir(),
  "RyzeFramework",
);
const databasePath = path.join(localDataDir, "data", "ryze.sqlite");
const storageDir = path.join(localDataDir, "files");
mkdirSync(path.dirname(databasePath), { recursive: true });
mkdirSync(storageDir, { recursive: true });
const salt = randomBytes(32);
const passwordHash = scryptSync(password, salt, 64);
const jwtSecret = randomBytes(48).toString("hex");
const dotenvValue = (value) => `"${value.replace(/\\/g, "/").replace(/"/g, "\\\"")}"`;
const contents = [
  "NODE_ENV=production",
  "RYZE_LOCAL_MODE=true",
  "PORT=3777",
  `JWT_SECRET=${jwtSecret}`,
  "RYZE_LOCAL_OWNER_OPEN_ID=ryze-local-owner",
  "RYZE_LOCAL_OWNER_NAME=Local Owner",
  `RYZE_LOCAL_PASSWORD_SALT=${salt.toString("hex")}`,
  `RYZE_LOCAL_PASSWORD_HASH=${passwordHash.toString("hex")}`,
  `RYZE_DATA_DIR=${dotenvValue(localDataDir)}`,
  `RYZE_DATABASE_PATH=${dotenvValue(databasePath)}`,
  `RYZE_STORAGE_DIR=${dotenvValue(storageDir)}`,
  "RYZE_FREELLMAPI_BASE_URL=",
  "RYZE_FREELLMAPI_API_KEY=",
  "RYZE_FREELLMAPI_MODEL=auto",
  "",
].join("\n");
writeFileSync(envPath, contents, { flag: "wx", mode: 0o600 });
console.log("Local configuration created. The owner password was hashed and is not stored in plain text.");
