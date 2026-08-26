# PROJECT RYZE Sandbox — Laptop Localization Guide

The hosted sandbox is intentionally modeled as portable data rather than as a browser-only prototype. Use the **Export portable JSON** control from the dashboard before moving to a laptop. The export contains sessions, tasks, structured logs, core and evolving memory, skill XP, safe sandbox settings, and file metadata.

## What moves locally

| Hosted record | Local equivalent | Migration approach |
|---|---|---|
| Sessions, tasks, logs, memory, skills | JSON files or a local SQLite/PostgreSQL database | Import the corresponding arrays from the export into the chosen local store. |
| File manifest | `files/` directory plus metadata file | Download each file referenced by the manifest, then preserve its original name, MIME type, category, and task relationship. |
| Provider display settings | `config.json` or environment-specific configuration | Import the model/profile names only. Keep all provider flags disabled until the laptop configuration is reviewed. |
| Hosted auth identity | Local user profile or single-user mode | Do not copy hosted session cookies or authentication data. Create a new local identity boundary. |

## Recommended local path

Install the original Python/Streamlit recreation or a Node-based local service, then add a small importer that reads the portable JSON. Start in the same safe mode as the hosted sandbox: no shell execution, no external LLM calls, no email, and no Telegram. Enable each capability only after its local secret store, permissions, and audit behavior have been reviewed.

> The export deliberately contains **no secret values and no file bytes**. Reconfigure any API keys, Telegram session, Gmail OAuth data, and local-model endpoint on the laptop rather than moving hosted credentials.

## Data portability contract

The JSON export is versioned as `ryze-sandbox-v1`. A local importer should reject unknown major versions, validate record ownership as single-user data, and restore timestamps as UTC values. Retain the file manifest even if files are restored later so generated outputs remain traceable to their originating task.
