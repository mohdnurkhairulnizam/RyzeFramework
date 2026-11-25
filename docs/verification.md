# Hosted Sandbox Verification Notes

The PROJECT RYZE dashboard was visually checked at desktop width after the React dependencies settled. The authenticated sandbox rendered a persistent control sidebar, safe task composer, system-status cards, and active/completed/failed task panels with the specified dark glassmorphic visual system. The browser console reported no runtime error during that check.

Server-side unit coverage verifies the safe action classifier blocks shell, credential, and external-delivery requests; verifies supported workflow routing and deterministic note generation; and verifies that the portable export carries disabled integration flags without file-byte data.

The authenticated browser test submitted `remember that property reports should use Malaysian English`. The hosted workflow created a persistent sandbox session, completed the allowlisted memory action, displayed the structured system/Ryze/Nerd log sequence, and reported the result as a completed task without contacting an external service.

After the dashboard refreshed, its status summary synchronized to zero active tasks and one completed task, matching the persisted workflow record.

The authenticated browser also submitted `run a bash shell command to inspect the server`. The safe classifier stored the task as a failed `blocked` action, displayed the explicit safety explanation and structured log trail, and did not expose or execute any shell capability.

The authenticated file-manifest view rendered its secure intake rules, accepted-file categories, 5 MB ceiling, and empty portable manifest state before upload validation was exercised.

The file intake was refined to use a native, keyboard-accessible browser file field with the same glassmorphic visual treatment, allowing the sandbox to perform direct secure upload tests without a hidden-control dependency.

The authenticated browser confirmed that the final file-manifest control exposes a directly selectable `Upload sandbox document` file input while preserving the surrounding dark glassmorphic treatment.

A harmless 113-byte Markdown fixture was uploaded successfully through the authenticated browser. The manifest then displayed its original name, MIME type, byte size, upload source, timestamp, and protected storage URL, confirming that the file bytes were stored outside the database while portable metadata was persisted.

The authenticated settings screen confirmed that only safe display profiles and demo mode can be changed. It explicitly locks external LLM, email, Telegram, and arbitrary shell capabilities, and surfaces a dedicated portable JSON export control for computer migration.

The portable export was downloaded and verified to carry the `ryze-sandbox-v1` contract, disabled external LLM/email/Telegram flags, and the uploaded-file metadata without any `fileBytes` field. A final mobile screenshot at 390 px width preserved the composer, status cards, task views, safety boundary, and mobile navigation trigger without horizontal overflow.

After the retry hardening, the hosted service restarted cleanly and the authenticated workspace reloaded with the existing user-scoped task history intact.

An authenticated `retry demo` workflow was submitted to exercise the new bounded recoverable-retry path; its persisted task result and structured log sequence are being verified next.

The retry workflow completed with `Retry 1/3` and a complete persisted audit trail: a recoverable Nerd warning on attempt one, Ryze’s bounded correction, and Nerd’s successful attempt-two completion. The test suite now also includes ownership-boundary assertions that reject cross-user and missing records.

Following the generalized retry-engine change, a second authenticated retry workflow was submitted to verify the current server implementation through persisted UI logs.

The current hosted workflow completed the second retry test with `Retry 1/3`, a recoverable first-attempt warning, Ryze’s generic recovery decision, and an explicit successful attempt-two completion. The expanded Vitest suite also verifies a generalized recoverable generated-note operation and the actual dashboard-scope-to-export data path, excluding foreign sessions, tasks, logs, memory, skills, files, and settings from the authenticated user’s export.

The final procedure-level suite invokes the actual authenticated `ryze.dashboard`, `ryze.exportData`, and `ryze.submitTask` procedures through router callers. It confirms that both data-returning routes receive the signed-in user ID and that a generated-note storage timeout is retried once, with task retry state, warning log, file metadata, and final completion update all persisted through the routed workflow.

At that earlier hosted-foundation checkpoint, the last integration-style routed test read the generated-note retry workflow back through `ryze.dashboard`, proving that the recovered non-`retry_demo` action persists `retryCount: 1` and the warning retry log into dashboard-visible data. That checkpoint's validation completed TypeScript checking, 14 Vitest tests across seven test files, and a production build successfully; the later local-installer verification is recorded below.

## Standalone local Windows package verification — 15 November 2026

The local package now uses SQLite migrations (`drizzle/sqlite/`), a local filesystem adapter, an authenticated owner-scoped download route, and a first-run password login. The installer generates a random signing secret plus a salted scrypt password hash; login rejects non-loopback requests, mismatched origins, invalid passwords, and repeated failures. The local server binds to `127.0.0.1` only. The local Vite build no longer includes the third-party analytics script.

Validation passed in the cloud sandbox: `pnpm install --frozen-lockfile`; `pnpm check`; 20 Vitest tests across 10 files; 4 Python worker safety tests; and `pnpm build:local`. The SQLite integration tests apply the migration baseline, seed the owner/default-safe settings, exercise upserts/tasks/logs, write file bytes to a temporary local folder, reject traversal paths, and verify that file metadata is only retrievable for its owner. Local-auth tests cover valid scrypt login, localhost cookie attributes, cross-origin rejection, and temporary lockout; a local-mode environment test confirms inherited OAuth, database, Forge, and worker credentials are ignored.

A disposable production-process smoke test verified the `/health` response, local owner password login, automatic SQLite migration, admin owner row, and default settings. The server and temporary test data were stopped/removed afterwards. The final Vite bundle reports only a non-fatal large-chunk advisory.

**Not verified at this 15 November checkpoint:** the PowerShell scripts, Windows ACL behavior, Node native SQLite install, browser sign-in, start/stop, backup/restore, or database recovery had not yet been run on the physical target Windows computer. The owner later reported successful dashboard startup after an ACL repair, as recorded in the 22 November checkpoint below. OpenCode/FreeLLMAPI and Telegram remain unconfigured; no live external model call or Telegram reply was attempted, and Stage 1 is not complete.

## Windows installer attempt and follow-up fix (16 November 2026)

The initial Windows PowerShell 5.1 installer attempt built the application but rejected the chosen password under the then-current 16-character rule before creating `.env`. A later install attempt showed pnpm running `node-gyp rebuild` for `better-sqlite3` on Node 24 and failing because Visual Studio C++ Build Tools were absent. This is a packaging regression: the pinned pnpm 10.18.0 and the workspace build allowlist caused an unnecessary source build, while `better-sqlite3@13.2.0` already ships platform prebuilds including `win32-x64.node`. The correction removes `better-sqlite3` from `onlyBuiltDependencies`, removes explicit rebuild steps from install/update, and retains a runtime smoke check so the bundled binary must load. The owner requested a six-character minimum and authorized a clean test reinstall that overwrites prior Ryze test data. The installer refuses an existing `.env`; delete only the two documented Ryze folders for that intentional reset. A six-digit numeric PIN is accepted but less secure than a longer mixed passphrase. The owner later reported successful startup on Windows after correcting ACLs on the existing database and WAL/SHM sidecars; the 22 November checkpoint below records that evidence and the remaining computer checks.


## target Windows computer startup and SQLite ACL recovery — 22 November 2026

The owner installed the updated Windows package and reported that startup succeeded. The first server error was `unable to open database file`. The configured database path pointed to `%LOCALAPPDATA%\RyzeFramework\data\ryze.sqlite`; the directory existed and passed a write probe, but `icacls` showed no effective entries on the existing `ryze.sqlite`, `ryze.sqlite-wal`, and `ryze.sqlite-shm` files. Resetting file ACLs with `icacls <file> /reset` restored inherited access without deleting or rewriting database contents. The owner then confirmed success. A similar missing-file-ACL condition on the server error log had previously been corrected the same way so its contents could be read. Later the same day, the owner signed in and completed a real text-chat request through OpenCode and FreeLLMAPI, as recorded below. Repeat start/stop, backup/restore, Telegram communication, and the remaining Stage 1 acceptance checks are still open.


## Real OpenCode–FreeLLMAPI text-chat test — 22 November 2026

The owner configured the target Windows computer's local FreeLLMAPI base URL as `http://127.0.0.1:31415/v1`. The model ID and unified key were saved in the installed `.env`; their values were not shared into Git or recorded here. The owner reported `OpenCode: Running` and `FreeLLMAPI: Connected`, then submitted a harmless SQLite explanation prompt through Ryze. The dashboard marked the task `COMPLETED`. Its structured activity log showed `safe analysis`, routing through the local OpenCode service and FreeLLMAPI, chat-only mode with OpenCode tools denied, the assistant text, and successful completion. This confirms a real model-backed text response through the configured path, not merely the health probes.

The owner then requested exactly two separate Markdown bullet lines twice. The returned content kept both points on one line, so basic chat succeeded but formatting compliance was not demonstrated. No exact model ID or upstream provider was captured, and the `X-Routed-Via` response header (documented in [FreeLLMAPI's official repository](https://github.com/tashfeenahmed/freellmapi)) was not exposed in Ryze's task view or checked with a direct SDK request. The test did not exercise tool execution, file-content analysis, provider fallback/failure, or Telegram. The user was advised that there is no user-facing tool-permission toggle; the launcher-managed OpenCode config remains deny-all, and no permission changes were made. Telegram outbound remains disabled, and Stage 1 is incomplete.

## Telegram file-transfer implementation checkpoint — 25 November 2026

The Telegram worker/server implementation now supports authorized private-chat file receipt (maximum 5 MiB, allowlisted types, actual-byte validation, and owner/chat/sender/source-message binding), same-originating-chat file delivery through acknowledged commands, and opt-in analysis of UTF-8 TXT/Markdown/CSV/JSON files up to 64 KiB. The analysis treats file contents as untrusted data and leaves OpenCode tools deny-all. Groups and non-private chats are not supported. The 24-hour file lookup window does not expire or delete persistent stored file bytes; automatic expiry and an in-dashboard deletion control are not implemented.

Sandbox validation passed: `pnpm run check`; `pnpm test` (49 tests across 18 files); `pnpm run worker:test` (8 tests); `pnpm run build:local` (with a non-fatal large-chunk advisory); and `git diff --check`. The code tests cover integration and worker safety paths, but do not establish live Telegram or target-Windows behavior.

The owner reported the Telegram acknowledgement-mismatch and provider-failure checks as PASS. These are recorded as **PASS (owner-reported; not independently verified here)**. The later owner-reported first file-receipt attempt is recorded below as FAIL; requested Markdown analysis, return-file delivery, and generated-note delivery remain **NOT_RUN**. The retained 24 November self-test is unchanged and continues to record its own Gate 1, Gate 5, and Gate 8 as NOT_RUN and Gate 7 as WARN. Stage 1 remains **PARTIAL**.

For bounded task execution, the recommendation is to accept one authorized private-chat Markdown-summary workflow as a narrow demonstration only after target-Windows evidence is retained. This is a proposed acceptance decision, not owner approval, and neither the example nor the sandbox tests establish general-purpose task execution or live file delivery.

## Owner-reported Windows receipt failure and corrective investigation — 25 November 2026

The owner initially reported that the Windows update ZIP from commit `99112b4` did not detect, log, or receive a Telegram file (**FAIL, owner-reported; not independently verified**). The owner later reports that the latest laptop revision receives files with or without accompanying text and returned the same-chat receipt reply “I received and stored README.md” (**PASS for file receipt, owner-reported; exact package version not identified here**). The owner also reports that the same-chat file-sending test was verified successful (**PASS, owner-reported; tested build unknown**). Plain-text-only messages are still not detected (**FAIL, owner-reported**); dashboard log/task status is unknown. File-content analysis and generated-note delivery remain **NOT_RUN**. The successful file-send report and receipt report do not establish behavior of the new corrected package.

Code review found a concrete compatibility risk: the previous stable worker's text request omits `isPrivate`, while the newer server required it. That can make a legacy text-only request fail schema validation while file receipt uses a separate endpoint. The server now accepts the field as optional only for backward compatibility and still infers private status only when Telegram chat ID equals sender ID; an explicit `isPrivate: false` or mismatched IDs remain ignored. A regression test covers both acceptance and these rejection boundaries. This is a plausible explanation, not a confirmed laptop diagnosis. The separate Windows stop/update correction targets only a Python process whose command line references this Ryze installation's worker script; it remains a lifecycle safeguard. No target-Windows PowerShell or live Telegram run has occurred in this workspace.

The 24 November acceptance self-test at `docs/evidence/stage1-acceptance-self-test-2026-11-24-183302.txt` remains unchanged. The corrected package requires a fresh owner retest: test one text-only message for event/log/task/reply, then confirm file receipt and same-chat file return on that package. Report file analysis and generated-note delivery as separate outcomes.

## Legacy text-ingress compatibility correction and regression verification — 25 November 2026

The previous stable worker's text request did not include `isPrivate`; the updated server had made that field mandatory for text ingress, while file receipt used its own API route. `server/workerApi.ts` now accepts the absent flag only for matching Telegram chat and sender IDs, which preserves the private-chat boundary. Explicit `isPrivate: false` and mismatched IDs remain ignored. The `telegramFileTransfer.test.ts` regression checks accepted legacy text ingress, rejected non-private/mismatched cases, the captioned-file + linked text path, file receipt, and same-chat file download/acknowledgment. This is a likely compatibility correction, not an independently confirmed laptop diagnosis.

Final workspace checks passed: `pnpm run check`; 51 Vitest tests across 18 files; 8 Python worker tests; `pnpm run build:local` (with a non-fatal large-chunk warning); and `git diff --check`. Static checks confirmed CRLF line endings and Ryze-worker-specific process matching/order in the PowerShell scripts. PowerShell itself is unavailable in this sandbox, so the scripts were not parsed or executed on Windows. No live Telegram account or target-Windows execution was available here.
