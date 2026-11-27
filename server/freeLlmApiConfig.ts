import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

export type FreeLlmApiInput = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

function validateInput(input: FreeLlmApiInput) {
  const apiKey = input.apiKey.trim();
  const model = input.model.trim();
  const baseUrl = input.baseUrl.trim();
  if (apiKey.length < 8 || apiKey.length > 512 || !/^[A-Za-z0-9._~+/=-]+$/.test(apiKey)) {
    throw new Error("The FreeLLMAPI key format was not accepted.");
  }
  if (model.length > 256 || (model.length > 0 && !/^[A-Za-z0-9._:/-]+$/.test(model))) {
    throw new Error("The model identifier is invalid. Leave it empty to let FreeLLMAPI choose automatically.");
  }
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Enter a complete FreeLLMAPI API base URL, including https:// and the API path.");
  }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname.toLowerCase());
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback))) {
    throw new Error("Use HTTPS for a hosted gateway. HTTP is allowed only for a loopback gateway; URL credentials, queries, and fragments are not allowed.");
  }
  return { apiKey, model, baseUrl: parsed.toString().replace(/\/+$/, "") };
}

function replaceEnvValue(contents: string, name: string, value: string) {
  const entry = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  return pattern.test(contents)
    ? contents.replace(pattern, entry)
    : `${contents}${contents.endsWith("\n") ? "" : "\n"}${entry}\n`;
}

function writeManagedOpenCodeConfig(model: string, baseUrl: string) {
  const workspace = path.join(ENV.localDataDir, "opencode-workspace");
  mkdirSync(workspace, { recursive: true });
  const denyAll = [{ action: "*", resource: "*", effect: "deny" }];
  const config = {
    $schema: "https://opencode.ai/config.json",
    default_agent: "ryze-chat",
    permissions: denyAll,
    ...(model ? { model: "freellmapi/selected" } : {}),
    providers: {
      freellmapi: {
        name: "FreeLLMAPI",
        env: ["RYZE_FREELLMAPI_API_KEY"],
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: baseUrl },
        ...(model ? { models: { selected: { name: `FreeLLMAPI (${model})`, modelID: model } } } : {}),
      },
    },
    agents: {
      "ryze-chat": {
        description: "Chat-only Ryze assistant; it cannot use tools or perform actions.",
        mode: "primary",
        ...(model ? { model: "freellmapi/selected" } : {}),
        system: "You are the conversational assistant inside the PROJECT RYZE dashboard. You can only answer in text. Do not claim to have sent messages, changed files, run software, or completed real-world actions. Explain when a request needs a separate human-approved workflow.",
        permissions: denyAll,
      },
    },
  };
  writeFileSync(path.join(workspace, "opencode.json"), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

export function configureFreeLlmApi(input: FreeLlmApiInput) {
  if (!ENV.localMode) throw new Error("FreeLLMAPI configuration is available only in the local Windows build.");
  const values = validateInput(input);
  const envPath = path.resolve(process.cwd(), ".env");
  let contents: string;
  try {
    contents = readFileSync(envPath, "utf8");
    contents = replaceEnvValue(contents, "RYZE_FREELLMAPI_BASE_URL", JSON.stringify(values.baseUrl));
    contents = replaceEnvValue(contents, "RYZE_FREELLMAPI_API_KEY", values.apiKey);
    contents = replaceEnvValue(contents, "RYZE_FREELLMAPI_MODEL", JSON.stringify(values.model));
    writeFileSync(envPath, contents, { mode: 0o600 });
  } catch {
    throw new Error("The protected local configuration could not be updated. Stop Ryze and check the installation ACLs.");
  }

  process.env.RYZE_FREELLMAPI_BASE_URL = values.baseUrl;
  process.env.RYZE_FREELLMAPI_API_KEY = values.apiKey;
  process.env.RYZE_FREELLMAPI_MODEL = values.model;
  ENV.freeLlmApiBaseUrl = values.baseUrl;
  ENV.freeLlmApiKey = values.apiKey;
  ENV.freeLlmApiModel = values.model;
  writeManagedOpenCodeConfig(values.model, values.baseUrl);
  return {
    configured: true,
    restartRequired: true,
    message: `FreeLLMAPI settings saved${values.model ? ` with model ${values.model}` : " with automatic model selection"}. The API key was not returned. Restart Ryze to reload OpenCode with the new configuration.`,
  };
}
