# RyzeFramework Current Stage Handoff

**Status date:** 27 November 2026 — evening checkpoint
**Working branch:** `feature/telegram-file-transfer`
**Base:** verified `stable-merge` baseline `e8e7660`
**Current baseline:** Pushed documentation checkpoint `27fb1fe` is based on implementation commit `6f612e05b133cdd573121ce8608c5857015a4ceb` and is present on `origin/feature/telegram-file-transfer`. **Stage disposition:** At the owner's direction, Stage 1 is **PARTIAL — closed for sequencing, not complete**. Its nine origin criteria remain unwaived, and the retained self-test's historical results are unchanged. File Manifest early deletion remains owner-reported PASS; automatic 30-day expiry is intentionally parked for later Windows verification. Existing-file return is separately owner-reported PASS on `d35b770`. The latest summary-as-file request still resends `README.md`, and Ryze says it cannot create/write files. The owner has placed changes to the live agent skill/intent layer on hold and directed that this capability be handled as a bounded Stage 2 workstream. Backend tests are not live skill acceptance. Stage 2 is active; see [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md).

## Stage transition — preserve residual evidence and start Stage 2

Stage 1's open evidence stays visible but does not block beginning Stage 2. Do not declare Stage 1 operational or waive its original criteria. Keep the new-summary capability on hold for Stage 2 boundary design; do not modify Ryze's live skill/intent rules without review. The owner reports File Manifest early deletion PASS; verify automatic expiry separately on Windows. Cleanup covers active file bytes and metadata, not prior backups, task logs, or Telegram copies. Never include message bodies or secrets in diagnostics.

## Read first

1. [`origin-blueprint.md`](./origin-blueprint.md) — authoritative design baseline; original content is preserved, with dated status addenda appended.
2. [`blueprint-implementation.md`](./blueprint-implementation.md) — current implementation/status map.
3. [`stage-1-readiness.md`](./stage-1-readiness.md) — criterion-by-criterion evidence and remaining gates.
4. [`stage-1-task-breakdown.md`](./stage-1-task-breakdown.md) — engineering checklist.
5. [`ryze-playbook.md`](./ryze-playbook.md) — operator instructions and feature limits.
6. [`telegram-user-account-integration.md`](./telegram-user-account-integration.md) — worker/file-transfer contract.
7. [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md) — next-stage memory plan and ECC proposal assessment.

## Current implementation

- The local dashboard, Node/TypeScript server, SQLite persistence/migrations, local file storage, Windows install/update/backup/restore helpers, and chat-only OpenCode/FreeLLMAPI route remain in place.
- Telegram uses the owner-authorized Telethon user-account worker. The server accepts authorized private-chat instructions and restricts replies to the exact originating chat. Groups, broadcasts, proactive sends, shell execution, and general-purpose OpenCode tools remain disabled.
- Bounded Telegram file receipt and same-chat delivery are now implemented on this branch. Uploads use authenticated raw binary requests, at most 5 MiB, an explicit MIME allowlist, actual-byte validation, and server-generated storage keys. Source chat/sender/message IDs are persisted. File sends use an opaque owner-scoped file ID and an acknowledged worker command; they do not accept arbitrary paths or destinations.
- File analysis is chat-only and opt-in per request. TXT/Markdown/CSV/JSON files up to 64 KiB may be passed as untrusted document data to the configured model provider within a 24-hour lookup window. OpenCode tools remain deny-all; file content is not written into the Ryze task log. The user is told that analysis sends the content to the configured provider.
- The 24-hour window governs lookup/analysis eligibility; it does **not** delete the local file. The selected rule is now 30 days from file creation for uploaded and generated files, with immediate deletion from the active local store through the File Manifest. Expired files become inaccessible at the cutoff; a startup and hourly sweep removes bytes and metadata. Prior backups, task logs, and copies already sent to Telegram are not erased by this file policy.
- A narrowly matched explicit request can create and queue a distinct model-produced Markdown artifact in the backend; however, the owner's current user-visible Telegram request still resends the source and Ryze claims it cannot create files. The exact request uses `make`, which the current generated-summary matcher does not recognize as a create intent; the latest-file resend matcher therefore wins. The later “can you create a new file?” question also receives a text-only refusal. Treat this as a skill/intent capability gap. Defer the natural-language summary-attachment benchmark until Ryze can recognize file creation as an allowed capability. Keep the ordinary existing-file resend path separate; owner reports that path works. The backend integration test does not establish that live skill behavior works.

## Verification and evidence

### Stage 2 Gate 2 implementation checkpoint — COMPLETE — 25 November 2026

- The owner approved the exact additive memory/identity migration and repository slice after reviewing the v1 contract.
- SQLite migration `0005_special_argent` preserves legacy memory IDs, content, tags, outcomes, timestamps, and `core`/`evolving` scope; it adds nullable classification/provenance/version fields without guessing category or type. Ambiguous rows remain searchable as `legacy_unclassified`.
- Separate owner-scoped Ryze identity/profile revisions and protected System Memory tables are implemented. Identity changes are append/versioned; System Memory has a dedicated repository boundary and is not writable through model output.
- Explicit safe-memory flows now classify owner preferences as Personal/Preference and task summaries as Experience/Episodic. Portable exports include identity, revisions, and System Memory metadata while continuing to exclude credentials, Telegram sessions, and file bytes.
- Focused preservation, identity-versioning, protected-memory, owner-isolation, and provider tests were added. The earlier 65-test result is historical; the latest repository validation recorded 74 Vitest tests across 23 files, 9 worker tests, local build, and `git diff --check`. The build retains the existing non-fatal large-chunk warning.
- Gate 2 is complete, including the provider-neutral `MemoryProvider` abstraction and SQLite fallback in commit `3876c2c`. This is not Stage 2 completion. Gate 3 synthetic owner-facing acceptance and its nine-item contract mapping are complete for the tested scope; Gate 4 is passed only for its approved synthetic evaluation; Gate 5 is passed only for the tested disposable synthetic Windows scope. Provider-response acceptance and other Stage 2 residuals remain open.
- The attached advanced-memory proposal is recorded as a gated external-provider evaluation workstream. No Hindsight, MemPalace, ECC, automatic capture, cross-agent sharing, or live skill/intent changes were enabled.

### Stage 2 Gate 3 first implementation slice — 25 November 2026

- Added protected owner-authenticated procedures for memory review/create/list/read/update/archive/delete, identity/profile and revision inspection/update, System Memory review/create, and bounded retrieval context.
- Duplicate review distinguishes exact duplicates, likely conflicts, and similar records. Exact duplicates are returned rather than silently duplicated; conflicts require explicit owner confirmation; updates remain append-first and source-linked.
- Retrieval is bounded to 12 entries, returns excerpts plus provenance/version metadata, excludes restricted records unless explicitly requested, and preserves owner scoping. Personal Memory is not shared across owners.
- The dashboard Memory vault UX is implemented in `client/src/components/MemoryGovernancePanel.tsx`. The owner-facing synthetic checks and the nine memory-contract mapping are now complete for the tested scope. Origin blueprint §2.9 has ten bullet statements; preserve that distinction during final signoff rather than rewriting the origin text.

### Workspace verification — independently run in this sandbox

- `pnpm run check` — PASS.
- `pnpm test` — PASS, 74 tests across 23 files, including Gate 3 governance tests for duplicate/conflict review, restricted retrieval, bounded excerpts, and owner isolation. Earlier 65-test results remain historical.
- `pnpm run worker:test` — PASS, 9 Python worker tests.
- `pnpm run build:local` — PASS; the existing large JavaScript chunk warning remains non-fatal.
- `git diff --check` — PASS.

These results verify the backend route and file-retention implementation only; they do not close the owner-reported Telegram skill/intent gap for natural-language creation of a new summary file.

These are sandbox checks. They do not establish behavior on the target Windows installation or a live Telegram account.

### Previously prepared Windows package — stale; do not distribute as the current version

- `/home/ubuntu/RyzeFramework-Windows-Source-2026-11-25.zip` was prepared from an earlier worktree based on `786f2c435a86a01c9e7af2416ce0e5543913bc66`; its checksum accompanies it.
- It predates commit `c58bdad` and the current documentation updates, so it is not the current source package. Regenerate and re-verify the ZIP and checksum before Windows distribution.
- The older ZIP excluded Git history, `node_modules`, build output, real environment files, SQLite/user data, Telegram sessions, logs, backups, and existing archives. It required internet access for Windows dependency installation.

### Owner-reported target-Windows evidence

The owner reports that the latest package update completed, the dashboard opened, and existing memory entries remained visible and intact (**PASS, owner-reported**). The owner also reports persistence and ACL verification **PASS** from `Run operational baseline`. Its report confirms a protected backup folder, task/file creation, and `icacls` checks; its “Restore rehearsal” is explicitly a temporary copy and **does not verify integrity or perform an actual restore**. The owner later confirmed a separate disposable Windows profile for the restore-safety exercise.

### Stage 2 restore hardening and target-Windows evidence — PASS for disposable synthetic scope; broader acceptance remains open — 27 November 2026

- The reviewed restore package contains the hardened handler and read-only validator. On the disposable Windows profile, the installed SHA-256 values matched `scripts/windows/restore-deployment-manifest.json`: `Apply-RyzeRestore.ps1` = `099FD1C22CD3C79EED080091D0E9CD3C59B2AE3EEF0B0993400066A5D94949AF`; `validate-restore-db.mjs` = `9970E340C722E8A097C4B991F3578E73DBE15A2BACD4964727266FCDA90D0155`. The corrected package checksum was `78E73C5F21987010F541A4B510B2FAEDB2DD0870FC49DB79D7C839B2E2AB6120`.
- Windows dashboard reopen/persistence passed for synthetic Personal and Project memory, classification/version retention, and portable JSON export. Export evidence confirmed memory and identity metadata were present while secrets/session data were excluded.
- Valid restore passed in the disposable synthetic scope: A, B, and C were retained from the selected backup; D, created afterward, was absent; SQLite integrity and Stage 2 schema validation passed; Ryze restarted successfully.
- Corrupted-copy rejection passed before mutation: A and B were preserved and the dashboard reopened. Automatic rollback passed with the injected post-replacement failure: the handler restored and integrity-validated the prior state; after reopening, A and D were retained and SQLite integrity passed.
- Restore semantics: selecting a backup queues it for the next startup. The tested flow explicitly stopped Ryze and then ran `Start-Ryze.cmd`; no automatic application restart was tested or claimed.
- These results are target-Windows owner-reported evidence for a disposable synthetic profile. They do not validate real-user backups, production data, or completion of every Stage 2 contract item. Keep backups, databases, configuration, logs, sessions, and secrets outside Git and reports.

### Target-Windows Stage 2 Memory Vault verification — owner-reported PASS — 27 November 2026

The owner performed the focused disposable Windows verification requested by the Stage 2 review:

1. Memory Vault opened after restart — **PASS**.
2. Personal, Experience, and protected System Memory records displayed correctly — **PASS**.
3. Identity revisions remained visible — **PASS**.
4. Exact duplicate review did not silently create a second record — **PASS**.
5. Restricted records remained excluded by default — **PASS**.
6. Conflict review required explicit confirmation — **PASS**.
7. Exported and restored records retained category, type, version, provenance, and owner scope — **PASS**.

This closes the focused target-Windows memory-behavior check for the tested disposable synthetic scope. It does not establish production-data acceptance, remove the Stage 1 residual register, or declare Stage 2 complete.

### Provider-response acceptance — owner-reported PASS — 27 November 2026

The owner sent the exact Telegram prompt `Reply with exactly: Ryze gateway path test passed`. Ryze replied `Ryze gateway path test passed` almost immediately through the Telegram → OpenCode → FreeLLMAPI route. This resolves the previously open provider-response acceptance item for the tested path. It supersedes the earlier two-minute timeout as the current provider-response result, while retaining that timeout as historical diagnostic evidence. No unbounded wait loop was added.

### Cloud Gate 3 owner-facing acceptance — synthetic dashboard PASS; contract mapping recorded — 27 November 2026

- Dashboard checks passed for Personal/Preference, Experience/Project, exact duplicate review without silent duplication, protected System Memory review/add, identity revision with visible v1/v2 history, and Experience Episodic/Semantic/Procedural records.
- Lifecycle behavior passed: a Personal/Semantic record was owner-reviewed and saved, updated to version 2, and the UI confirmed that the previous revision remained archived.
- Restricted-memory behavior passed in the owner-authenticated dashboard/API session: default contextual retrieval returned zero entries with `excludedRestricted: 1`; explicit owner-controlled `includeRestricted: true` returned exactly the restricted owner-scoped record with provenance. A contradictory same-scope/category/type candidate surfaced `Review result: conflict` and `Possible conflict`; the owner-confirmation checkbox remained unselected, so the candidate was not silently saved.
- After stopping and restarting the isolated dashboard service, then re-authenticating the original synthetic owner, all six approved classified records remained visible, the lifecycle record remained at version 2 with its prior revision retained, identity remained at revision 2 with revision history, and the protected System Memory entry remained visible. This is synthetic Cloud evidence only; it does not claim target-Windows or production-corpus retrieval quality.

### Memory and identity contract — nine acceptance items mapped — 27 November 2026

| Contract item | Evidence and status | Boundary |
|---|---|---|
| 1. Stable, inspectable, separate, owner-change-controlled identity | **PASS, synthetic dashboard + automated tests.** Identity was edited through owner confirmation; revision 2 and the retained prior revision were visible before and after service restart. | Synthetic Cloud owner only; target-Windows identity UI is covered only indirectly by the Windows export/restore evidence. |
| 2. Distinct System, Experience, and Personal categories | **PASS, synthetic dashboard + schema/provider tests.** The dashboard showed Personal, four Experience records, and a separately displayed protected System Memory entry. | Synthetic records; not production-corpus coverage. |
| 3. Five secondary types stored/retrievable | **PASS, synthetic dashboard.** Preference, Project, Episodic, Semantic, and Procedural records were visible after restart. | Synthetic records. |
| 4. Owner-approved create, update/version, archive, retrieval across restart | **PASS for the tested synthetic path.** Create/review, lifecycle update to version 2, prior revision/archive visibility, retrieval, and restart persistence all passed. | The tested lifecycle is not a claim that every deletion/restore variant is complete. |
| 5. Relevant contextual search with owner isolation and restricted handling | **PASS for tested evidence.** Automated Gate 4 owner-isolation/relevance checks passed; the owner-authenticated restricted check excluded the record by default and returned it only with explicit inclusion. | Gate 4 remains limited to its approved synthetic fixtures; no production-corpus quality claim. |
| 6. Duplicate/conflict preservation without silent overwrite | **PASS for tested paths.** Exact duplicate review returned the existing record without increasing the count; the contradictory candidate was flagged as a conflict and blocked pending explicit confirmation. | The unsaved conflict candidate was intentionally not approved; no “latest wins” behavior is claimed beyond this observed path. |
| 7. System Memory and identity protected from direct model output | **PASS, automated governance tests + owner-facing protected review path.** System Memory uses a dedicated owner-reviewed control; identity changes require owner confirmation and preserve revisions. | No live provider/model mutation test is claimed. |
| 8. Legacy SQLite rows survive migration and remain searchable until classified | **PASS, automated migration/preservation tests.** Legacy IDs/content/tags/outcomes/timestamps/scope are preserved and ambiguous rows remain `legacy_unclassified` and searchable. | Sandbox/database-fixture evidence, not a production database migration. |
| 9. Windows export/restore with secrets excluded | **PASS for the disposable synthetic Windows scope.** Portable export contained memory/identity metadata and excluded secrets/session data; valid restore, corruption rejection, rollback, integrity, schema validation, and startup passed. | Keep Gate 5 limited to this disposable scope; the later provider-response and focused Memory Vault checks are also bounded owner-reported evidence, and Stage 2 remains active. |

This table reconciles the contract evidence but does **not** declare Stage 2 complete. Gate 4 remains approved only for its exact synthetic evaluation, Gate 5 remains limited to the tested disposable Windows scope, Stage 1 remains **PARTIAL — closed for sequencing, not complete**, and PR #1 remains open/unmerged.

### Blank FreeLLMAPI model startup defect — fixed and accepted on tested disposable Windows profile

- Root cause: runtime validation still rejected a blank `RYZE_FREELLMAPI_MODEL` when the FreeLLMAPI URL was configured, despite the dashboard/helper allowing automatic model selection.
- Source fix: blank/undefined model is now valid automatic selection; explicit `auto` and named model IDs remain valid. The Stage 1 diagnostic wording and tests were updated accordingly.
- Sandbox validation: `pnpm run check`, focused selector/hardening tests (7/7), full Vitest (74/74), worker tests (9/9), local build, and `git diff --check` pass. Corrected Windows package checksum, updater, installed critical hashes, dashboard reopen, existing-data persistence, blank-model acceptance, and restart all passed. The actual FreeLLMAPI prompt did not complete within two minutes and returned: `The model did not finish within two minutes. Check FreeLLMAPI status and retry.` Record this as a provider-response timeout, not a successful LLM response.

### Gate 4 result — approved synthetic evaluation PASSED after remediation

- The exact owner-approved 8-fixture/14-query set returned TP=13, FP=0, FN=0; precision/recall/F1=1.0. Q14 chronological order, restricted default exclusion/explicit inclusion, owner isolation, no-result behavior, and temp-database cleanup passed. The exact query text and expected labels were unchanged. Do not claim broad semantic retrieval quality or production-corpus representativeness.

Post-remediation sandbox validation: `pnpm run check` **PASS**; full `pnpm test` **74 tests across 23 files PASS**; `pnpm run worker:test` **9 PASS**; `pnpm run build:local` **PASS** with the existing non-fatal large-chunk warning; `git diff --check` **PASS**.

### Telegram file path

- Receipt, source binding, command-bound download, integrity checks, and acknowledgement validation pass automated workspace tests.
- **New-summary benchmark:** **DEFERRED** pending a Ryze skill/intent capability update. In the owner's 25 November conversation, `make a short Markdown summary of README.md and send the summary as a file` returned `[README.md]` again, and Ryze said it is text-only and cannot create/write files. The current matcher lacks the `make` creation verb, so the same message satisfies the existing-file matcher; the follow-up shows a broader capability/skill gap as well. Do not count the narrow backend integration test as an acceptance pass.
- **Early deletion:** owner reports File Manifest deletion **PASS on target Windows** on 25 November; exact package revision/checksum was not restated. Automatic 30-day expiry/sweep remains separately pending target-Windows verification.
- **Receipt/send chronology:** the owner first reported no detection, log, or receipt using the `99112b4` update ZIP (**FAIL**); the owner later reported file receipt with and without accompanying text (**PASS, owner-reported; tested package/version then unknown**). The owner confirms text-only ingress and file-reading feedback **PASS**, and confirms the existing file returned as a same-chat attachment, opened, and was correct (**owner-reported PASS on `d35b770`**). The separate request to create a new Markdown summary failed: Ryze re-sent the original README and said it could not create/save files (**owner-reported FAIL for new-file creation/delivery**). Do not count that as a generated-note attachment.
- **Root cause and fix:** text-only worker payloads included `fileId: null`; Zod's optional-but-not-nullable file ID schema returned `400 INVALID_INBOUND` before application logging, task creation, or reply queueing. Commit `d35b770` omits the key only when there is no file; captioned-file requests keep their real ID. Regression tests exercise both payload forms, the API's `null` rejection, current text-only acceptance, and existing file paths. No separate bridge was added and the file-transfer implementation was not changed.

## Recommended bounded task-execution decision

The owner has reported bounded README file feedback on target Windows using `d35b770`, and a correct existing-file return/opening as an attachment. The latest conversation reconfirms that a natural-language request to create and send a new Markdown summary still resends the original and produces a text-only refusal. This is **not** just a Windows-package acceptance step: defer the benchmark until the Ryze skill/intent capability that recognizes and performs new-file creation is addressed. Then test that the generated attachment differs from the source and separately retest the existing-file resend. Owner reports File Manifest early deletion PASS; verify automatic 30-day expiry separately.

## Next actions

1. Gate 4's approved fixed evaluation is passed within the synthetic fixture scope. Preserve the query proposal, historical baseline JSON, current JSON, and report as separate audit artifacts. Any future retrieval change must preserve the approved labels unless an owner-approved new proposal supersedes them, and must rerun both evaluations and the authorization controls.
2. Treat the remaining semantic-paraphrase miss in the separate eight-query exploratory baseline as an open retrieval-quality limitation, not a failed Gate 4 fixed-set label. Do not describe lexical token-overlap as general semantic retrieval or claim performance on a representative production corpus.
3. Keep Gate 5 limited to the tested disposable synthetic scope. The corrected package, updater/OpenCode deployment checks, dashboard persistence, blank-model startup, provider-response path, and focused target-Windows Memory Vault checks passed for the documented scope. Gate 3 owner follow-ups and the Stage 2 contract mapping are complete for the tested synthetic scope; Stage 2 remains active and is not complete.
4. Continue the remaining Stage 2 development plan in [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md), while holding the uncompleted contract-hardening and automatic-expiry checks for a later cycle. Do not infer normal-profile restore safety or production-corpus retrieval quality from the disposable synthetic Windows evidence or sandbox tests.
5. Keep ECC at audit/research level for now. It cannot substitute for memory design or any Stage 1/2 acceptance gate; any later experiment needs a pinned version, target-Windows compatibility check, isolated workspace, and Ryze deny-all permission boundary.
6. Preserve the Stage 1 residual register. The summary-file skill/intent issue is held for Stage 2 design; target-Windows automatic 30-day expiry remains a separate verification item. Early File Manifest deletion and existing-file return remain owner-reported PASS.
7. Preserve the 24 November self-test unchanged and distinguish its historical `NOT_RUN`/`WARN` statuses from later owner reports and sandbox checks. Stage 1 remains PARTIAL unless its nine criteria are later completed with evidence.

Do not mark Stage 1 operational from sandbox tests or architecture statements alone. Preserve the 24 November acceptance self-test unchanged and distinguish its results from later owner reports and workspace checks. Keep credentials, API keys, worker tokens, recovery codes, Telegram session files, and backup contents out of Git and support messages.
