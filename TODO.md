# Local Windows Installer — Progress Checklist

This tracks the manual-install package for the HP Windows 10 laptop. The user has installed the latest package and reports that dashboard startup now succeeds after repairing existing SQLite file permissions; remaining target-device checks are tracked separately.

- [x] Replace the hosted MySQL runtime with embedded SQLite and a separate local migration directory.
- [x] Replace hosted object storage with local filesystem writes and owner-checked download routes.
- [x] Add a single-owner scrypt password login, localhost-only binding, Host/Origin checks, and failed-login throttling.
- [x] Add PowerShell install/start/stop/backup wrappers; exclude secrets and user data from the source package.
- [x] Keep OpenCode/FreeLLMAPI and Telegram outbound unavailable; document that the ZIP is not a completed Stage 1 agent.
- [x] Pass locked dependency install, TypeScript check, 32 application tests, 4 worker safety tests, and standalone production build in the sandbox.
- [x] Smoke-test production health/login/SQLite owner bootstrap with disposable data and remove the test data afterwards.
- [x] Write the Windows install, data location, backup/restore, and limitations guide.
- [x] Create and inspect the final source-install ZIP; verify it contains no secrets, Git history, `node_modules`, `dist`, or user data.
- [x] Install the latest package on the HP laptop and reach the Ryze ready state. Startup initially failed because existing database/WAL/SHM files had no effective ACL entries; resetting their ACLs fixed startup, and the user reports success without deleting database contents.
- [ ] Verify owner sign-in, repeat start/stop, backup, and restore on the HP laptop. Confirm ACL inheritance for newly created logs and database files. The installer accepts an owner password of at least 6 characters; a longer mixed passphrase is safer than a six-digit numeric PIN.
- [ ] After local verification, decide the OpenCode/FreeLLMAPI endpoint/model and implement Telegram approval, pause/stop, and suppression checks before enabling any external send.

Plan: [`plan.md`](plan.md). Stage 1 design baseline: [`docs/origin-blueprint.md`](docs/origin-blueprint.md).
