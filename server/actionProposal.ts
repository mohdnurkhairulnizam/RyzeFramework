import { z } from "zod";
import type { DemoAction } from "./ryzeDemo";

export const actionProposalSchema = z.object({
  version: z.literal("v1"),
  action: z.enum(["remember", "recall", "inspect_upload", "generate_note", "retry_demo", "safe_analysis"]),
  permission: z.enum(["L0_READ", "L1_LOCAL_WRITE"]),
  rationale: z.string().trim().min(1).max(500),
  input: z.string().trim().min(1).max(5000),
  requiresExternalSideEffect: z.literal(false),
}).strict();

export type ActionProposal = z.infer<typeof actionProposalSchema>;

const NARROW_ALLOWLIST = new Set<ActionProposal["action"]>([
  "remember", "recall", "inspect_upload", "generate_note", "retry_demo", "safe_analysis",
]);

export function parseActionProposal(value: unknown): ActionProposal {
  const parsed = actionProposalSchema.safeParse(value);
  if (!parsed.success) throw new Error("Action proposal is invalid or requests an unavailable operation.");
  if (!NARROW_ALLOWLIST.has(parsed.data.action)) throw new Error("Action is not in the Stage 1 allowlist.");
  return parsed.data;
}

export function proposalForDemoAction(action: DemoAction, prompt: string): ActionProposal | null {
  if (action === "blocked") return null;
  const permission = action === "generate_note" || action === "remember" ? "L1_LOCAL_WRITE" : "L0_READ";
  return parseActionProposal({
    version: "v1",
    action,
    permission,
    rationale: "Selected by the deterministic server-side classifier.",
    input: prompt,
    requiresExternalSideEffect: false,
  });
}
