# RyzeFramework bug and fix record — 29 November 2026

## Generated Markdown summary path

### Bug 1 — source/refusal response instead of a generated artifact

**Observed behavior:** The natural-language request to summarize `README.md` returned the source document or a refusal saying Ryze could not create or attach files.

**Cause:** The bounded intent path did not recognize the request as a permitted generated-summary operation and the model response was treated as the complete task result.

**Fix:** Added bounded `make` intent recognition and a narrow same-chat source-resolution rule. Only the latest inbound Telegram upload from the same authorized private chat is eligible as an implicit source. Generated files are excluded from implicit source lookup.

**Evidence:** Owner-reported PASS for the exact request `Make a short Markdown summary of README.md and send the summary as a file.`

### Bug 2 — SQLite uniqueness collision

**Observed behavior:** The source upload and the generated request could share one Telegram message ID, causing a uniqueness collision when the generated file was recorded.

**Cause:** The storage origin key assumed a Telegram message ID uniquely identified every artifact.

**Fix:** Generated artifacts use an internal origin key of the form `generated:<request-message-id>:<task-id>`. The source's Telegram message identity remains preserved as provenance but is no longer reused as the generated record's unique origin key.

### Bug 3 — duplicate full response plus attachment

**Observed behavior:** The model's full Markdown summary was sent as text and then the generated summary file was sent separately.

**Cause:** The model response was not separated into artifact content versus delivery confirmation.

**Fix:** The generation prompt requests summary-only Markdown content without file-creation/meta discussion. Telegram now sends a short confirmation and the distinct artifact, avoiding duplicate full-text delivery.

### Bug 4 — provenance was insufficient for review

**Observed behavior:** A generated artifact did not carry enough source/generator information for deterministic review.

**Fix:** Generated metadata now records source file ID, source content hash, and generator label. This supports audit and prevents silent source substitution.

## Windows/operator fixes recorded during acceptance

- PowerShell 5.1 may block `pnpm.ps1`; use `pnpm.cmd` without changing the machine execution policy.
- PowerShell variables such as `$manifest`, `$approvalPath`, `$mcp`, and `$palace` must be recreated in the same window before a run; a null manifest path caused `ENOENT` and a null hash.
- A MemPalace palace must exist before status checks. The disposable empty-source `init`/`mine` sequence created a valid zero-drawer palace; this was synthetic evidence only.
- PowerShell `&` failures were caused by an empty or stale executable variable, not by a provider result; verify `Test-Path $mempalace` before invocation.
- Inline PowerShell `node -e` quoting corrupted JavaScript strings. Writing a temporary `.cjs` file with a single-quoted here-string was the safe diagnostic method; the temporary script was deleted afterward.
- A Windows SQLite check must use the actual `%LOCALAPPDATA%\RyzeFramework\data\ryze.sqlite` path and `fileMustExist`/read-only access. No database was copied into this repository.

## Safety outcome

The fixes remain bounded. They do not grant shell access, arbitrary file creation, broad provider writes, automatic capture, autonomous skill mutation, or MemPalace authority. SQLite remains authoritative; MemPalace remains optional and rebuildable.
