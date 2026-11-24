# RyzeFramework Current Stage Handoff

**Repository branch:** `stable-merge`
**Handoff date:** 24 November 2026
**Current milestone:** Stage 1 foundation — runtime configuration and safe execution hardening are implemented; autonomous Telegram/OpenCode acceptance evidence remains in progress.

## Read first

1. `docs/origin-blueprint.md` — authoritative original direction and completion plan; do not rewrite it.
2. `docs/blueprint-implementation.md` — current implementation map and checkpoints.
3. `docs/stage-1-readiness.md` — Stage 1 readiness assessment and operational gates.
4. `docs/stage-1-task-breakdown.md` — engineering checklist.
5. `docs/ryze-playbook.md` — user-facing manual only; keep architecture details out of it.

## Verified implementation

- Local React/Vite dashboard, Node/TypeScript server, SQLite persistence, local file storage, and Windows launch/update/backup helpers.
- OpenCode + FreeLLMAPI text-chat route works on target Windows when configured.
- Telegram Telethon user-account worker is dashboard-configurable.
- Permanent admin sender is accepted by default; ordinary unauthorized senders are ignored.
- Exact recovery-code sender authorization works for one hour; target-Windows expiry observation is now PASS.
- Autonomous replies require no per-message owner approval, are restricted to the exact originating chat, and do not support broadcasts, proactive messages, sales funnels, or unrelated automation.
- Server-side controls include pause/stop checks, sender/chat/task/message eligibility, durable reply keys, content hashing, Telegram acknowledgement validation, completed-command filtering, and failure logging.
- Telegram prompt routing uses the shared OpenCode + FreeLLMAPI path rather than the generic safe demo.
- Metadata-only file inspection is verified; uploaded content is not executed.
- Worker stop/start replay behavior and duplicate/replayed inbound-event prevention are reported PASS.
- A dashboard **Stage 1 acceptance self-test** produces non-secret `PASS`, `WARN`, `FAIL`, and `NOT_RUN` evidence.
- Implicit FreeLLMAPI model fallback was removed. The model selector must be explicitly configured; an explicit `auto` value is allowed when FreeLLMAPI is intended to select the model.
- Runtime configuration schema `v1` is emitted by the installer and checked at startup; local/hosted contradictions and incomplete provider pairs fail closed.
- Structured v1 action proposals are parsed server-side with a narrow no-side-effect allowlist. OpenCode tools remain deny-all.
- Strict validators cover uploaded/generated file metadata and Telegram acknowledgement shape/content fields.
- Provider timeout, rate-limit, refusal, and malformed-response tests pass; restore selection and one-hour expiry logic have automated unit coverage.

## Current test evidence

- Target Windows: permanent-admin same-chat reply PASS.
- Target Windows: pause/resume PASS.
- Target Windows: unauthorized sender rejection PASS.
- Target Windows: temporary recovery-code authorization PASS.
- Target Windows: controlled failure handling PASS.
- Target Windows: metadata inspection of `ryze-baseline-test-20261123135610940.md` (`text/markdown`, `113` bytes), with content not executed, PASS.
- Target Windows: worker stop/start replay PASS.
- Target Windows: duplicate/replayed inbound-event prevention PASS.
- Target Windows: one-hour recovery-code expiry observation PASS; after expiry the temporary sender was no longer authorized.
- Target Windows: physical backup/restore including Telegram session recovery PASS.
- Target Windows: provider fault simulation PASS for timeout, rate limit, refusal, and malformed response; no network call was made.
- Workspace: TypeScript check PASS.
- Workspace: 47 Vitest tests PASS across 17 files, including blank, explicit `auto`, and named FreeLLMAPI model-selector coverage plus Stage 1 hardening boundaries.
- Workspace: 4 Python worker tests PASS.
- Workspace: local production build PASS.

## Remaining gates before Stage 1 operational status

- Re-run the target-Windows Stage 1 self-test after the latest package and retain its report; deliberate `auto` and named selectors are valid.
- Complete Telegram acknowledgement-mismatch and provider timeout/failure evidence.
- Verify rollback of the server and worker configuration; physical restore and Telegram session recovery are PASS.
- Verify generated report/file retrieval and delivery; metadata inspection alone is not file delivery.
- Keep the implemented structured action-proposal boundary and narrow allowlist under regression coverage.
- Keep the implemented narrow action allowlist, rejection behavior, and strict result validators under regression coverage.
- Live target-Windows provider timeout/failure evidence remains open; deterministic local timeout/rate-limit/refusal/malformed-response tests are PASS.
- Apply the documented message-content retention and operational rollback policy on target Windows and retain evidence.
- Record evidence against all nine origin Stage 1 criteria. Do not mark Stage 1 complete from architecture statements alone.

## Immediate next implementation action

Continue with target-Windows operational evidence: provider timeout/refusal behavior, physical restore/rollback, and generated report/file delivery. Keep the current structured proposal/validator boundaries and deny-all OpenCode tool policy. Do not start Gmail until Stage 1 is stabilized. Gmail must use Google OAuth; Drive and Photos must remain separate optional scopes.

The retention and rollback policy is in `docs/stage-1-retention-rollback.md`. Automated tests prove path safety and expiry semantics; the owner has now supplied the corresponding real one-hour Telegram expiry observation.

## Latest repository state

- Latest commit: `0d12c10` (`align Stage 1 evidence documents`).
- Previous provider-test commit: `0c92700` (`add dashboard provider fault self-test`).
- Branch `stable-merge` is pushed to `origin/stable-merge`.
- Refreshed package is generated from the latest pushed commit after this handoff update; verify its SHA-256 from the delivery message.

## Important constraints

Never request or expose `.env`, API credentials, worker tokens, passwords, login codes, recovery codes, Telegram session files, backup contents, or Gmail passwords. Preserve the stable Windows ACL/startup behavior. The user wants the dashboard to remain the primary configuration center and the Playbook to remain simple.

## Continuation update: provider fault dashboard test

A protected Settings action now runs a deterministic simulation of timeout, rate-limit (HTTP 429), refusal/error, and malformed-response handling. It produces a copyable report and explicitly states that no network request, provider secret read, configuration change, or Telegram send occurred. Treat this as simulation evidence, not live-provider evidence.

### Verified provider-fault simulation evidence

Target-Windows dashboard report received on 24 November 2026: PASS for timeout, rate limit, refusal, and malformed response. The report confirmed deterministic local simulation, no network calls, unchanged runtime configuration, and no secret/message exposure. Live-provider behavior remains a separate evidence item.

## Next-AI continuation instructions

Clone or pull branch `stable-merge` and read this handoff before changing code. The current checkout is Stage 1 foundation hardening, not Stage 1 operational completion. Preserve the stable Windows startup/ACL behavior and do not request or expose secrets.

Already implemented and evidence-backed: runtime schema `v1` with fail-closed validation; explicit FreeLLMAPI model selection including deliberate `auto`; structured v1 no-side-effect action proposals; narrow server-side allowlist; strict file/generated-artifact/Telegram acknowledgement validators; autonomous same-chat Telegram controls; physical backup/restore with Telegram session recovery; one-hour recovery-code expiry; and the dashboard deterministic provider-fault simulation with copyable logs.

Continue in this order:

1. Re-run the target-Windows Stage 1 self-test from the latest package and retain its report.
2. Add a simulation-only dashboard report for Telegram acknowledgement mismatch if useful, while keeping real acknowledgement validation unchanged.
3. Decide and implement a safe controlled live-provider diagnostic only if it can preserve the normal configuration and avoid secret exposure; never label local simulation as live evidence.
4. Capture exact model/provider identity only from non-secret metadata actually returned by the gateway; report `NOT_REPORTED` rather than guessing.
5. Finish rollback evidence on target Windows without replacing live data unexpectedly.
6. Do not claim Telegram file delivery until actual document sending and acknowledgement verification are implemented; current text-only Telegram behavior is intentional.
7. Update all evidence documents and keep Stage 1 `PARTIAL`, `NOT_RUN`, `NOT_IMPLEMENTED`, and `FAIL` distinctions explicit.

The next AI must run `pnpm run check`, `pnpm test`, `pnpm run worker:test`, `pnpm run build:local`, and `git diff --check` before committing. Coding commits must contain exactly one trailer: `Co-authored-by: Manus <dev-agent@manus.ai>`.
