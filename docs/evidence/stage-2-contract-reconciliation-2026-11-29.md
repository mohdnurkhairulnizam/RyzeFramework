# Stage 2 contract reconciliation — 29 November 2026

This matrix reconciles the ten bullet criteria in origin blueprint §2.9 with the nine-item Ryze Memory and Identity Contract. The contract's item 9 intentionally combines export and restoration; no origin criterion is dropped.

| Origin §2.9 criterion | Contract mapping | Local evidence/status | Boundary |
|---|---|---|---|
| 1. Persistent AI identity | Contract item 1 | **PASS for tested synthetic owner scope.** Versioned identity/profile and revision history are implemented and tested. | Target-Windows and production identity acceptance remain bounded/owner-reported. |
| 2. Three main memory categories | Contract item 2 | **PASS for tested synthetic scope.** System, Experience, and Personal are represented distinctly. | No production-corpus coverage claim. |
| 3. Secondary memory classification | Contract item 3 | **PASS for tested synthetic scope.** Episodic, Semantic, Procedural, Preference, and Project are represented. | No claim that every legacy row is classified; legacy-unclassified behavior remains intentional. |
| 4. Memory creation and retrieval | Contract item 4 | **PASS for tested synthetic owner/API scope.** Owner-approved create, read, update/version, archive, and retrieval paths are covered. | Full live natural-language behavior and every deletion variant are not closed here. |
| 5. Contextual memory search | Contract item 5 | **PASS within the approved synthetic Gate 4 evaluation.** TP=13, FP=0, FN=0, F1=1.0; owner isolation and restricted handling are covered. | The exploratory paraphrase miss and production-corpus quality remain open limitations. |
| 6. Duplicate detection | Contract item 6 | **PASS for tested exact-duplicate/conflict paths.** Exact duplicates are not silently duplicated; conflicts require owner confirmation. | Broad semantic-deduplication quality is not claimed. |
| 7. Protected System Memory | Contract item 7 | **PASS for tested governance path.** System Memory uses a protected owner-reviewed route and is excluded from direct model mutation. | No unrestricted model/provider mutation acceptance is claimed. |
| 8. Original source preservation | Contract items 4 and 6, with provenance fields in the record contract | **PASS for tested append-first/versioned paths.** Source/provenance and prior revisions remain inspectable. | Retention/deletion and all source-copy variants remain bounded by their specific tests. |
| 9. Memory export | Contract item 9 | **PASS for tested disposable synthetic Windows/export scope.** Metadata is exported while credentials and Telegram sessions are excluded from ordinary export. | Normal-profile and production-data export are not inferred. |
| 10. Memory restoration | Contract item 9 | **PASS for tested disposable synthetic Windows/restore scope.** Valid restore, corruption rejection, rollback, integrity, and schema checks passed. | The tested restore is disposable synthetic Windows evidence, not unrestricted production restore acceptance. |

## Reconciliation result

All ten origin criteria have an explicit mapping. The nine-item contract is not missing an origin criterion; it combines origin criteria 9 and 10 under one export/restore invariant. This closes the documentation reconciliation task only. It does not by itself declare Stage 2 complete.

## Remaining closure conditions

- The generated-summary owner-facing natural-language benchmark remains pending because the current owner-reported Telegram behavior previously resent the source and refused file creation; backend artifact/provenance tests do not replace that benchmark.
- Target-Windows automatic 30-day expiry remains a separate Stage 1 residual.
- Any MemPalace derived-search activation requires the separate gate in [`../mempalace-derived-search-acceptance-gate-2026-11-29.md`](../mempalace-derived-search-acceptance-gate-2026-11-29.md).
- The bounded ongoing-projection policy is documented separately and does not authorize activation by itself.
