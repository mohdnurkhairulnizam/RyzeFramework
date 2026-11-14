# RyzeFramework

RyzeFramework is a secure hosted foundation for a personal, goal-driven AI agent. It currently provides an authenticated Ryze → Nerd sandbox with user-scoped sessions, controlled task routing, persistent memory, file metadata, bounded retries, portable export and verification coverage.

The supplied four-stage technical design baseline is preserved in [`docs/origin-blueprint.md`](docs/origin-blueprint.md). The implementation status and deliberate deferrals are tracked in [`docs/blueprint-implementation.md`](docs/blueprint-implementation.md).

## Safety boundary

The current runtime does not enable arbitrary shell execution, credential handling, external LLM calls, email, Telegram delivery or autonomous production changes. Unsupported or risky instructions are recorded as blocked tasks. Provider credentials and other secrets must be configured locally and are excluded from portable exports.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Database migrations use the existing Drizzle workflow:

```bash
pnpm db:push
```

The application expects the host environment to provide authentication, database and managed storage variables. Copy `.env.example` as a reference only; never commit a populated `.env` file.

## Project layout

- `client/` — authenticated dashboard UI
- `server/` — routers, persistence, storage and safe execution workflow
- `drizzle/` — database schema and migrations
- `docs/` — blueprint source, implementation map and verification notes
- `shared/` — shared constants and types
