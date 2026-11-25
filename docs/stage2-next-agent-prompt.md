# Prompt for the Next RyzeFramework Stage 2 Agent

You are continuing the user's **RyzeFramework Stage 2** work. Work in the existing GitHub repository; do not start a replacement project.

## Repository and starting point

Repository: `https://github.com/mohdnurkhairulnizam/RyzeFramework.git`

Working branch: `feature/telegram-file-transfer`

Latest known commit: `e43f09b` (`fix: add Stage 2 preflight and SQLite schema repair`). Fetch the latest remote branch before editing. If no working copy exists, clone the repository and check out `feature/telegram-file-transfer`. If a working copy exists, inspect `git status` first and preserve any user changes. Do not reset, clean, force-push, or overwrite work.

Read these project documents before planning: `docs/current-stage-handoff.md`, `docs/stage-2-implementation-plan.md`, `docs/memory-identity-contract.md`, `docs/stage2-one-click-test.md`, and `docs/windows-installation.md`. Also inspect the relevant code and tests before changing anything.

## Current implementation and last change

Gate 3 governance backend and dashboard UX, provider-neutral SQLite memory fallback, memory persistence tests, portable export, and a safe one-click synthetic Stage 2 preflight are implemented. Commit `e43f09b` adds the preflight, a SQLite Stage 2 schema compatibility repair, a regression test for that repair, and clearer installer guidance.

The SQLite error reported by the owner was `no such column: legacyScope`. The migration journal places `0005` after `0004` while assigning `0005` an earlier timestamp. Drizzle compares migration timestamps, so an existing database already at `0004` can skip `0005`. The compatibility repair runs after regular migrations, adds missing Stage 2 memory columns/tables idempotently, and backfills legacy metadata without replacing memory content. The synthetic regression test passes, including a populated pre-0005 database. This repair has **not yet been accepted on the owner's Windows installation**.

The owner supplied a Windows preflight log from Windows 10 (`win32 10.0.26300`) and Node `v24.19.0`: 17 tests passed across five files. That log predates inclusion of the migration compatibility regression in the one-click suite. The current preflight includes that test and should report 18 tests across six files. Ask for a fresh log from the latest code/package when appropriate. A preflight PASS means only synthetic checks passed; it is not installation, live-database, or acceptance evidence.

`Install-Ryze.cmd` is for a first-time installation and refuses to replace an existing `.env`. For an existing installation, use `Update-Ryze.cmd` from a fully extracted update ZIP. Before any Windows update, stop Ryze and preserve a private backup. Never advise deleting/reinstalling over the owner's live database or manually editing `__drizzle_migrations` or SQLite data. The installer/update path has not been executed on a Windows machine by this agent.

## Remaining Stage 2 work

1. Obtain a fresh one-click preflight log that includes the Stage 2 schema compatibility regression. Keep the synthetic run separate from the owner's live data.
2. Verify the latest package on a disposable Windows VM or separate Windows profile: update/install path as appropriate, start/stop/restart, database persistence, ACL behavior, and clean error handling. Do not infer target-Windows acceptance from Linux tests.
3. Close the backup/restore integrity gap: use disposable synthetic owner data to verify integrity checks, restore behavior, corruption rejection, and rollback to the preserved pre-restore copy. Keep private backups and any credentials local; never upload or paste them.
4. Complete the representative retrieval-relevance evaluation only with the owner's approval of the query set and its boundaries. Record the results separately from synthetic regression tests.
5. Update the handoff and implementation plan with evidence and mark acceptance only after the required evidence is actually collected.

## Validation and collaboration

For code changes, run the relevant focused tests plus `pnpm run check`, `pnpm test`, `pnpm worker:test`, `pnpm run build:local`, and `git diff --check` where feasible. Preserve the current branch and explain any checks that cannot run. Do not claim Windows acceptance without Windows evidence. Keep the owner informed about what is synthetic, what touches the installed app, and what remains unverified. Commit and push only when authorized, using the existing branch unless the owner directs otherwise.
