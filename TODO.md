# Local Windows Installer — Progress Checklist

This tracks the manual-install package for the HP Windows 10 laptop. Sandbox build/tests are not evidence that the physical laptop has been installed or verified.

- [x] Replace the hosted MySQL runtime with embedded SQLite and a separate local migration directory.
- [x] Replace hosted object storage with local filesystem writes and owner-checked download routes.
- [x] Add a single-owner scrypt password login, localhost-only binding, Host/Origin checks, and failed-login throttling.
- [x] Add PowerShell install/start/stop/backup wrappers; exclude secrets and user data from the source package.
- [x] Keep OpenCode/FreeLLMAPI and Telegram outbound unavailable; document that the ZIP is not a completed Stage 1 agent.
- [x] Pass locked dependency install, TypeScript check, 20 application tests, 4 worker safety tests, and standalone production build in the sandbox.
- [x] Smoke-test production health/login/SQLite owner bootstrap with disposable data and remove the test data afterwards.
- [x] Write the Windows install, data location, backup/restore, and limitations guide.
- [x] Create and inspect the final source-install ZIP; verify it contains no secrets, Git history, `node_modules`, `dist`, or user data.
- [ ] Complete manual fresh test install on the HP laptop. The user authorized deleting the prior Ryze install/config/data folders for a clean retry. The installer now accepts an owner password of at least 6 characters; verify password setup, browser sign-in, start/stop, ACLs, and backup/restore. Prefer a longer mixed passphrase because a six-digit numeric PIN is easier to guess.
- [ ] After local verification, decide the OpenCode/FreeLLMAPI endpoint/model and implement Telegram approval, pause/stop, and suppression checks before enabling any external send.

Plan: [`plan.md`](plan.md). Stage 1 design baseline: [`docs/origin-blueprint.md`](docs/origin-blueprint.md).
