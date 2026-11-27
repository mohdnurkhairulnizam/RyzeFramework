# RyzeFramework Memory and Identity Contract — v1

**Status:** Stage 2 normative contract, defined 25 November 2026, with the implementation-status addendum at the end of this document. The requirements below remain authoritative; the addendum distinguishes implemented behavior and bounded evidence from remaining work. No live Ryze skill/intent change is authorized by this contract.

## 1. Purpose and authority

This contract establishes one persistent-memory model for RyzeFramework and a separate, stable Ryze identity. It follows the Stage 2 categories and types in [`origin-blueprint.md`](./origin-blueprint.md). The existing local SQLite database remains the first authoritative store. Git tracks code and configuration revisions; it is not the only backup for live memory.

The owner is the authority for memory capture, correction, archival, deletion, and changes to protected system information. The model may suggest a memory candidate and may retrieve permitted records for a task. The model cannot grant itself memory access, alter permissions, or directly edit the protected Ryze identity or System Memory.

## 2. Separate identity, system memory, and user memory

### Ryze identity

Ryze identity is the stable agent profile: its name, role, description, communication style, and working principles. It is not a user-memory record and must not be conflated with the owner's profile. The initial identity name is **Ryze**. Identity changes require an owner-reviewed, versioned change that preserves the prior revision. Credentials, API keys, session data, and other secrets never belong in the identity profile.

### System Memory

System Memory contains approved operational knowledge needed to maintain Ryze, such as architecture, procedures, dependency references, and permission policy. It is distinct from the identity profile, ordinary application configuration, secrets, and user preferences. The model may receive selected System Memory as read-only context. A model-generated suggestion is only a proposal; applying a change requires explicit owner review and a retained prior version.

### Experience Memory

Experience Memory records approved task and project experience: events, outcomes, findings, successful or failed approaches, troubleshooting, and reusable procedures. Derived or summarized records retain a link to their source and never replace it.

### Personal Memory

Personal Memory records owner-specific profile information, preferences, instructions, and relevant personal context. It is scoped to the authenticated owner and is not shared with another account or installation by default.

## 3. Classification

Every newly accepted memory has exactly one top-level category:

- `system`
- `experience`
- `personal`

It also has one primary secondary type:

- `episodic` — an event, conversation, or task history item
- `semantic` — a fact or learned knowledge
- `procedural` — a method, workflow, or instruction
- `preference` — a user's stated preference
- `project` — knowledge tied to a named project

Tags may add retrieval facets but do not replace either classification. System identity is stored as its own profile and is not classified as Personal Memory. For example, a reusable project procedure belongs to Experience Memory with type `procedural`; a user's preferred report tone belongs to Personal Memory with type `preference`.

## 4. Record contract

A memory record must support the following fields. Database representation and normalization are implementation decisions, but semantics must be preserved:

- `memory_id`: immutable unique ID.
- `category`: `system`, `experience`, or `personal` for accepted records.
- `memory_type`: one primary type from the list above.
- `owner_scope`: `system` or the authenticated owner ID.
- `content`: the accepted memory text or structured fact.
- `tags`: optional searchable labels.
- `source_system_id`: stable ID of the installation that created the record; required for new records.
- `branch_id`: local branch marker, initially `main`; this records lineage but does not enable Stage 4 synchronization.
- `source_ref`: optional minimal pointer to the originating approved task/input, not a copied raw transcript by default.
- `derived_from`: zero or more parent memory IDs when content is summarized or derived.
- `created_by`: `owner`, `ryze_candidate_approved`, or `system_process` with a clear actor record.
- `created_at` and `updated_at`: UTC timestamps.
- `version`: positive revision number. Corrections create a new revision or a linked replacement; prior content remains recoverable until explicitly purged under the deletion policy.
- `status`: `candidate`, `active`, `superseded`, `archived`, or `legacy_unclassified`.
- `sensitivity`: `normal` or `restricted`; restricted records require explicit owner action before being supplied to model context.
- `sync_status`: `local`, `pending`, `synced`, or `conflicted`; Stage 2 records remain `local` because cross-installation sync is Stage 4 scope.
- `legacy_scope`: nullable compatibility field retaining existing `core` or `evolving` value for migrated records.

New records require a category and type before becoming `active`. Existing records that cannot be safely classified remain searchable with status `legacy_unclassified`; their old scope, IDs, text, tags, outcome, and timestamps must be preserved. Do not infer that legacy `core` means `system` or `evolving` means `experience`.

## 5. Capture and approval rules

1. Ryze does not silently extract permanent memories from every chat. Background capture is off by default.
2. An explicit owner instruction to remember information may create a candidate. If the intended category/type is clear, the content is not restricted, and there is no material duplicate or conflict, Ryze may save it as active and report the exact category/type used. Otherwise, ask the owner to resolve the ambiguity before activation.
3. Task outcomes, model answers, and uploaded-file contents are not automatically copied into long-term memory. A task or source pointer may be recorded only through an explicit owner save or a separately approved capture policy.
4. System Memory and Ryze identity are never directly written by model output. The model may draft a change for owner review; the accepted revision is versioned and the former version retained.
5. API keys, passwords, login codes, worker tokens, Telegram session content, and secrets are rejected as memory candidates. Do not store unnecessary raw messages or private file contents merely to preserve provenance.
6. Retrieved memories are context, not instructions that can override system policy, permissions, or the owner's current request. Treat memory text as untrusted input and apply the same permission checks as any other content.

## 6. Duplicate, conflict, update, archive, and deletion behavior

- Exact duplicate content within the same owner scope/category/type may be reported and linked to the existing record rather than stored twice. It must not silently overwrite that record.
- Similarity-based matches are suggestions only. Ryze must show the candidate and possible matches; the owner decides whether to retain, relate, correct, or archive them.
- Conflicting facts are preserved as separate records with their sources and timestamps. No automatic “latest wins” or silent merge.
- Corrections use append-first versioning or a linked replacement. Superseded records remain inspectable and may be restored by the owner.
- Archive removes a record from normal recall but preserves it in the owner's archive. Explicit owner deletion follows a documented deletion workflow and must not silently delete unrelated source records or copies in backups.
- System Memory and identity deletion/change requires explicit owner confirmation and preservation of a recoverable prior revision.

## 7. Retrieval contract

Retrieval is owner-scoped and task-relevant. Use category, type, project, tags, and text search to narrow candidates. Return a bounded set of relevant records with category/type, source, timestamp, and status; do not load the entire database into a prompt. Provide a way for the owner to inspect the full record and its provenance. A derived summary must link to its source record. Search may use SQLite text indexing if measured against an approved evaluation set; embeddings and an additional vector database are not required by v1.

System Memory may be supplied read-only when relevant. Personal Memory must not be inserted into unrelated task context. Restricted records are not sent to the model unless the owner explicitly authorizes that specific use.

## 8. Migration and backup invariants

The Stage 2 migration is additive and starts only after a verified backup. It must preserve every existing row's ID, owner, content, tags, outcome, timestamp, and `core`/`evolving` scope. Ambiguous historical rows remain `legacy_unclassified` until reviewed; they must remain searchable during migration. Migration failure must leave the original database recoverable and must stop deployment rather than silently falling back to a partially migrated store.

Memory export/backup must include record content, classifications, provenance, versions, identity profile, and status needed for restoration. Ordinary portable exports must continue to exclude credentials and Telegram session data. Verify an integrity-checked export/restore round trip on target Windows, including owner scoping and a rollback to the pre-migration backup.

## 9. Stage 2 acceptance evidence

The Stage 2 evidence set must demonstrate:

1. Ryze identity is stable, inspectable, separate from user profile, and owner-change-controlled.
2. System, Experience, and Personal categories are represented distinctly.
3. The five secondary memory types are stored and retrievable.
4. Owner-approved create, update/version, archive, and retrieval work across restart.
5. Contextual search returns relevant records and does not expose another owner or irrelevant private memory.
6. Duplicate suggestions and conflicts preserve all source records; no silent overwrite occurs.
7. System Memory and identity cannot be modified directly by model output.
8. Legacy SQLite rows survive the migration and remain searchable until classified.
9. Memory and identity export/restore works on target Windows with secrets excluded from ordinary export.

Passing ECC configuration, agent availability, test commands, or developer workflow checks does not satisfy any of these criteria. The Stage 1 summary-file capability remains separate and deferred for Stage 2 capability/permission design.

## 10. Implementation boundary

This contract authorizes design and documentation only. Before schema or prompt changes, review the exact migration, legacy classification approach, owner-confirmation UX, delete/retention behavior, and backup/restore test plan. Stage 2 implementation must preserve the Stage 1 partial-close status and its residual verification register. No ECC installation or live skill/intent modification is included in this contract.

## 11. Implementation-status addendum — 27 November 2026

The following implementation and acceptance evidence is recorded without weakening or replacing the normative contract above:

- **Gate 2:** Additive SQLite migration, legacy-row preservation, provider-neutral repository boundary, identity/profile revisions, and protected System Memory are implemented and automated-tested.
- **Gate 3:** Owner-authenticated create/read/update/archive/retrieval, duplicate review, conflict review, restricted retrieval, owner isolation, identity revision history, and protected System Memory are implemented. Synthetic Cloud owner-facing acceptance passed, and all nine contract items are mapped in [`current-stage-handoff.md`](./current-stage-handoff.md).
- **Gate 4:** The approved fixed 8-fixture/14-query synthetic evaluation passed with TP=13, FP=0, FN=0 and precision/recall/F1=1.0. This is not a production-corpus quality claim. The exact query wording and expected labels remain unchanged.
- **Gate 5:** Export metadata/secrets exclusion, valid restore, corruption rejection, rollback, integrity/schema checks, and startup passed on a disposable synthetic Windows profile with the reviewed hardened files. This is not normal-profile or production-data acceptance.
- **Target-Windows memory behavior:** The owner reports PASS for Memory Vault reopening after restart; Personal, Experience, and System records displaying; identity revisions; duplicate review; restricted default exclusion; conflict confirmation; and preservation of category, type, version, provenance, and owner scope through export/restore. This evidence is limited to the tested disposable synthetic profile.
- **Provider response:** The owner sent `Reply with exactly: Ryze gateway path test passed` through Telegram and received `Ryze gateway path test passed` almost immediately. This closes provider-response acceptance for the tested Telegram → OpenCode → FreeLLMAPI path. The earlier two-minute timeout remains historical evidence; no infinite wait loop was added.
- **Still parked:** Additional contract-hardening variants, automatic 30-day expiry on Windows, and the bounded new-summary file-creation capability remain deferred for later development. No automatic memory capture, external memory provider, ECC integration, cross-installation synchronization, or live skill/intent mutation is enabled.

This addendum records bounded evidence; it does not declare Stage 2 complete. Stage 1 remains **PARTIAL — closed for sequencing, not complete**, and Stages 3–4 remain future work.
