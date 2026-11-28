# MemPalace Adapter and Revision Assessment

**Date:** 28 November 2026
**Ryze branch:** `feature/mempalace-production-gate`
**Status:** adapter/outbox implemented; pinned MemPalace runtime assessed in disposable Linux environment; not installed or enabled in Ryze

## Pinned revision

The selected MemPalace revision is the official `v3.12.0` tag at commit `4df7b830ff1398332d4118884520a24f1aab9cc1`, resolved with `git ls-remote` against `https://github.com/MemPalace/mempalace.git`. It was installed only in disposable directory `/tmp/ryze-mempalace-runtime-20261128/venv` with Python 3.12.3 on the ARM64 Linux sandbox. The installed package reports `MemPalace 3.12.0`; ChromaDB reports `1.5.9`. No Ryze package dependency, live router, or production data was changed.

The official release is dated 12 November 2026 and states that v3.12.0 requires Python 3.10 or newer, migrates hallway data to SQLite on first hallway write, preserves source text/bytes during mining, and includes recoverable write behavior. Those characteristics are relevant to a future isolated assessment, but they are not compatibility evidence for Ryze. [1]

The upstream package metadata confirms version `3.12.0`, MIT licensing, Python `>=3.10`, CLI and MCP entry points, and core dependencies including ChromaDB, NumPy, tokenizers, and Hugging Face Hub. The default ChromaDB/embedding stack therefore remains outside the Node/TypeScript Ryze runtime until a separate isolated installation is approved. [2] The official repository also describes MemPalace as local-first, verbatim, structured into wings/rooms/drawers, with pluggable retrieval backends and optional skills/hooks. [3]

## Ryze implementation boundary

`server/memPalaceMemoryProvider.ts` implements the provider-neutral adapter. It accepts an injected `MemPalaceBridge`; it does not import a MemPalace package or spawn a process. SQLite remains canonical for writes, retrieval, updates, archiving, deletion, outcomes, and reflection. A MemPalace drawer is only a projection and retains the Ryze memory ID, owner, category, type, version, branch, sensitivity, source system, source reference, and lineage metadata.

`drizzle/sqlite/0006_mempalace_projection_outbox.sql` adds `ryze_memory_projection_outbox`. The durable queue stores an owner-scoped operation, deterministic projection key, sanitized serialized drawer payload, retry count, status, timestamps, and bounded error text. The unique `(userId, projectionKey)` constraint makes enqueue replay-safe. Interrupted `in_flight` work is returned to `pending` on recovery. Replay stops after the first provider failure, preserving later work for a later retry rather than hammering an unavailable provider.

The adapter does not use derived provider search unless both an injected bridge and `searchDerivedCandidates: true` are supplied. Even then, every result is rehydrated through SQLite and rejected unless owner, category/type, canonical existence, version, and lifecycle checks pass. The live routers still use `sqliteMemoryProvider`, so this work has not enabled MemPalace in Ryze.

Automatic memory formation, broad MCP/skill writes, cross-agent sharing, and SQLite replacement remain disabled. No private production data, credentials, Telegram sessions, databases, or secrets were used.

## Validation performed in the Linux sandbox

The focused tests passed:

- `server/memPalaceMemoryProvider.test.ts`: 7 tests.
- `server/mempalaceProjectionOutbox.test.ts`: 3 tests.
- Covered disabled derived search, SQLite fallback, durable queuing while the bridge is offline, projection identity, owner/version filtering, outbox deduplication, simulated restart recovery, deletion reconciliation, and provider failure followed by successful recovery.

Repository validation passed:

- `pnpm run check` — PASS.
- `pnpm test` — PASS, 87 tests across 26 files.
- `pnpm run build:local` — PASS; the existing non-fatal large-chunk warning remains.
- `git diff --check` — PASS.
- Migration audit — PASS; SQLite journal contains 7 entries and `0006_mempalace_projection_outbox.sql` is present.

The synthetic outbox resource measurement processed 1,000 small drawer records using the SQLite outbox and a no-op bridge. It recorded approximately 339.33 ms for enqueue and 906.84 ms for replay, with a process RSS increase of about 69.3 MB and heap-used increase of about 5.9 MB. This measures Ryze's TypeScript/SQLite outbox path only. It does not measure MemPalace, ChromaDB, embedding-model memory, Python, MCP, or Windows behavior.

## Disposable MemPalace CLI/MCP assessment

All records in this section were synthetic fixture documents created under `/tmp/mempalace-synthetic-20261128`; no private production data, credentials, databases, or sessions were used.

- `mempalace init --yes --auto-mine --no-llm --embedding-model minilm --direct` — PASS. The palace reported 2 drawers in wing `source`, room `general`. Init elapsed approximately 9.4 seconds; the Python timing wrapper observed a child peak RSS delta of approximately 278,944 KB (about 272 MB). This is a Linux synthetic measurement, not a Windows capacity claim.
- `mempalace status` — PASS. The synthetic palace was readable and reported ChromaDB storage, CPU embedding, and SQLite integrity OK.
- `mempalace search` — PASS. Both synthetic fixture documents were returned.
- `mempalace export` — PASS. Export produced `index.md` and `source/general.md` under `/tmp/mempalace-synthetic-20261128/export`.
- Read-only `mempalace-mcp --palace ... --read-only` — PASS. JSON-RPC initialize identified server `mempalace` version `3.12.0`; `tools/list` exposed 25 read-only tools; real `mempalace_status` and `mempalace_search` calls succeeded. No write-capable MCP path was enabled.

A second long-lived MCP run handled the same real status/search calls and exited cleanly with code 0. Over 50 samples during a five-second post-request steady-state interval, the server process RSS was 262,272–265,368 KB (average 263,820 KB, approximately 256.1–259.1 MiB). The observed server PID was 45841. This is process RSS for the measured Python MCP server only; it excludes a Windows service wrapper and is not a production sizing guarantee.

## Export, restore, and Windows disposition

The existing owner-reported disposable Windows evidence remains bounded and unchanged: portable JSON export excluded secrets/session data and retained memory/identity metadata; valid restore, corruption rejection, rollback, SQLite integrity, schema validation, startup, and focused Memory Vault checks passed for the tested synthetic profile. That evidence predates this outbox migration and does not validate a MemPalace projection restore.

The current source-only package includes the real bridge and replay runner. It was rebuilt with SHA-256 `147263CBD1D449FD2C215B7FBA5F9A41B282FAB5D89CBDC40C7A7EBEB57B62DC`; required files and exclusion checks passed. It excludes runtime dependencies, databases, logs, sessions, backups, credentials, and Git metadata.

The package was transferred to the authorized Windows workspace with checksum verification and extracted into an isolated test folder. The runner stopped before installing MemPalace because the profile has no installed Python runtime: `py.exe -3.12` returned `No installed Python found!`; `winget`, Chocolatey, and Scoop were unavailable. No MemPalace MCP process started, no live Ryze database was opened, and no Windows MemPalace PASS or provider failure is claimed. Install Python 3.12.x on the disposable synthetic profile, verify `py -3.12 --version`, and rerun `scripts/windows/Run-MemPalace-Replay-Test.ps1`.

## Decision and remaining gates

The pinned revision is suitable for an isolated proof of concept because it exposes CLI/MCP interfaces and local storage, but Ryze must treat the Python/ChromaDB process as an external, failure-prone projection service. The Linux install and synthetic CLI/MCP proof passed, while target-Windows migration/export/restore/restart/provider-unavailable acceptance remains blocked in this environment. The next enablement gate requires a disposable installation of exactly the pinned revision, a bridge contract test using sanitized synthetic records, rebuild from SQLite, replay after process restart, deletion and version reconciliation, export/restore verification, and target-Windows acceptance. Until those gates pass, the adapter remains disabled and SQLite remains authoritative.

## References

[1]: https://github.com/MemPalace/mempalace/releases/tag/v3.12.0 "MemPalace v3.12.0 release notes"
[2]: https://raw.githubusercontent.com/MemPalace/mempalace/v3.12.0/pyproject.toml "MemPalace v3.12.0 package metadata"
[3]: https://github.com/MemPalace/mempalace "MemPalace official repository"
[4]: https://raw.githubusercontent.com/MemPalace/mempalace/v3.12.0/LICENSE "MemPalace v3.12.0 MIT license"
