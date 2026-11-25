# Stage 1 Windows Acceptance Addendum — Text Ingress and File Feedback

**Date:** 25 November 2026  
**Branch:** `feature/telegram-file-transfer`  
**Fix commit/package made available:** `d35b770b357c3d81660951be2ff533976d591e06`

## Owner-reported result

The owner reports that text-only Telegram input now succeeds and Ryze can read a provided file and return feedback. The attached sanitized conversation excerpt shows a request to read/explain `README.md` followed by a response summarizing its contents. Record this as **PASS (owner-reported)** for text-only ingress and file-reading feedback.

The owner subsequently explicitly confirmed that the successful test used package commit `d35b770b357c3d81660951be2ff533976d591e06`. Package attribution is therefore **owner-confirmed**; the ZIP checksum was not separately reconfirmed. This remains owner-reported Windows evidence, not an independently verified test.

The owner subsequently reports that Ryze returned the existing file in the same Telegram chat, that it arrived as an attachment, opened successfully, and was the correct file (**PASS, owner-reported, package `d35b770`**).

The owner also tried twice to request a short Markdown summary of `README.md` as a new file. Ryze returned the original `README.md` attachment again instead of a new summary file; when corrected, it acknowledged that it could not create/save a new file from the chat. Record **FAIL (owner-reported)** for new Markdown-file creation and delivery through this Telegram request. The attachment-return path works for an existing file, but this test does not demonstrate that Ryze generated a new artifact. Do not count the re-sent README as a generated note.

Source inspection explains the two outcomes: in `server/workerApi.ts`, a request matching “send/return … file” is routed to the latest-upload resend path, while a request about file content is sent through the chat-only analysis path. That analysis returns text; it does not turn the model response into a stored Markdown artifact. A separate safe `generate_note` action exists, but this uploaded-file summary request did not reach a path that combines file analysis, new-note creation, and same-chat attachment delivery. Keep the existing-file resend behavior unchanged; add and test a separate, explicit generated-summary path if this capability is required.

## Source fix and workspace evidence

The regression was traced to text-only worker requests serializing `fileId: null`, while the API schema accepts an omitted field or a valid file ID and rejects `null` with `400 INVALID_INBOUND`. Commit `d35b770` omits `fileId` only when no attachment exists; captioned-file requests retain their real file ID. File upload, receipt, delivery, download, and acknowledgement implementation was not changed.

Workspace verification for the fix: `pnpm run check` PASS; `pnpm test` PASS (51 tests across 18 files); `pnpm run worker:test` PASS (9 tests); `pnpm run build:local` PASS with the existing non-fatal large-chunk warning; `git diff --check` PASS. The regression tests verify absent-vs-real `fileId` worker payloads, API acceptance of the current text-only shape, rejection of the former `null` shape, and continued captioned/file-transfer behavior.

## Stage disposition

Stage 1 remains **PARTIAL**. This report records owner-reported PASS for text-only ingress, file-reading feedback, and same-chat return/opening of the existing file on the owner-confirmed `d35b770` package. The attempted creation and delivery of a new Markdown summary from Telegram is **FAIL (owner-reported)** because Ryze re-sent the original README and said it could not create a file. Source inspection confirms that the current request routes do not combine uploaded-file analysis with generated-artifact creation; implement a distinct path without changing existing-file resend behavior. Remaining items include that supported end-to-end generated-note path, broader acceptance and operational/failure/rollback evidence, and a file retention/deletion policy. The 24-hour lookup window does not delete stored files. Preserve the 24 November 18:33 self-test unchanged; its earlier `NOT_RUN`/`WARN` entries remain that test's historical results.
