# RyzeFramework

RyzeFramework is a single-owner local starter for the target Windows computer. The local build uses an embedded SQLite database, stores file bytes in the user's local application-data folder, and binds the server to `127.0.0.1`. It does not require Docker or a cloud database.

The four-stage source design is in [`docs/origin-blueprint.md`](docs/origin-blueprint.md). The current readiness assessment and ordered Stage 1 checklist are in [`docs/blueprint-implementation.md`](docs/blueprint-implementation.md) and [`docs/stage-1-task-breakdown.md`](docs/stage-1-task-breakdown.md). The operating procedures and stage-by-stage verification guide are in [`docs/ryze-playbook.md`](docs/ryze-playbook.md).

## Windows installation

See [`docs/windows-installation.md`](docs/windows-installation.md). For a new setup, extract the ZIP and run `Install-Ryze.cmd`. To update an existing installation without overwriting its `.env` or local data, extract the new ZIP to a temporary folder and run `Update-Ryze.cmd` there after stopping Ryze and taking a backup. Then double-click `Start-Ryze.cmd` in the installed folder. The launcher leaves a diagnostic console open and opens `http://127.0.0.1:3777/` when startup succeeds. Stop background services with `Stop-Ryze.cmd`. The installer requires 64-bit Windows 10 or newer, Node.js 22 or 24 LTS, and internet access while it installs locked packages. It prompts for a strong owner password and stores a salted scrypt hash plus a random signing secret.

Application data is kept outside the program folder under `%LOCALAPPDATA%\RyzeFramework`. Run `Stop-Ryze.cmd` before backing up. A backup includes local data and configuration, which may include your FreeLLMAPI key; keep it private.

## Current capability boundary

- **Safe local demo:** allowlisted memory, recall, metadata-inspection, generated-Markdown, and retry-demo workflows are available using local storage.
- **OpenCode + FreeLLMAPI text chat:** the local OpenCode sidecar and Ryze adapter are implemented. The owner must enter the actual OpenAI-compatible gateway HTTPS base URL (or a loopback URL), exact model ID, and unified API key using `Configure-FreeLLMAPI.cmd`. This ZIP contains no gateway URL or credentials. The dashboard reports both service statuses. Chat prompts leave the computer for the configured gateway. OpenCode tool permissions are denied, so chat cannot run shell commands, access local files, or send messages.
- **Not enabled:** Telegram account setup, inbound authorization, outbound replies, and owner approval for external actions remain incomplete. The ZIP does not configure a Telegram session. A demo result is not a live model answer or live Telegram result.

The FreeLLMAPI key is stored in the protected local `.env`; it is not encrypted by Ryze and may be included in a user-created backup. Keep backups private.

## Development

Use Node.js 22 or 24 and pnpm 10.18.0:

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
- `server/`: local auth, SQLite persistence, local file storage, safe demo execution, OpenCode chat adapter, and worker API.
- `worker/`: optional Python/Telethon worker. The installer does not provision its credentials or session.
- `drizzle/`: SQLite schema/migrations plus retained historical MySQL migrations.
- `scripts/windows/`: installer, launcher, stop, backup, FreeLLMAPI configuration, and local config helpers.
- `docs/`: source blueprint, stage status, and Windows install/backup guide.
