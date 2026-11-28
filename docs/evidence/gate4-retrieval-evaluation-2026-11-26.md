# Gate 4 Retrieval Evaluation — 2026-11-26

**Current disposition:** The owner-approved fixed synthetic evaluation **PASSED after the bounded retrieval remediation**. This pass applies only to the approved 8-fixture/14-query synthetic set; it is not a production-corpus benchmark, a claim of general semantic retrieval quality, or target-Windows acceptance.

**Approval and query integrity:** The owner approved the exact fixture/query proposal on 26 November 2026. The exact 14 query strings and expected labels were preserved without alteration. See the [approved query set](./gate4-query-set-proposal-2026-11-26.md).

**Implementation under test:** the final post-remediation worktree state on `feature/mempalace-production-gate`, recorded with this report in the continuity commit. The run used the Linux project sandbox, not target Windows. The [current raw results](./gate4-retrieval-evaluation-2026-11-26.json) are separate from the [preserved pre-remediation raw baseline](./gate4-retrieval-evaluation-2026-11-26-baseline.json). The [reproduction harness](../../scripts/evaluate-gate4-retrieval.ts) asserts the fixed labels and Q14 order.

## Method and safety

Ran `pnpm exec tsx scripts/evaluate-gate4-retrieval.ts` in the project sandbox. The harness created a fresh SQLite database in a unique temporary directory, seeded the eight owner-approved synthetic records across two synthetic owners, applied the approved historical dates and R1 superseded/R2 active status, executed the 14 exact approved queries, and removed the temporary database on exit. Temporary-directory cleanup passed. No live Ryze database, owner memory, backup, Telegram content, or external service was accessed. The harness temporarily used synthetic values for `RYZE_DATA_DIR`, `RYZE_DATABASE_PATH`, `RYZE_LOCAL_OWNER_OPEN_ID`, and `RYZE_LOCAL_OWNER_NAME` inside its own Node process, restored their prior values in `finally`, and did not print those prior values. No on-disk configuration was changed or shared, and no credentials were sent to a service.

The approved query text was kept verbatim. Q08 used explicit `category=personal, memoryType=preference` filters and Q09 used `category=experience, memoryType=project`, as recorded in the proposal. Q10/Q11 used the bounded retrieval-context path with `category=system`; Q11 explicitly enabled `includeRestricted`. Matching-term restricted-memory and owner-isolation probes were run separately from the fixed-query score.

## Post-remediation aggregate results

| Measure | Result |
|---|---:|
| Synthetic fixture records | 8 |
| Fixed approved queries | 14 |
| Expected relevant fixture instances | 13 |
| True positives | 13 |
| False positives | 0 |
| False negatives | 0 |
| Predictions | 13 |
| Precision | 1.0000 |
| Recall | 1.0000 |
| F1 | 1.0000 |
| Q14 chronological order | PASS (`R1`, `R2`) |
| Restricted default exclusion / explicit inclusion | PASS / PASS |
| Owner isolation controls | PASS |
| No-result queries (Q12/Q13) | PASS |
| Temporary database cleanup | PASS |

Metrics are micro-averaged over the expected and retrieved fixture IDs across the 14 fixed queries. Empty-label queries do not add true positives or false negatives; the two negative queries returned no records.

## Fixed per-query results

| Query | Expected | Retrieved | TP | FP | FN | Outcome |
|---|---|---|---:|---:|---:|---|
| Q01 | R2 | R2 | 1 | 0 | 0 | Pass |
| Q02 | R1 | R1 | 1 | 0 | 0 | Pass |
| Q03 | R2 | R2 | 1 | 0 | 0 | Pass |
| Q04 | R3 | R3 | 1 | 0 | 0 | Pass |
| Q05 | R4 | R4 | 1 | 0 | 0 | Pass |
| Q06 | R5 | R5 | 1 | 0 | 0 | Pass |
| Q07 | R6 | R6 | 1 | 0 | 0 | Pass |
| Q08 | R1, R2 | R2, R1 | 2 | 0 | 0 | Pass; label checks membership, not chronology |
| Q09 | R4 | R4 | 1 | 0 | 0 | Pass |
| Q10 | none | none | 0 | 0 | 0 | Pass; restricted record excluded by default |
| Q11 | R7 | R7 | 1 | 0 | 0 | Pass; explicit restricted inclusion |
| Q12 | none | none | 0 | 0 | 0 | Pass; no-result query |
| Q13 | none | none | 0 | 0 | 0 | Pass; no-result query |
| Q14 | R1, R2 | R1, R2 | 2 | 0 | 0 | Pass; explicit chronological-order assertion |

Exact fixed query strings and expected labels remain in the approved proposal; the raw JSON records them alongside the retrieved fixture IDs.

## Access-control and boundary controls

These supplementary probes are separate from the fixed-query metrics and do not alter the approved query set:

- **Restricted System Memory:** with matching synthetic query `Synthetic owner-only export rule ordinary portable exports`, the default context excluded R7 and reported one restricted entry excluded (**PASS**); explicitly setting `includeRestricted=true` returned R7 (**PASS**). This does not make query wording an authorization mechanism: restricted inclusion remains an independent explicit trusted option.
- **Owner isolation:** owner B retrieved its own R8 using `Use metric units in measurements` (**PASS**); the same matching query under owner A did not retrieve R8 (**PASS**). None of the fixed owner-A queries returned R8.
- **Historical status and ordering:** R1 is superseded and R2 active. Current/default preference searches remain active-only; “earlier” intent retrieves superseded records; inventory/both-version requests may return active and superseded records. Q14 returned R1 before R2 by date (**PASS**).
- **Temporary data:** the unique temporary database directory was removed after the run (**PASS**).

## Separate exploratory baseline

The prior eight-query exploratory regression run remains a distinct result and was not merged into the approved 14-query score. After remediation it returned **TP=5, FP=0, FN=1**, precision **1.0000**, recall **0.8333**, and F1 **0.9091**. Its prior semantic-paraphrase miss remains open; this result reinforces that the fixed-set Gate 4 pass does not establish broad semantic retrieval quality. The full raw result is preserved separately in [`eight-query-exploratory-retrieval-regression-2026-11-26.json`](./eight-query-exploratory-retrieval-regression-2026-11-26.json).

The original pre-remediation approved-set run is preserved in `gate4-retrieval-evaluation-2026-11-26-baseline.json`: it returned 0 true positives, 0 false positives, 13 false negatives, recall 0, F1 0, and undefined precision because it made no predictions. The current primary raw JSON contains the post-remediation run.

## Implementation and validation

The SQLite fallback now uses bounded, normalized lexical token-overlap scoring with deterministic ranking and a 1,000-candidate cap. Owner/category/type/status filters remain explicit; default searches remain active-only; history intent and inventory/both-version requests can include superseded entries; date-order requests sort chronologically; archived entries require explicit inclusion. The provider-neutral `MemoryProvider`, SQLite provider, bounded retrieval context, and protected router pass the relevant options through. Restricted-memory authorization remains separate and default-false.

Validation for this continuation passed: `pnpm run check`; focused tests (10/10); full `pnpm test` (74 tests across 23 files); `pnpm run worker:test` (9 tests); `pnpm run build:local` (existing non-fatal large-chunk warning); and `git diff --check`. These are sandbox checks and do not establish target-Windows behavior.

## Limitations and gate disposition

This synthetic fixed set is not evidence of production-corpus representativeness. The implementation is bounded lexical token-overlap retrieval, not an embedding system or general semantic reasoner. In particular, the prior eight-query exploratory baseline still misses a semantic paraphrase. The perfect fixed-set score should not be extrapolated beyond the fixtures and labels approved for this run.

**Gate 4 retrieval evaluation:** **PASSED for the owner-approved 8-fixture/14-query synthetic evaluation after remediation**, including the Q14 chronology assertion and supplemental access-control controls. Preserve the original failing baseline and current post-remediation result separately. Any later evaluation must keep query wording/labels unchanged unless a new owner-reviewed proposal explicitly supersedes them.

**Gate 5 target-Windows restore acceptance:** remains **PARTIAL / BLOCKED**, independently of Gate 4. The corrupted-backup trial used the legacy installed handler and Ryze failed to start; recovery from the verified pre-restore snapshot succeeded (owner-reported). The hardened handler hash did not match the installed handler, the validator was absent, and the exact updater source remains unresolved. **Do not run any further Windows restore, corruption, or rollback tests until deployment of the hardened handler and validator is independently verified.**
