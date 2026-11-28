# Prompt for the Next AI — Continue RyzeFramework to Completion

You are continuing the `RyzeFramework` project owned by `mohdnurkhairulnizam`.

## Clone and select the correct branch

The repository is:

```text
https://github.com/mohdnurkhairulnizam/RyzeFramework.git
```

The active implementation branch is `feature/telegram-file-transfer`. Do not assume `main` contains the current implementation. Clone and check out the branch with:

```bash
git clone --branch feature/telegram-file-transfer --single-branch https://github.com/mohdnurkhairulnizam/RyzeFramework.git
cd RyzeFramework
git status --short --branch
git log --oneline --decorate -10
```

If this environment provides the authorized GitHub connector, prefer its authenticated CLI entry point or authenticated `gh` CLI. Do not ask the owner for a token, print tokens, run `gh auth login`, force-push, reset, clean, or overwrite uncommitted changes. Fetch before making decisions:

```bash
git fetch origin --prune
git branch -vv
git log --oneline --decorate --graph --all -20
```

## Read these documents first

1. `docs/current-stage-handoff.md`
2. `docs/project-memory.md`
3. `docs/stage-2-implementation-plan.md`
4. `docs/memory-identity-contract.md`
5. `docs/blueprint-implementation.md`
6. `docs/origin-blueprint.md`
7. `docs/ryze-playbook.md`
8. `docs/evidence/mempalace-adapter-assessment-2026-11-28.md`
9. This file, `docs/next-ai-continuation-prompt.md`

The documents distinguish sandbox evidence, owner-reported disposable Windows evidence, and unrun tests. Preserve those distinctions in every update.

## Current architecture and non-negotiable boundaries

- SQLite is the operational and authoritative memory store.
- MemPalace is an optional, rebuildable projection behind the provider-neutral `MemoryProvider` boundary.
- The live routers remain SQLite-backed; MemPalace is not enabled in normal production/live behavior.
- Automatic memory formation, broad MCP/skill writes, cross-agent memory sharing, and SQLite replacement remain disabled.
- Do not use private production data, real databases, secrets, Telegram sessions, or real backups for MemPalace testing.
- Preserve owner scoping, provenance, versioning, restricted retrieval, conflict confirmation, rollback, export/restore, and fail-closed behavior.
- Do not bulk-install ECC or modify live Ryze skill/intent instructions as a shortcut.
- Do not claim Stage 1 or Stage 2 completion merely because this branch is pushed or merged.

## Current implementation checkpoint

Implemented and tested in the branch:

- Provider-neutral `MemoryProvider` boundary and SQLite-first `server/memPalaceMemoryProvider.ts` adapter.
- Durable SQLite projection outbox in `server/mempalaceProjectionOutbox.ts` and migration `drizzle/sqlite/0006_mempalace_projection_outbox.sql`.
- Pending/in-flight/applied/failed states, deduplication, retry tracking, restart recovery, deletion reconciliation, and fail-closed replay.
- Opt-in stdio JSON-RPC bridge in `server/mempalaceMcpBridge.ts`.
- Synthetic replay harness in `scripts/mempalace-replay-smoke.ts`.
- Windows runner in `scripts/windows/Run-MemPalace-Replay-Test.ps1`.
- Opt-in Windows dependency setup in `scripts/windows/Install-MemPalaceRuntime.ps1`; normal install/update remains SQLite-only. Use `Install-Ryze.cmd /InstallMemPalaceRuntime` or `Update-Ryze.cmd /InstallMemPalaceRuntime` to check/install Python 3.12 and create the isolated pinned runtime.
- Pinned MemPalace target: tag `v3.12.0`, commit `4df7b830ff1398332d4118884520a24f1aab9cc1`.

The Linux sandbox real MCP replay smoke test passed for synthetic data:

```text
provider_unavailable=PASS
projection_replay_after_restart=PASS
projection_search_rehydration=PASS
projection_deletion=PASS
overall=PASS
```

The real Windows run has **not passed yet**. The corrected source-only package was transferred and extracted successfully, but the Windows profile has no installed Python runtime. `py.exe -3.12` returned `No installed Python found!`; `winget`, Chocolatey, and Scoop were unavailable. Therefore the Windows MemPalace MCP process was never started and no Windows MemPalace PASS may be claimed.

## Immediate next task

On the authorized disposable Windows synthetic profile:

1. From the extracted package, run `Install-Ryze.cmd /InstallMemPalaceRuntime` or, for an existing installation, run `Update-Ryze.cmd /InstallMemPalaceRuntime` after stopping Ryze. The switch checks `py.exe -3.12`, uses user-scoped `winget` for `Python.Python.3.12` when available, and fails with manual-install instructions when no supported package manager is present. It never enables live MemPalace routers.
2. Confirm:

   ```powershell
   py -3.12 --version
   ```

3. Use the current source-only package or a package rebuilt from the exact pushed commit. Verify the ZIP SHA-256 against the handoff/project-memory record before extraction.
4. Extract to a new temporary folder; do not run the package over the installed Ryze directory.
5. Run:

   ```powershell
   $root = Join-Path (Get-Location) 'Windows-MemPalace-Replay-20261128'
   & powershell.exe -NoProfile -ExecutionPolicy Bypass `
     -File (Join-Path $root 'scripts\windows\Run-MemPalace-Replay-Test.ps1') `
     -RuntimeRoot (Join-Path $env:TEMP 'ryze-mempalace-windows-replay-20261128')
   ```

6. Record only sanitized PASS/FAIL results for provider-unavailable behavior, MCP restart/projection replay, search rehydration, deletion reconciliation, and any non-sensitive error text.
7. Confirm the test did not use the live Ryze database, live router, private records, secrets, Telegram sessions, or real backups.
8. If Python installation or the runtime fails, record the prerequisite failure and do not reinterpret it as a MemPalace provider failure.

After Windows testing, update the handoff, project memory, and assessment evidence with the exact result boundary. Then rerun `pnpm run check`, `pnpm test`, `pnpm run build:local`, and `git diff --check` on the exact pushed head.

## Git and delivery rules

- Work on `feature/telegram-file-transfer` unless the owner explicitly requests another branch.
- Never force-push or merge into `main` without explicit review and approval.
- Keep `.env*` credentials, databases, backups, logs, Telegram sessions, `node_modules`, `dist`, and ZIP artifacts out of Git.
- Before committing, inspect `git status`, `git diff --stat`, `git diff --check`, and the complete staged diff.
- Use a descriptive commit message and report its full hash.
- Push only with the authorized GitHub connector or authenticated `gh`/Git operation.
- Report exact source branch, target branch, commit hash, validation results, skipped checks, and remaining risks.
