# Local Windows Installer — Progress Checklist

This tracks the manual-install package for the target Windows computer. The owner reports successful startup after repairing ACLs on existing SQLite files, has signed in, and has completed a real chat request through OpenCode and the local FreeLLMAPI gateway. Stage 1 remains incomplete.

- [x] Replace the hosted MySQL runtime with embedded SQLite and a separate local migration directory.
- [x] Replace hosted object storage with local filesystem writes and owner-checked download routes.
- [x] Add a single-owner scrypt password login, localhost-only binding, Host/Origin checks, and failed-login throttling.
- [x] Add PowerShell install/start/stop/backup wrappers; exclude secrets and user data from the source package.
- [x] Keep OpenCode text chat separate from safe local demo actions; leave OpenCode tools and Telegram outbound disabled pending authorization controls.
- [x] Pass locked dependency install, TypeScript check, 32 application tests, 4 worker safety tests, and standalone production build in the sandbox.
- [x] Smoke-test production health/login/SQLite owner bootstrap with disposable data and remove the test data afterwards.
- [x] Write the Windows install, data location, backup/restore, and limitations guide.
- [x] Create and inspect the source-install ZIP; verify it contains no secrets, Git history, `node_modules`, `dist`, or user data.
- [x] Install the latest package on the target Windows computer and reach the Ryze ready state. Existing SQLite database/WAL/SHM files had no effective ACL entries; resetting their ACLs fixed startup without deleting their contents.
- [x] Sign in on the target Windows computer and complete a real, harmless OpenCode → FreeLLMAPI text-chat request. Ryze recorded a completed task and the model reply. The route/provider and exact model ID were not recorded; the answer also missed the requested two-line bullet formatting in two tries.
- [ ] Verify repeat start/stop, first backup and restore, and ACL inheritance for newly created files on the target Windows computer.
- [ ] Capture the FreeLLMAPI routed-provider/model metadata and gateway version if available; exercise safe error cases and text-format reliability.
- [ ] Before any tools or Telegram actions are enabled, define the bounded action catalog and implement/test server-side permissions, owner approval, pause/stop, suppression, and duplicate-send protections.

Plan: [`docs/stage-1-task-breakdown.md`](docs/stage-1-task-breakdown.md). Stage 1 design baseline: [`docs/origin-blueprint.md`](docs/origin-blueprint.md).
