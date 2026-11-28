# Stage 3 WP-1 — Protected Skill Registry specification

## Status

**Design reviewed and prepared; implementation not started.** This specification translates origin blueprint sections 3.2–3.5 into a bounded Ryze design. It does not enable autonomous skill mutation, dynamic code loading, automatic promotion, or production deployment.

Stage 2 remains active/not complete until the target-Windows one-day retention evidence is closed or explicitly owner-deferred.

## 1. Goals and non-goals

### Goals

- Give every supported skill a stable identity and auditable revision history.
- Distinguish protected Core Skills from disabled-by-default Evolving Skills.
- Make permissions, dependencies, validation results, and rollback references explicit.
- Prevent blind overwrite of an active skill.
- Require prepare → isolate → validate → approve → promote → monitor → rollback lifecycle states.
- Keep skill records owner-scoped and SQLite-authoritative.

### Non-goals

- No skill can edit its own code, permissions, tier, or approval state.
- No model response can register, activate, promote, or mutate a skill.
- No arbitrary JavaScript/Python loading from a skill record.
- No shell, credential, Telegram, broadcast, external-provider, or unrestricted file permission is granted by registry presence.
- No MemPalace storage or search is used as the skill registry.
- No Stage 3 runtime implementation is authorized by this document alone.

## 2. Registry record

The proposed provider-neutral record is:

| Field | Rule |
|---|---|
| `skillId` | Stable lowercase identifier; immutable after creation. |
| `name` | Human-readable name; bounded length; no secrets. |
| `tier` | `core` or `evolving`. |
| `revision` | Positive integer or immutable semantic revision label. |
| `status` | `disabled`, `testing`, `approved`, `active`, `retired`, or `blocked`. |
| `description` | Bounded purpose statement. |
| `permissions` | Explicit enum set; empty by default. |
| `dependencies` | Exact package/service identifiers and versions. |
| `inputContract` | Structured input schema identifier. |
| `outputContract` | Structured output schema identifier. |
| `contentHash` | SHA-256 of the reviewed skill artifact or manifest. |
| `previousRevision` | Immutable rollback pointer; null for the first revision. |
| `validationStatus` | `not-run`, `passed`, `failed`, or `expired`. |
| `validationEvidence` | Sanitized evidence ID/reference, never raw private data. |
| `ownerApproval` | Explicit approval record ID and timestamp; absent for unapproved revisions. |
| `createdAt` / `updatedAt` | SQLite timestamps. |

Secrets, credentials, database bytes, Telegram sessions, private document content, and executable payloads do not belong in the registry record.

## 3. Tier and permission rules

### Core Skills

Core Skills are protected operational capabilities. Their identity, tier, permission set, and active revision can change only through an owner-approved deployment process. A failed or unapproved revision cannot replace a Core Skill.

### Evolving Skills

Evolving Skills are proposals or reviewed additions. They begin `disabled`, cannot run in production by default, and require an explicit owner approval before activation. A proposal is not an installed or executable skill.

### Permission levels

The initial permission vocabulary is intentionally narrow:

- `L0_READ`: read bounded owner-scoped records supplied by a server route.
- `L1_LOCAL_WRITE`: write only a server-validated local artifact or metadata record in an approved destination.
- `L2_EXTERNAL_SEND`: reserved and disabled; requires a separate reviewed gate.
- `L3_SHELL_OR_CREDENTIAL`: prohibited for autonomous skills and never granted by WP-1.

A registry permission is descriptive policy metadata. The server-side route must independently enforce the permission; registry data cannot widen a route's capabilities.

## 4. Revision lifecycle

The only accepted lifecycle is:

1. `PROPOSED` — capability gap and owner-visible rationale recorded.
2. `PREPARED` — new revision has a stable manifest and SHA-256.
3. `ISOLATED` — disposable synthetic profile only.
4. `VALIDATED` — required tests and dependency/permission checks pass.
5. `APPROVED` — owner approval binds the exact skill ID, revision, hash, and permission set.
6. `PROMOTED` — server activates the approved revision without deleting the prior stable revision.
7. `MONITORED` — health and outcome evidence are recorded.
8. `ROLLED_BACK` — prior known-good revision restored after a bounded failure.
9. `RETIRED` or `BLOCKED` — revision cannot be promoted again without a new review.

The active revision must never be overwritten in place. Promotion is an atomic metadata transition pointing to an immutable reviewed revision.

## 5. Required invariants

- One active revision per `skillId` and tier.
- Every non-initial revision points to a prior revision.
- `active` requires `validationStatus=passed` and an exact owner approval.
- `evolving` cannot become active without owner approval.
- Hash, permissions, dependencies, and contracts are immutable after approval.
- Rollback points only to a prior known-good revision for the same `skillId`.
- A failed validation cannot be promoted.
- Registry queries are owner-scoped and SQLite-backed.
- Skill records are not projected to MemPalace as an operational authority.
- Deleting or expiring a file never changes skill registry history.

## 6. Proposed implementation boundary

The first implementation slice, after Stage 2 closure and separate approval, should be read-only registry plumbing plus validation—not executable skill loading:

1. Add SQLite schema/migration for immutable skill revisions and approval records.
2. Add server-side ownership and invariant validators.
3. Add read-only dashboard listing and revision inspection.
4. Add fixture-only lifecycle tests through `VALIDATED`; do not activate a new skill.
5. Add manifest/hash mismatch and invalid-transition rejection tests.
6. Add export metadata with secrets and executable payloads excluded.

Dynamic execution, promotion, watchdog integration, and Windows deployment remain later work packages.

## 7. Acceptance evidence

The WP-1 implementation gate requires:

- TypeScript and full Vitest pass.
- Migration compatibility test against a synthetic legacy database.
- Owner-scope isolation test.
- Invalid lifecycle transition rejection.
- Hash, dependency, permission, and approval immutability tests.
- Duplicate active-revision rejection.
- Rollback-pointer validation.
- Export redaction test.
- Disposable Windows read-only registry inspection.
- No normal-profile, production-MemPalace, Telegram-session, or private-data test.

## 8. Current approval state

- Design review: **PASS — owner-directed planning/design review**.
- Implementation: **NOT STARTED**.
- Individual implementation approval: **PENDING Stage 2 closure and a separate exact implementation approval**.
- Stage 2 retention gate: **OPEN**.
