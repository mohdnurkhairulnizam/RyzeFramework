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
- Exact recovery-code sender authorization works for one hour; expiry is still pending verification.
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
- Workspace: TypeScript check PASS.
- Workspace: 46 Vitest tests PASS across 16 files, including blank, explicit `auto`, and named FreeLLMAPI model-selector coverage plus Stage 1 hardening boundaries.
- Workspace: 4 Python worker tests PASS.
- Workspace: local production build PASS.

## Remaining gates before Stage 1 operational status

- Target Windows self-test should report runtime schema `v1` and the explicitly configured FreeLLMAPI selector; blank remains incomplete, while deliberate `auto` and named selectors are valid.
- Complete Telegram acknowledgement-mismatch and provider timeout/failure evidence.
- Verify restore/rollback of the server and worker configuration, including Telegram session recovery.
- Verify generated report/file retrieval and delivery; metadata inspection alone is not file delivery.
- Verify recovery-code expiry after one hour; intentionally deferred by the owner.
- Define and implement structured action proposals before any future tools.
- Define the narrow action allowlist, permission requirements, rejection behavior, and strict result validators.
- Add controlled provider timeout/rate-limit/cancellation tests without granting shell access.
- Apply the documented message-content retention and operational rollback policy on target Windows and retain evidence.
- Record evidence against all nine origin Stage 1 criteria. Do not mark Stage 1 complete from architecture statements alone.

## Immediate next implementation action

Continue with target-Windows operational evidence: provider timeout/refusal behavior, physical restore/rollback, generated report/file delivery, and recovery-code expiry. Keep the current structured proposal/validator boundaries and deny-all OpenCode tool policy. Do not start Gmail until Stage 1 is stabilized. Gmail must use Google OAuth; Drive and Photos must remain separate optional scopes.

The retention and rollback policy is in `docs/stage-1-retention-rollback.md`. Automated tests prove path safety and expiry semantics, but they do not replace live Windows restore or a real one-hour Telegram expiry observation.

## Latest repository state

- Latest commit: `95390ab` (`test explicit FreeLLMAPI model selectors`).
- Previous configuration commit: `44f8fef` (`allow explicit FreeLLMAPI auto selector`).
- Branch `stable-merge` is pushed to `origin/stable-merge`.
- Refreshed package: `RyzeFramework-stage1-acceptance-self-test-v21.zip`; SHA-256 `ef09ca46c136646805ff7527948acab79abbd5ffb4a7357c4852e9a0d990b4fe`.

## Important constraints

Never request or expose `.env`, API credentials, worker tokens, passwords, login codes, recovery codes, Telegram session files, backup contents, or Gmail passwords. Preserve the stable Windows ACL/startup behavior. The user wants the dashboard to remain the primary configuration center and the Playbook to remain simple.
