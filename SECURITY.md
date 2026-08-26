# PROJECT RYZE Sandbox — Safety Boundary

This hosted version is a **testing sandbox**, not an autonomous execution environment. All persisted records are scoped to the authenticated user through server-side database queries and foreign-key ownership relationships.

| Capability | Hosted sandbox behavior |
|---|---|
| Ryze → Nerd workflow | Supported through a deterministic, allowlisted demo engine with structured logs and bounded retry simulation. |
| Arbitrary shell or Python execution | Unavailable. Requests mentioning shell, terminal, sudo, or command execution are blocked and recorded as failed safety events. |
| External LLM providers | Disabled. The interface only stores safe provider display profiles; it does not accept credentials or make provider calls. |
| Email and Telegram | Disabled. No delivery credentials, sessions, or outbound actions are implemented in this release. |
| File uploads | Validated by type and size, stored as protected object-storage bytes, and represented in the database by metadata only. |
| Data export | Includes portable metadata and settings without credentials or file bytes. |

The system accepts only TXT, Markdown, CSV, JSON, PDF, DOCX, PNG, and JPEG uploads up to 5 MB. Uploaded files are not executed, parsed as code, or passed to external services.
