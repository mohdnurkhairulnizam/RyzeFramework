type FaultCase = "timeout" | "rate_limit" | "refusal" | "malformed_response";

type SimulatedResponse = { status: number; body: unknown; networkError?: string };

const cases: { id: FaultCase; label: string; response: SimulatedResponse }[] = [
  { id: "timeout", label: "Provider timeout", response: { status: 0, body: null, networkError: "simulated timeout" } },
  { id: "rate_limit", label: "Provider rate limit", response: { status: 429, body: { error: { message: "simulated private quota detail" } } } },
  { id: "refusal", label: "Provider refusal", response: { status: 200, body: { outcome: "failed", error: { message: "simulated refusal detail" } } } },
  { id: "malformed_response", label: "Malformed provider response", response: { status: 200, body: "not-json" } },
];

function classify(response: SimulatedResponse) {
  if (response.networkError) return "timeout";
  if (response.status === 429) return "rate_limit";
  if (response.status < 200 || response.status >= 300) return "provider_error";
  if (typeof response.body === "string") return "malformed_response";
  if (response.body && typeof response.body === "object" && "outcome" in response.body && response.body.outcome === "failed") return "refusal";
  return "unexpected_success";
}

export function runProviderFaultSelfTest() {
  const startedAt = new Date().toLocaleString();
  const results = cases.map(testCase => {
    const observed = classify(testCase.response);
    const passed = observed === testCase.id;
    return { ...testCase, observed, passed };
  });
  const ok = results.every(result => result.passed);
  const consoleText = [
    `RYZE PROVIDER FAULT SELF-TEST · ${startedAt}`,
    "Mode: deterministic local simulation only",
    "Network calls: none; configured provider URL/key/model: not read",
    "Telegram messages: none sent; runtime configuration: unchanged",
    "",
    ...results.map(result => `[${result.passed ? "PASS" : "FAIL"}] ${result.label}: expected ${result.id}; observed ${result.observed}.`),
    "",
    ok
      ? "Interpretation: all controlled timeout, rate-limit, refusal, and malformed-response guards produced the expected sanitized classification."
      : "Interpretation: one or more controlled provider-fault guards did not produce the expected classification.",
    "This report proves the local error-handling boundary only; it is not evidence that the live provider was contacted or failed.",
    "No secret values, provider responses, API keys, or message bodies were included in this report.",
  ].join("\n");
  return { ok, results: results.map(({ id, label, observed, passed }) => ({ id, label, observed, passed })), consoleText };
}
