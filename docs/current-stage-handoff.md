# RyzeFramework Current Stage Handoff

**Repository branch:** `stable-merge`
**Handoff date:** 23 November 2026
**Current milestone:** Stage 1 foundation — autonomous Telegram/OpenCode path and acceptance evidence in progress.

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
- Implicit FreeLLMAPI model fallback was removed. The exact model ID must be configured; no `auto` substitution is allowed.

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
- Workspace: 32 Vitest tests PASS.
- Workspace: 4 Python worker tests PASS.
- Workspace: local production build PASS.

## Remaining gates before Stage 1 operational status

- Verify an explicit FreeLLMAPI model ID appears as configured in the self-test.
- Complete Telegram acknowledgement-mismatch and provider timeout/failure evidence.
- Verify restore/rollback of the server and worker configuration, including Telegram session recovery.
- Verify generated report/file retrieval and delivery; metadata inspection alone is not file delivery.
- Verify recovery-code expiry after one hour; intentionally deferred by the owner.
- Define and implement structured action proposals before any future tools.
- Define the narrow action allowlist, permission requirements, rejection behavior, and strict result validators.
- Add controlled provider timeout/rate-limit/cancellation tests without granting shell access.
- Define message-content retention and operational rollback policy.
- Record evidence against all nine origin Stage 1 criteria. Do not mark Stage 1 complete from architecture statements alone.

## Immediate next implementation action

Continue with runtime configuration and safe task execution: finalize the versioned non-secret configuration contract and separate secret contract, then implement structured action proposals and strict validation while retaining the current deny-all OpenCode tool policy. Do not start Gmail until Stage 1 is stabilized. Gmail must use Google OAuth; Drive and Photos must remain separate optional scopes.

## Important constraints

Never request or expose `.env`, API credentials, worker tokens, passwords, login codes, recovery codes, Telegram session files, backup contents, or Gmail passwords. Preserve the stable Windows ACL/startup behavior. The user wants the dashboard to remain the primary configuration center and the Playbook to remain simple.
