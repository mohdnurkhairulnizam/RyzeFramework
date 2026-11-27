import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const installDir = process.cwd();
const envPath = path.join(installDir, ".env");
if (!existsSync(envPath)) {
  console.error("Ryze is not installed: the local .env file is missing.");
  process.exit(2);
}

function readEnv(name) {
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  if (!line) return "";
  const raw = line.slice(name.length + 1);
  if (raw.startsWith('"')) {
    try { return JSON.parse(raw); } catch { return raw.slice(1, -1); }
  }
  return raw;
}

if (!/^RYZE_OPENCODE_SERVER_PASSWORD=.+$/m.test(readFileSync(envPath, "utf8"))) {
  const separator = readFileSync(envPath, "utf8").endsWith("\n") ? "" : "\n";
  writeFileSync(envPath, `${readFileSync(envPath, "utf8")}${separator}RYZE_OPENCODE_SERVER_PASSWORD=${randomBytes(32).toString("hex")}\n`);
}

const dataRoot = path.resolve(process.env.LOCALAPPDATA || os.homedir(), "RyzeFramework");
const workspace = path.join(dataRoot, "opencode-workspace");
mkdirSync(workspace, { recursive: true });
const gatewayUrl = readEnv("RYZE_FREELLMAPI_BASE_URL").replace(/\/+$/, "");
const gatewayKey = readEnv("RYZE_FREELLMAPI_API_KEY");
const gatewayModel = readEnv("RYZE_FREELLMAPI_MODEL").trim();
const gatewayConfigured = Boolean(gatewayUrl && gatewayKey);
const denyAll = [{ action: "*", resource: "*", effect: "deny" }];
const selectedModel = gatewayConfigured
  ? { name: gatewayModel ? `FreeLLMAPI (${gatewayModel})` : "FreeLLMAPI (automatic model selection)", modelID: gatewayModel || "auto" }
  : null;
const config = {
  $schema: "https://opencode.ai/config.json",
  default_agent: "ryze-chat",
  permissions: denyAll,
  ...(selectedModel ? { model: "freellmapi/selected" } : {}),
  providers: gatewayConfigured ? {
    freellmapi: {
      name: "FreeLLMAPI",
      env: ["RYZE_FREELLMAPI_API_KEY"],
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: gatewayUrl },
      ...(selectedModel ? { models: { selected: selectedModel } } : {}),
    },
  } : {},
  agents: {
    "ryze-chat": {
      description: "Chat-only Ryze assistant; it cannot use tools or perform actions.",
      mode: "primary",
      ...(selectedModel ? { model: "freellmapi/selected" } : {}),
      system: "You are the conversational assistant inside the PROJECT RYZE dashboard. You can only answer in text. Do not claim to have sent messages, changed files, run software, or completed real-world actions. Explain when a request needs a separate human-approved workflow.",
      permissions: denyAll,
    },
  },
};
writeFileSync(path.join(workspace, "opencode.json"), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
console.log(gatewayConfigured
  ? `Managed OpenCode chat-only configuration is ready${gatewayModel ? "." : " with automatic model selection."}`
  : "Managed OpenCode chat-only configuration is ready; add the FreeLLMAPI URL and key to enable AI chat. The model ID is optional and may be left blank for automatic selection.");
