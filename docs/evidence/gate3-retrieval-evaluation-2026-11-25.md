# Gate 3 SQLite Retrieval Evaluation — 2026-11-25

**Status:** Exploratory measured evaluation completed; formal Gate 4 acceptance remains open.

**Implementation under test:** SQLite fallback on `feature/mempalace-production-gate`, dashboard commit `884b8d8` plus local evaluation harness.

## Method

Ran `pnpm exec tsx scripts/evaluate-memory-retrieval.ts`. The harness creates a new temporary SQLite data directory, seeds seven synthetic records across two synthetic owners, executes eight fixed queries, records expected and retrieved fixture IDs, computes micro precision/recall/F1, and removes the temporary database. No existing Ryze data, account memory, credentials, or real user content was used.

The cases cover literal preference retrieval, migration recovery, two similarly named projects (Atlas / Atlas 2), a dated Windows restore event, a semantic paraphrase, an unrelated query, owner isolation, and restricted System Memory with/without explicit inclusion.

## Results

| Measure                                                                             | Result |
| ----------------------------------------------------------------------------------- | -----: |
| Fixture records                                                                     |      7 |
| Owner-scoped lexical queries                                                        |      8 |
| True positives                                                                      |      5 |
| False positives                                                                     |      0 |
| False negatives                                                                     |      1 |
| Micro precision                                                                     | 1.0000 |
| Micro recall                                                                        | 0.8333 |
| Micro F1                                                                            | 0.9091 |
| Restricted System Memory excluded by default                                        |   PASS |
| Restricted System Memory included when explicitly requested                         |   PASS |
| Cross-owner isolation marker                                                        |   PASS |
| Similar-name Atlas / Atlas 2 discrimination for the supplied distinguishing queries |   PASS |

The single false negative is the intentional paraphrase query **“brief executive memo”** against the fixture **“Prefer concise executive summaries for weekly project status reports.”** Current SQLite matching is lexical substring matching, not semantic retrieval. The fixture set also shows that highly specific terms retrieve the expected Atlas project; it does not establish robust ranking across a representative project corpus.

## Interpretation and limits

This is a reproducible synthetic baseline, not a production-data benchmark, user-relevance study, or formal Gate 4 pass. The expected labels are hand-authored for synthetic fixtures; they do not constitute the fixed owner-approved representative test set required by `docs/stage-2-implementation-plan.md`. Do not change ranking based on this tiny sample. The result supports retaining the SQLite baseline for now and prioritizing a larger owner-reviewed query set with adjudicated relevant/irrelevant labels, especially paraphrases, stale project references, similar names, tags, and category/type filters.

## Reproduction

```sh
pnpm exec tsx scripts/evaluate-memory-retrieval.ts
```

The script uses only a temporary directory and removes it on completion. It prints per-query fixture-level TP/FP/FN plus aggregate metrics and access-control checks.
