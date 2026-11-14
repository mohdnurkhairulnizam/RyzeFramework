# RyzeFramework

RyzeFramework is a single-owner local starter for the HP Windows 10 laptop. The local build uses an embedded SQLite database, stores file bytes in the user's local application-data folder, and binds the server to `127.0.0.1`. It does not require Docker or a cloud database.

The four-stage source design is in [`docs/origin-blueprint.md`](docs/origin-blueprint.md). The current readiness assessment and ordered Stage 1 checklist are in [`docs/blueprint-implementation.md`](docs/blueprint-implementation.md) and [`docs/stage-1-task-breakdown.md`](docs/stage-1-task-breakdown.md).

## Windows installation

See [`docs/windows-installation.md`](docs/windows-installation.md). Extract the ZIP and run `Install-Ryze.cmd`; after setup, run `Start-Ryze.cmd` and open `http://127.0.0.1:3777/`. The installer requires 64-bit Windows 10 or newer, Node.js 22 or 24 LTS, and internet access while it installs locked packages. It prompts for a strong owner password and stores only a salted scrypt hash plus a random signing secret.

Application data is kept outside the program folder under `%LOCALAPPDATA%\RyzeFramework`. Run `Stop-Ryze.cmd` before backing up. The backup helper saves the database, local files, and protected config separately from Git.

## Current capability boundary

The dashboard currently runs a safe demonstration workflow. This ZIP does not configure OpenCode, FreeLLMAPI, or another external model provider; it does not authorize a Telegram session; and it does not enable outbound Telegram replies. Those capabilities remain off until their endpoints/credentials are supplied, the server-side approval boundary is completed, and the target laptop is tested. The ZIP contains no credentials or user data.

## Development

Use Node.js 22 or 24 and pnpm 10.4.1:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm worker:test
pnpm build:local
```

The SQLite schema and first-run migration live in `drizzle/schema.ts` and `drizzle/sqlite/`. The original MySQL migration history is retained as historical material but is not used by the local installer. The local file adapter is in `server/storage.ts`; file downloads require an authenticated session and a user-owned metadata row.

## Layout

- `client/`: Ryze dashboard and local owner sign-in.
- `server/`: local auth, SQLite persistence, local file storage, safe demo execution, and worker API.
- `worker/`: optional Python/Telethon worker. The installer does not provision its credentials or session.
- `drizzle/`: SQLite schema/migrations plus retained historical MySQL migrations.
- `scripts/windows/`: installer, launcher, stop, backup, and local config helpers.
- `docs/`: source blueprint, stage status, and Windows install/backup guide.
