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

The authenticated settings screen confirmed that only safe display profiles and demo mode can be changed. It explicitly locks external LLM, email, Telegram, and arbitrary shell capabilities, and surfaces a dedicated portable JSON export control for laptop migration.

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

**Not verified:** the PowerShell scripts, Windows ACL behavior, Node native SQLite install, browser sign-in, start/stop, backup/restore, or database recovery have not been run on the physical HP Windows 10 laptop. The ZIP contains no credentials or user data. OpenCode/FreeLLMAPI and Telegram remain unconfigured; no live external model call or Telegram reply was attempted, and Stage 1 is not complete.

## Windows installer attempt and follow-up fix (16 November 2026)

The initial Windows PowerShell 5.1 installer attempt built the application but rejected the chosen password under the then-current 16-character rule before creating `.env`. A later install attempt showed pnpm running `node-gyp rebuild` for `better-sqlite3` on Node 24 and failing because Visual Studio C++ Build Tools were absent. This is a packaging regression: the pinned pnpm 10.18.0 and the workspace build allowlist caused an unnecessary source build, while `better-sqlite3@13.2.0` already ships platform prebuilds including `win32-x64.node`. The correction removes `better-sqlite3` from `onlyBuiltDependencies`, removes explicit rebuild steps from install/update, and retains a runtime smoke check so the bundled binary must load. The owner requested a six-character minimum and authorized a clean test reinstall that overwrites prior Ryze test data. The installer refuses an existing `.env`; delete only the two documented Ryze folders for that intentional reset. A six-digit numeric PIN is accepted but less secure than a longer mixed passphrase. Target-Windows verification of the corrected prebuilt path remains pending.
