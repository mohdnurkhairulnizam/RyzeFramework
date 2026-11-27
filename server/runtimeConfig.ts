import { z } from "zod";

export const RUNTIME_CONFIG_SCHEMA_VERSION = "v1" as const;

const runtimeConfigShape = z.object({
  schemaVersion: z.literal(RUNTIME_CONFIG_SCHEMA_VERSION),
  localMode: z.boolean(),
  providerBaseUrl: z.string(),
  providerApiKey: z.string(),
  providerModel: z.string(),
  openCodeBaseUrl: z.string(),
  workerToken: z.string(),
  workerOwnerOpenId: z.string(),
  hostedDatabaseUrl: z.string(),
  hostedOAuthUrl: z.string(),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigShape>;

export function validateRuntimeConfiguration(input: unknown) {
  const issues: string[] = [];
  const parsed = runtimeConfigShape.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) issues.push(`${issue.path.join(".") || "configuration"}: ${issue.message}`);
    return issues;
  }
  const config = parsed.data;
  if (config.localMode) {
    if (config.hostedDatabaseUrl) issues.push("local mode cannot define DATABASE_URL");
    if (config.hostedOAuthUrl) issues.push("local mode cannot define OAUTH_SERVER_URL");
    if (!config.openCodeBaseUrl) issues.push("local mode requires an OpenCode endpoint");
    if (config.providerApiKey && !config.providerBaseUrl) issues.push("FreeLLMAPI key is set without a provider URL");
    if (config.providerBaseUrl && !config.providerApiKey) issues.push("FreeLLMAPI URL is set without an API key");
    if (config.workerToken && !config.workerOwnerOpenId) issues.push("worker token requires a worker owner identity");
  } else {
    if (config.providerBaseUrl || config.providerApiKey || config.providerModel || config.openCodeBaseUrl || config.workerToken) {
      issues.push("hosted mode cannot inherit local provider, OpenCode, or worker configuration");
    }
  }
  return issues;
}

export function assertRuntimeConfiguration(input: unknown) {
  const issues = validateRuntimeConfiguration(input);
  if (issues.length) throw new Error(`Runtime configuration validation failed (${RUNTIME_CONFIG_SCHEMA_VERSION}): ${issues.join("; ")}`);
}
