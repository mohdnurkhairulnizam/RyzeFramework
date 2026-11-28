# Stage 3 WP-1 — Protected Skill Registry implementation plan

**Date:** 29 November 2026
**Status:** Initial plan prepared; implementation not started
**Prerequisite:** Stage 2 closure or explicit owner disposition of the target-Windows retention gate, followed by separate exact implementation authorization

This plan converts the approved WP-1 design into a bounded implementation sequence. It does not authorize code changes by itself.

## 1. Scope and objective

WP-1 will provide a SQLite-authoritative, owner-scoped registry of reviewed skill identities and revisions. The first implementation slice will record and validate skill metadata and lifecycle state without loading or executing skill code.

The implementation must:

- Preserve the existing `ryze_skills` XP/domain table unchanged.
- Add a separate protected registry model for skill revisions and approvals.
- Keep Core Skills protected and Evolving Skills disabled by default.
- Make dependencies, permissions, contracts, hashes, validation evidence, and rollback pointers explicit.
- Reject invalid lifecycle transitions and approval/hash mismatches.
- Provide owner-scoped read-only inspection.
- Preserve prior known-good revisions; never overwrite an active revision in place.
- Exclude secrets, credentials, databases, Telegram sessions, private content, and executable payloads from registry metadata and exports.

The implementation will **not**:

- Execute JavaScript, Python, shell commands, or arbitrary skill payloads.
- Permit a model response or skill to mutate the registry.
- Automatically promote, activate, rollback, or retire a revision.
- Install or control a watchdog.
- Change MemPalace mode, derived search, provider writes, or live router authority.
- Test against the normal Windows profile, production data, or real Telegram sessions.

## 2. Entry criteria and stop conditions

### Entry criteria

1. Stage 2 retention evidence is closed or explicitly owner-deferred in the signoff matrix.
2. The owner gives separate exact authorization for the WP-1 implementation slice.
3. The Stage 2 baseline commit, package identity, SQLite fingerprint, and safety boundaries are recorded.
4. A disposable synthetic profile is available for later read-only inspection.
5. The implementation branch is clean and current with `origin/feature/mempalace-production-gate`.

### Mandatory stop conditions

Stop before implementation or testing if:

- the request expands into dynamic skill execution, autonomous promotion, or watchdog work;
- a test requires private data, a live database, `.env`, credentials, backups, or a Telegram session;
- SQLite would cease to be authoritative;
- a registry permission would widen an existing server route's enforcement;
- a migration would repurpose or rewrite `ryze_skills`;
- a validation failure could result in an `active` revision;
- a package or test would modify the normal Windows profile or production projection settings.

## 3. Implementation phases

### Phase 0 — Authorization and baseline freeze

**Goal:** establish a reviewable starting point before code changes.

Tasks:

- Confirm the Stage 2 signoff disposition and record the retention result or explicit deferral.
- Obtain exact owner authorization naming WP-1, the allowed files/components, and the no-execution boundary.
- Record the current commit, branch, package/checksum if applicable, SQLite fingerprint/counts, and MemPalace safe defaults.
- Create a short-lived implementation branch or continue only on the authorized feature branch without rewriting history.

Deliverable: authorization and baseline record linked from the handoff.

### Phase 1 — Schema and migration design

**Goal:** add a separate registry schema without changing existing skill XP behavior.

Tasks:

- Add `ryzeSkillRegistry`/revision metadata definitions in `drizzle/schema.ts` or the repository's established SQLite schema convention.
- Add an additive SQLite migration under `drizzle/sqlite/`.
- Decide whether approvals and validation evidence are normalized tables or bounded JSON metadata; document the choice and constraints.
- Enforce uniqueness for `(ownerScope, skillId, revision)` and at most one active revision per skill/tier.
- Store permissions, dependencies, input/output contracts, and validation evidence in a deterministic serialized form with bounded size.
- Add content-hash and previous-revision fields with indexes needed for owner-scoped inspection.
- Ensure migration startup is safe against an existing database and leaves `ryze_skills` untouched.

Deliverable: migration, schema review note, and compatibility fixture.

### Phase 2 — Domain types and fail-closed validators

**Goal:** make invalid registry records and transitions impossible through server routes.

Tasks:

- Define literal enums for tier, status, validation status, and the initial permission vocabulary.
- Define a canonical transition matrix for `proposed → prepared → isolated → validated → approved → promoted → monitored`, with bounded `rolled_back`, `retired`, and `blocked` outcomes.
- Validate stable lowercase skill IDs, bounded names/descriptions, revision format, hash format, dependency/contract shape, and owner scope.
- Require `validationStatus=passed` and exact approval metadata before any `active` state can be represented.
- Require `previousRevision` to identify a prior known-good revision of the same skill.
- Reject changes to hash, permissions, dependencies, or contracts after approval.
- Reject duplicate active revisions and cross-owner access.
- Keep all validators independent of MemPalace and model output.

Deliverable: pure validators, transition matrix, and unit tests.

### Phase 3 — SQLite repository boundary

**Goal:** provide a narrow owner-scoped data access layer.

Tasks:

- Add read/list/get functions for registry revisions, approval metadata, and sanitized validation evidence.
- Add owner-scope predicates to every query.
- Add an inspection function that returns current revision, prior revision, status, tier, permissions, dependencies, contracts, hash, and validation state.
- Keep write operations unavailable to model-facing routes; if administrative preparation is needed, expose only an owner-controlled server boundary after authorization.
- Ensure registry history is append-first and prior revisions remain inspectable.
- Ensure file expiry/deletion code has no cascade that removes registry history.

Deliverable: repository module and owner-isolation tests.

### Phase 4 — Read-only API and dashboard inspection

**Goal:** make the registry inspectable without enabling execution or promotion.

Tasks:

- Add an owner-authenticated read-only tRPC/API procedure for registry listing and revision detail.
- Add a minimal dashboard panel or inspection view showing status, tier, revision, hash, validation state, approval state, dependencies, contracts, and rollback pointer.
- Redact or omit executable payloads, secrets, credentials, database bytes, Telegram/session data, and private document content.
- Display explicit labels: `metadata only`, `not executable`, `promotion disabled`.
- Confirm the route cannot be invoked by model output or Telegram inbound task text.

Deliverable: read-only UI/API and route-boundary tests.

### Phase 5 — Fixture-only lifecycle and security tests

**Goal:** prove the registry's safety properties without activating a skill.

Tasks:

- Create synthetic Core and Evolving fixture records.
- Exercise preparation and validation states through `validated` only.
- Reject direct `active` creation without exact approval and passed validation.
- Reject failed/expired validation promotion attempts.
- Reject hash, dependency, permission, and contract mutation after approval.
- Reject cross-owner reads and writes.
- Reject duplicate active revisions.
- Reject rollback pointers to another skill, unknown revisions, or unvalidated revisions.
- Verify the old revision remains intact after every attempted change.
- Verify `ryze_skills` XP/domain records remain unchanged.
- Verify MemPalace is not called and derived search remains disabled.

Deliverable: focused Vitest suite and sanitized evidence summary.

### Phase 6 — Export, migration, and disposable Windows inspection

**Goal:** verify operational portability and target-environment read-only behavior.

Tasks:

- Add registry metadata to the existing export contract without including secrets or executable payloads.
- Test migration from a synthetic legacy database and confirm existing memories, identities, files metadata, and `ryze_skills` rows are preserved.
- Build a source-only package if Windows inspection requires one; exclude `.env*`, databases, logs, backups, sessions, `node_modules`, `dist`, and ZIP artifacts.
- On the disposable Windows profile, run a read-only registry inspection and SQLite integrity/schema check.
- Confirm dashboard availability and Memory Vault availability remain unchanged.
- Restore safe MemPalace defaults and record the final fingerprint.

Deliverable: bounded disposable-Windows evidence record. This is not production acceptance.

### Phase 7 — Review and close the WP-1 implementation slice

**Goal:** decide whether the bounded metadata/validation slice is acceptable.

Tasks:

- Run repository validation and inspect the complete staged diff.
- Review the acceptance matrix by evidence class: repository, synthetic, disposable Windows, and owner-reported.
- Confirm no active skill was executed or promoted.
- Confirm Stage 2 remains correctly recorded and no Stage 3 completion claim is made.
- Obtain a separate decision before any future WP-1 promotion/execution work or before starting WP-2/WP-3 implementation.

Deliverable: WP-1 implementation report and updated stage handoff.

## 4. Task breakdown

| ID | Task | Primary files/components | Depends on | Exit condition |
|---|---|---|---|---|
| WP1-00 | Confirm authorization and freeze baseline | `docs/evidence/`, handoff, signoff matrix | Stage 2 disposition | Exact scope and safety boundary recorded |
| WP1-01 | Finalize registry relational model | `drizzle/schema.ts` | WP1-00 | Fields, indexes, uniqueness, retention policy reviewed |
| WP1-02 | Add additive SQLite migration | `drizzle/sqlite/` | WP1-01 | Synthetic legacy DB migrates; `ryze_skills` unchanged |
| WP1-03 | Define enums and record contracts | `server/` types/validation module | WP1-01 | Invalid field shapes fail closed |
| WP1-04 | Implement lifecycle transition matrix | validator module/tests | WP1-03 | Invalid transitions rejected deterministically |
| WP1-05 | Implement approval/hash invariants | validator/repository tests | WP1-04 | Active requires passed validation and exact approval |
| WP1-06 | Implement owner-scoped repository reads | registry repository module | WP1-02, WP1-05 | Cross-owner records are inaccessible |
| WP1-07 | Add read-only API boundary | server router | WP1-06 | Model/Telegram paths cannot mutate or promote |
| WP1-08 | Add metadata-only dashboard inspection | client panel/router types | WP1-07 | Registry is inspectable and visibly non-executable |
| WP1-09 | Add fixture lifecycle tests | Vitest | WP1-04–WP1-08 | Tests reach `validated`, never activate a fixture |
| WP1-10 | Add export redaction coverage | export code/tests | WP1-06 | No secrets/payloads/private content exported |
| WP1-11 | Run disposable Windows inspection | package/scripts/evidence | WP1-09, Stage 2 disposition | Read-only inspection and SQLite checks pass |
| WP1-12 | Review and document result | handoff/spec/evidence | WP1-11 | Owner decision recorded; no Stage 3 overclaim |

## 5. Acceptance matrix

| Acceptance item | Evidence class | Required result |
|---|---|---|
| TypeScript check | Repository | PASS |
| Focused registry tests | Repository | PASS |
| Full Vitest suite | Repository | PASS |
| SQLite migration compatibility | Synthetic repository | PASS; legacy rows and `ryze_skills` preserved |
| Owner isolation | Synthetic repository | PASS |
| Invalid lifecycle transitions | Synthetic repository | PASS; fail closed |
| Approval/hash immutability | Synthetic repository | PASS |
| Duplicate active revision rejection | Synthetic repository | PASS |
| Rollback-pointer validation | Synthetic repository | PASS |
| Export redaction | Synthetic repository | PASS |
| Read-only dashboard inspection | Disposable Windows | PASS |
| SQLite integrity/fingerprint | Disposable Windows | PASS and unchanged where expected |
| MemPalace authority check | All classes | No provider call; safe defaults unchanged |
| Skill execution/promotion | All classes | Not run; explicitly out of scope |

## 6. Validation commands

For implementation work, run focused tests first, then:

```bash
pnpm run check
pnpm test -- --run
pnpm run build:local
git diff --check
```

If a worker or Windows package is changed, run only the applicable additional checks and record them separately. Do not treat repository tests as target-Windows or live Telegram acceptance.

## 7. Definition of done for the initial WP-1 slice

The initial slice is done only when:

1. The separate registry schema and migration are additive and compatible.
2. The registry is owner-scoped and SQLite-authoritative.
3. All required invariants and invalid transitions fail closed.
4. Read-only inspection is available without execution or promotion.
5. Fixture tests validate the lifecycle through `validated` only.
6. Export and migration redaction/preservation checks pass.
7. Disposable Windows inspection passes without touching the normal profile or production settings.
8. Full validation is recorded and the branch contains no secrets or private data.
9. The owner reviews the result and separately decides whether WP-1 may proceed to any future activation/deployment work.

**No WP-1 implementation task may be marked complete by merely creating a table. The acceptance decision must cover invariants, ownership, redaction, evidence class, and the preserved Stage 2 boundary.**
