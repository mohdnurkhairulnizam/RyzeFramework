# Stage 1 Windows Acceptance Addendum — Text Ingress and File Feedback

**Date:** 25 November 2026  
**Branch:** `feature/telegram-file-transfer`  
**Fix commit/package made available:** `d35b770b357c3d81660951be2ff533976d591e06`

## Owner-reported result

The owner reports that text-only Telegram input now succeeds and Ryze can read a provided file and return feedback. The attached sanitized conversation excerpt shows a request to read/explain `README.md` followed by a response summarizing its contents. Record this as **PASS (owner-reported)** for text-only ingress and file-reading feedback.

The corrected Windows update ZIP for `d35b770` had been provided shortly before the reported test, but the owner did not explicitly echo the installed commit or ZIP checksum. Therefore, attribution to that exact package is **probable by chronology, not independently confirmed**. Do not represent this as an independently verified Windows test.

The conversation excerpt also shows a request to return a file and a text confirmation. This is not sufficient by itself to verify the returned attachment's bytes or destination. Existing owner-reported file receipt/send evidence remains separately labeled; confirm the exact build and actual same-chat file attachment when convenient.

## Source fix and workspace evidence

The regression was traced to text-only worker requests serializing `fileId: null`, while the API schema accepts an omitted field or a valid file ID and rejects `null` with `400 INVALID_INBOUND`. Commit `d35b770` omits `fileId` only when no attachment exists; captioned-file requests retain their real file ID. File upload, receipt, delivery, download, and acknowledgement implementation was not changed.

Workspace verification for the fix: `pnpm run check` PASS; `pnpm test` PASS (51 tests across 18 files); `pnpm run worker:test` PASS (9 tests); `pnpm run build:local` PASS with the existing non-fatal large-chunk warning; `git diff --check` PASS. The regression tests verify absent-vs-real `fileId` worker payloads, API acceptance of the current text-only shape, rejection of the former `null` shape, and continued captioned/file-transfer behavior.

## Stage disposition

Stage 1 remains **PARTIAL**. This report closes the text-only ingress failure as owner-reported PASS, and records file-reading feedback as owner-reported PASS. It does not close the remaining Stage 1 acceptance criteria. In particular, exact package identity, target-Windows verification of actual file return, generated-note delivery, remaining operational/failure/rollback evidence, and file retention/deletion policy remain separate items. The 24-hour lookup window does not delete stored files. Preserve the 24 November 18:33 self-test unchanged; its earlier `NOT_RUN`/`WARN` entries remain that test's historical results.
