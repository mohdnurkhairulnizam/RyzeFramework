# Prompt for the Next RyzeFramework Stage 2 Agent

Continue Mohd Nur's existing RyzeFramework project from its GitHub repository. Do not create a replacement project. The user's current instruction is to preserve continuity, keep target-Windows restore acceptance **PARTIAL / BLOCKED**, and continue only after deployment of the hardened restore handler is verified.

## Repository and branch

Repository: `https://github.com/mohdnurkhairulnizam/RyzeFramework.git`

Branch: `feature/mempalace-production-gate`

Fetch the latest branch before editing. If there is no working copy, clone the repository and check out the branch. If a working copy exists, inspect `git status` first and preserve user changes. Do not reset, clean, force-push, or overwrite uncommitted work. Keep work on the existing branch unless the user explicitly directs otherwise.

## Read first

Read these project files before planning or changing code:

- `docs/current-stage-handoff.md`
- `docs/stage-2-implementation-plan.md`
- `docs/memory-identity-contract.md`
- `docs/blueprint-implementation.md`
- `docs/origin-blueprint.md` (original design plus dated status addenda)
- `docs/ryze-playbook.md`
- `docs/evidence/gate4-query-set-proposal-2026-11-26.md`
- `docs/evidence/gate4-retrieval-evaluation-2026-11-26.md`
- `docs/stage2-restore-safety-test.md`

Inspect the relevant code/tests and current Git history before making changes. Use the latest committed repository state, not this prompt alone, as the source of truth.

## Current project state

- **Stage 1:** PARTIAL — closed for sequencing, not complete. Preserve its nine origin criteria and historical acceptance self-test. Do not count sandbox work as Windows acceptance.
- **Stage 2 Gate 2:** additive SQLite migration and provider-neutral `MemoryProvider` with SQLite fallback implemented.
- **Stage 2 Gate 3:** protected owner-scoped memory governance APIs and dashboard Memory vault UX implemented; remaining acceptance checks are still open.
- **Stage 2 Gate 4:** the owner-approved 8-fixture/14-query synthetic evaluation passed after remediation. Exact query wording and expected labels were unchanged. Post-remediation metrics: TP=13, FP=0, FN=0; precision=1.0, recall=1.0, F1=1.0. Q14 chronological order, restricted default exclusion/explicit inclusion, owner isolation, no-result behavior, and temp database cleanup passed. This is only a fixed synthetic-set result, not a representative production-corpus benchmark or evidence of broad semantic retrieval quality. The separate eight-query exploratory baseline is TP=5, FP=0, FN=1; F1=0.9091, with one semantic-paraphrase miss still open. Keep the initial failed Gate 4 JSON and current post-remediation JSON separately auditable. Do not change approved query wording or labels without a new owner-reviewed proposal.
- **Stage 2 Gate 5:** **PARTIAL / BLOCKED**. A deliberately corrupted duplicate backup was applied by the legacy installed Windows handler; Ryze failed to start with “file is not a database.” The owner reports recovery from the pre-restore snapshot succeeded; its SQLite integrity and Stage 2 schema checks passed, the dashboard reopened, and synthetic markers A/B were visible. This is recovery evidence, not restore acceptance. The hardened handler hash did not match the installed handler; the validator was absent. The candidate ZIP/extracted source was not found in the checked Downloads location, and the exact updater source/root cause remains unresolved. Valid restore and injected rollback remain NOT RUN.
- **Critical safety restriction:** Do not run another Windows restore, corruption, or rollback test, and do not instruct the owner to select Restore, until the actual updater/package source is identified, critical-file post-copy checks are in place, and the hardened handler and validator hashes/presence are verified in the disposable installation. Do not touch the user's live database, private backups, configuration, Telegram sessions, or secrets.
- **Other open work:** Stage 1 residuals, Gate 3 acceptance evidence, target-Windows automatic 30-day file expiry, the new-summary skill/intent capability gap, and Stage 2's nine-item contract versus ten origin-blueprint §2.9 bullet mapping remain distinct open items. Do not make broad file-writing permissions, automatic capture, external memory providers, ECC hooks/tools, or live skill/intent changes without a separate reviewed authorization.

## Immediate continuation priorities

1. Read the current handoff and establish whether any owner-provided updater ZIP/source or new Windows verification evidence has since appeared. Do not assume a package is present merely because an update command said “completed.”
2. Investigate updater provenance and deployment deterministically from repository code and verified package contents. Identify the exact source root/package actually used by `Update-Ryze.cmd`, trace how `Apply-RyzeRestore.ps1` and `validate-restore-db.mjs` are copied, and add fail-closed post-copy assertions for required-file existence and hashes if appropriate. Keep package generation separate from installation; do not interact with private profile data.
3. If diagnosis requires files or actions available only on Mohd's Windows installation, ask for narrowly scoped, redacted evidence (paths, version/hash/status only). Never ask for a private backup, database, `app.env`, `.env`, Telegram session, logs containing message bodies, credentials, recovery codes, or secret values.
4. Until deployment verification is established, mark Gate 5 PARTIAL / BLOCKED and explicitly state that restore/corruption/rollback testing remains prohibited. Do not infer Windows acceptance from Linux tests or from snapshot recovery.
5. Continue other authorized Stage 2 evidence only where it does not violate the Gate 5 restriction. Update continuity documents with dated, evidence-specific status, distinguishing owner-reported results from independently run sandbox tests.

## Gate 4 reproduction and limits

The approved proposal lives at `docs/evidence/gate4-query-set-proposal-2026-11-26.md`. The reproduction harness is `scripts/evaluate-gate4-retrieval.ts`; the current result is `docs/evidence/gate4-retrieval-evaluation-2026-11-26.json`; the pre-remediation baseline is `docs/evidence/gate4-retrieval-evaluation-2026-11-26-baseline.json`; the explanatory report is `docs/evidence/gate4-retrieval-evaluation-2026-11-26.md`. Do not overwrite the baseline file. The implementation in `server/db.ts` is bounded normalized lexical token-overlap scoring with deterministic ranking and a 1,000-candidate cap, not embeddings or a general semantic model. Restricted authorization is separate and default-false; never loosen it to improve recall.

If later retrieval code changes are authorized, rerun the unchanged approved fixed set, the separate eight-query regression baseline, owner-isolation/restricted-memory controls, focused tests, and the full validation suite. Report those scores separately and retain known limitations.

## Validation and Git hygiene

For relevant code changes, run focused tests plus `pnpm run check`, `pnpm test`, `pnpm run worker:test`, `pnpm run build:local`, and `git diff --check` where feasible. State any skipped checks and why. Confirm the worktree contains no private data, secrets, backups, user databases, or session files before committing. Do not claim target-Windows acceptance without evidence from the verified target installation.

Commit only when the user has authorized continuity commits (they have authorized the current task's commit); keep the existing branch. Push only through the enabled, properly scoped GitHub route and only after confirming the final diff. In final reporting, distinguish the committed Gate 4 synthetic evaluation pass from the still blocked Gate 5 Windows restore acceptance and provide any owner action as precise, copy-ready instructions.
