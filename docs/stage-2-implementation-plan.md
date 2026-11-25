# Stage 2 — Identity and Advanced Memory: Implementation Plan

**Planning status:** The v1 memory and identity contract is defined in [`memory-identity-contract.md`](./memory-identity-contract.md). Gate 2 and the provider-neutral SQLite fallback were implemented and validated on 25 November 2026. Gate 3 is now active: owner-confirmation management APIs, duplicate/conflict review, protected identity/System Memory controls, and bounded contextual retrieval.
**Stage status:** Stage 1 is closed for sequencing as **PARTIAL**; Stage 2 is the next active stage. This does not certify Stage 1 completion or waive its outstanding criteria.

## Next design decision

The v1 contract, additive SQLite migration, legacy-row handling, and provider-neutral fallback are implemented. The remaining approval boundary is the owner-facing management behavior and any later external-provider proof of concept. The contract defines intended behavior; passing backend tests is not target-Windows or live-skill acceptance. Do not begin by importing the full Everything Claude Code (ECC) catalog or changing Ryze's agent/skill instructions.

Keep the Telegram request to create a new Markdown file on hold as a Stage 2 capability investigation. Do not modify the live Ryze skill/intent rules until the memory, capability, permission, and rollback boundaries have been reviewed. The backend route already present is not proof that Ryze can understand or safely perform that request.

## Adopted workstream — external memory-provider evaluation (gated)

The owner's attached Stage 2 proposal is adopted as a **Workstream**, not as a new stage and not as authorization to install a provider. It is useful for structured audit, comparison, proof-of-concept, and validation, but it must remain subordinate to this contract and the nine Stage 2 acceptance criteria.

### Milestones and tasks

1. **Architecture audit:** map the current SQLite memory, task/log, ownership, export, OpenCode, and worker boundaries. Retain SQLite as the operational and authoritative store until a measured alternative is approved.
2. **Candidate research:** inspect Hindsight, MemPalace, and only then other candidates as justified, including source retention, owner/project isolation, local deployment, model/API compatibility, licensing, maintenance, resource use, failure behavior, and integration surface. Published claims are not evidence.
3. **Isolated proof of concept:** use sanitized representative records and a provider-neutral adapter. Measure persistence, retrieval relevance, source attribution, project isolation, contradiction handling, failure recovery, CPU/RAM, and FreeLLMAPI compatibility. Do not send private production data or replace SQLite.
4. **Architecture decision:** select retain, defer, or reject for each candidate. A provider may be adopted only if it materially improves retrieval while preserving source records, owner scoping, rollback, and operation when unavailable.
5. **Validation:** run the existing regression suite plus provider-failure, restart, export/restore, and target-Windows checks. Record actual results and limitations; do not mark Stage 2 complete from a benchmark or provider installation alone.

### Contract corrections to the proposal

- “Automatic memory formation” is not enabled by default. Capture remains explicit, inspectable, and owner-approved under this contract.
- “Share relevant knowledge between authorised agents” is deferred until ownership, project boundaries, and later multi-agent/branch semantics are defined; it is not a Stage 2 permission to expose Personal Memory.
- ECC remains a research/reference boundary. No hooks, agents, skills, tools, auto-approval, or production instruction changes are installed as part of this workstream.
- The unified memory interface is desirable, but it must first wrap the approved Ryze repository and remain provider-neutral; it must not become a second authoritative store.

## Current baseline

Ryze now has an additive local SQLite `ryze_memory` model with legacy `core`/`evolving` scope plus categories, types, provenance, source-system identity, version, sensitivity, and synchronization state. The provider-neutral `MemoryProvider` and SQLite fallback are implemented; duplicate/conflict review and bounded retrieval are now exposed through owner-authenticated Gate 3 procedures. The `ryze_skills` table remains an XP counter rather than a controlled, versioned skill catalog. System identity and protected System Memory are distinct versioned subsystems.

The project pins `@opencode/cli` at `2.3.0` in `package.json`, and its managed OpenCode workspace is generated as a chat-only configuration with deny-all permissions. Verify the actual OpenCode binary/version on the target Windows installation before any adapter compatibility claim. Keep the configured FreeLLMAPI gateway, Windows-local SQLite, Telegram worker, and Ryze task lifecycle intact.

## Stage 2 outcomes

Stage 2 should meet the origin blueprint's identity and memory purpose without introducing an uncontrolled autonomous agent:

1. Maintain a stable Ryze identity and operating principles separately from the owner's profile and preferences.
2. Represent System, Experience, and Personal memory as distinct top-level categories, with Episodic, Semantic, Procedural, Preference, and Project types as secondary classifications.
3. Create, inspect, update, search, and retrieve memory through owner-scoped Ryze interfaces.
4. Preserve original content and provenance, detect likely duplicates, and avoid silent replacement or lossy summarization.
5. Protect System Memory from direct model writes; require a reviewed, versioned change path for instructions, permissions, and architecture.
6. Export and restore memory without relying on Git as a data backup, and prove a round-trip on the target Windows computer.

## Recommended design boundaries

### Keep SQLite as the first implementation

Use the existing local SQLite database as the authoritative store for this single-owner Windows installation. Do not add a second permanent memory database or an external hosted service in Stage 2. Evaluate a full-text index against actual retrieval examples before adding embeddings or a vector store; a separate vector database is not a Stage 2 requirement. Keep source records retrievable after any summary or derived memory is created.

### Add an explicit, additive migration

Before coding, inventory current rows and backup/restore behavior. Preserve every existing row's ID, text, tags, outcome, timestamp, and legacy `core`/`evolving` scope. Do not assume `core` means System Memory or that `evolving` means Experience Memory. Add the new category/type/provenance/version fields in a way that allows unclassified legacy rows to remain searchable while awaiting owner review. The exact nullable/default and backfill policy must be approved before the migration is authored.

Include fields required by the blueprint where feasible: memory ID, category, type, owner scope, source system ID, branch ID, timestamps, content, tags, version, and sync status. Stage 4 can later define branch synchronization semantics; Stage 2 should preserve lineage fields but must not implement multi-installation sync or conflict merging prematurely.

### Preserve source and privacy boundaries

Treat captured conversation content as untrusted and potentially private. Store provenance sufficient to identify the source task or user-approved input, but do not copy Telegram secrets, credentials, raw sessions, or unnecessary message bodies into memory. Define retention and export rules before enabling automatic capture. Keep Personal Memory owner-scoped. Keep System Memory separate from secrets and ordinary configuration.

Initially make memory capture inspectable and conservative: explain the proposed category/type/source, show duplicates or conflicts, and let the owner confirm uncertain or sensitive items. A new or revised summary must point back to its source; it must not overwrite that source. Updates should be versioned or append-first, with deletion and merge behavior explicit.

### Keep retrieval bounded and inspectable

Search only relevant owner-authorized memory. Return a short matched excerpt plus metadata and a way to inspect the source record. Test duplicates, conflicting facts, stale preferences, similarly named projects, and irrelevant matches. Do not inject the entire database into every model prompt. Keep System Memory loading controlled and separate from ordinary Experience/Personal recall.

## Proposed work sequence and gates

### Gate 0 — Preserve the partial-close checkpoint

Record the current commit and a verified local backup before schema or memory changes. Keep the Stage 1 acceptance self-test and evidence unchanged. Do not edit the origin blueprint's original design text; status clarifications belong in its dated addendum and the implementation map.

### Gate 1 — Review and freeze the memory contract

The v1 contract is documented in [`memory-identity-contract.md`](./memory-identity-contract.md), including categories/types, identity boundaries, provenance, conservative capture, duplicate handling, versioning, legacy rows, retrieval, and backup/restore invariants. Review it before freezing implementation details. In particular, specify the exact deletion/retention behavior for backups, the owner-confirmation flow, and representative category/type examples in the implementation test set. Do not start the schema migration until the contract and migration blueprint are approved.

### Gate 2 — Migration and repository layer — COMPLETE

Design an additive SQLite migration with a rollback/backup plan. Test migration against copies containing representative legacy rows, missing optional fields, and duplicate records. Verify that old search results remain available and no row content or identity is lost. Add owner-scoped repository functions and validation before changing dashboard or OpenCode prompts.

Completed in commits `4993cf6` and `3876c2c`: additive migration, legacy preservation, owner-scoped repository functions, identity/System Memory tables, provider-neutral `MemoryProvider`, SQLite fallback, append-first provenance, and automated validation. External providers remain uninstalled and SQLite remains authoritative.

### Gate 3 — Memory management and identity — ACTIVE

Implement inspectable create/search/read/update/archive flows through owner-authenticated APIs and the dashboard Memory vault. Add duplicate/conflict review before activation, bounded retrieval context, and stable Ryze identity/profile controls separately from user profile/preferences and protected System Memory. The first dashboard governance panel is implemented; target-Windows acceptance and export/restore evidence remain open. Enforce user ownership in the database layer, not only in prompt text. System Memory edits require explicit owner review and retain the prior version.

### Gate 4 — Contextual retrieval and duplicate handling — FOLLOW-ON VALIDATION

The first bounded retrieval and duplicate/conflict review slice is implemented in Gate 3. Gate 4 must now measure it using a fixed, owner-approved test set, record false positives/false negatives, validate stale and similarly named project behavior, and improve ranking only when measurements justify it. Preserve source/derived relationships and never silently merge records.

### Gate 5 — Export, restore, and Windows acceptance

Extend the private backup/export path to include memory in a documented, integrity-checked format while keeping credentials excluded from ordinary portable exports. On target Windows, verify export, fresh-copy restore, owner scoping, protected System Memory, and that a failed migration can be rolled back to the pre-change backup. Stage 2 is complete only when all nine Stage 2 criteria in the origin blueprint have evidence; the ECC proposal cannot substitute for those checks.

## New-file capability work held for Stage 2

Treat “make a short Markdown summary of README.md and send it as a file” as a separate capability-design task, not as permission to make the assistant generally write files. First decide the allowed artifact types, source binding, output location, file-size/type limits, authorization, confirmation behavior, logging, and rollback/deletion behavior. Keep arbitrary paths, shell access, broad file permissions, and self-modification disabled. Once the bounded design is reviewed, implement through Ryze's existing task, permission, storage, and Telegram same-chat pathways; then test both a distinct generated attachment and the separate original-file resend path. Do not alter the skill/intent layer during the memory migration without a separate reviewed change.

## ECC proposal assessment

**Recommendation: audit and selectively evaluate ECC, but do not integrate the full proposal as the first Stage 2 implementation.** ECC is primarily an agent-engineering capability bundle—agents, commands, skills, plugin tools, and hooks—not Ryze's persistent memory layer. It cannot satisfy or replace Stage 2's identity, three-category memory, provenance, deduplication, source preservation, export, or restoration criteria.

ECC's own current OpenCode documentation describes its integration as beta. It says the published npm plugin loads plugin hooks/tools but does not install the full agent, command, and instruction catalog; the project configuration/catalog must be separately copied and wired. Its OpenCode documentation also says some hook behavior is advisory and that native permission rules remain the execution boundary. [1] OpenCode's official plugin documentation allows project-local plugin discovery and exact package pinning, while its permission documentation says rules are ordered and agent-level rules are appended after global rules. Therefore, importing ECC agents or config could change the effective permissions; a broad top-level deny-all alone must not be assumed sufficient. Any future trial must inspect effective permissions for every agent, skill, hook, and tool and verify the server-side Ryze boundary still rejects disallowed actions. [2] [3] The proposal's broad “integrate everything” list therefore needs a component-by-component compatibility and permission review, not a bulk install. Verify the actual Windows OpenCode version against ECC's supported loader before considering any runtime integration. [1] [4]

During Stage 2, ECC may be used as a **research/reference candidate** for developer workflow checklists or for a later reviewed skills-registry evaluation. It may support future code review, testing, or planning workflows, but those are not substitutes for live acceptance tests. Do not install ECC hooks, tools, auto-approval behavior, agents, or instructions into Ryze's production chat-only workspace in this phase. If a later experiment is approved, pin an ECC release/commit, isolate it to a disposable workspace, verify effective permission resolution and independent Ryze-side denial for every action, inspect hooks/tools for side effects, and test rollback before deployment.

## Explicitly out of scope for Stage 2

- Declaring Stage 1 complete or deleting its residual evidence.
- General-purpose shell or unrestricted file execution.
- Autonomous creation or self-modification of agent skills.
- Full ECC installation or a second orchestration engine.
- A competing permanent-memory database or automatic cross-installation synchronization.
- Google Drive, Gmail, or Photos integration.
- Stage 3 watchdog, skill promotion, or automatic rollback.
- Stage 4 Master/Slave copies, branch merging, or portable system duplication.

## Stage 1 partial-close register carried alongside Stage 2

Stage 1 remains PARTIAL and is closed only as a sequencing decision. The outstanding items are not marked passed or waived. Retain the owner-reported PASS for File Manifest early deletion and existing-file resend, separately retain the user-visible new-summary failure as deferred capability work, and separately verify automatic 30-day expiry on Windows. Preserve the historic acceptance self-test's own `NOT_RUN`/`WARN` results. Reopen a Stage 1 item if safety, data loss, privacy, or regression evidence requires it; otherwise proceed with Stage 2 without presenting these residuals as Stage 2 completion evidence.

## References

[1]: https://github.com/affaan-m/ECC/blob/main/.opencode/README.md "ECC OpenCode Plugin README"
[2]: https://opencode.ai/docs/plugins/ "OpenCode Plugin Documentation"
[3]: https://opencode.ai/docs/permissions/ "OpenCode Permissions Documentation"
[4]: https://github.com/affaan-m/ECC/blob/main/.opencode/MIGRATION.md "ECC OpenCode Migration Guide"
