import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const encoded = input.replace(/\r?\n$/, "");
const inputBytes = Buffer.from(encoded, "base64");
let values;
try {
  if (inputBytes.toString("base64") !== encoded) throw new Error("Invalid input encoding.");
  values = JSON.parse(inputBytes.toString("utf8"));
} catch {
  console.error("The local gateway settings could not be read.");
  process.exit(2);
}

const apiKey = values?.apiKey;
const model = values?.model;
const baseUrl = values?.baseUrl;
if (typeof apiKey !== "string" || apiKey.length < 8 || apiKey.length > 512 || !/^[A-Za-z0-9._~+/=-]+$/.test(apiKey)) {
  console.error("The FreeLLMAPI key format was not accepted. Use the unified key from your provider's Keys page.");
  process.exit(2);
}
if (typeof model !== "string" || model.length > 256 || (model.length > 0 && !/^[A-Za-z0-9._:/-]+$/.test(model))) {
  console.error("The model identifier is invalid. Leave it empty to let FreeLLMAPI choose automatically.");
  process.exit(2);
}
let parsedUrl;
try { parsedUrl = new URL(baseUrl); }
catch {
  console.error("Enter a complete FreeLLMAPI API base URL, including https:// and the API path (commonly /v1).");
  process.exit(2);
}
const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(parsedUrl.hostname.toLowerCase());
if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash || (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && loopback))) {
  console.error("Use HTTPS for a hosted gateway. HTTP is allowed only for a gateway on this computer's loopback address; URL credentials, queries, and fragments are not allowed.");
  process.exit(2);
}
const normalizedUrl = parsedUrl.toString().replace(/\/+$/, "");

const envPath = path.join(process.cwd(), ".env");
let contents = readFileSync(envPath, "utf8");
const replacements = {
  RYZE_FREELLMAPI_BASE_URL: JSON.stringify(normalizedUrl),
  RYZE_FREELLMAPI_API_KEY: apiKey,
  RYZE_FREELLMAPI_MODEL: JSON.stringify(model),
};
for (const [name, value] of Object.entries(replacements)) {
  const entry = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(contents)) contents = contents.replace(pattern, entry);
  else contents += `${contents.endsWith("\n") ? "" : "\n"}${entry}\n`;
}
writeFileSync(envPath, contents);
inputBytes.fill(0);
console.log(`FreeLLMAPI URL, ${model ? "model ID, " : "automatic model selection, "}and key saved in the protected local configuration. The key value was not displayed.`);
