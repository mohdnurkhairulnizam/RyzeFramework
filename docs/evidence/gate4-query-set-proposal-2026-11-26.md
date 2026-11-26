# Gate 4 Retrieval Evaluation — Proposed Query Set for Owner Approval

**Status:** Owner approved the exact proposal on 26 November 2026; executed in an isolated synthetic database. Results are recorded in [`gate4-retrieval-evaluation-2026-11-26.md`](./gate4-retrieval-evaluation-2026-11-26.md). This is not a production-data benchmark.
**Date:** 26 November 2026

## Purpose and safety boundary

This proposal turns the existing exploratory retrieval baseline into a bounded candidate for Gate 4. It uses only the synthetic records and queries below. Do not seed these fixtures into the owner's live Ryze database. Run only in a fresh temporary database created by the evaluation harness, with no production data, credentials, real Telegram content, or private backups. Do not change retrieval ranking based on this proposal or the earlier eight-query baseline.

The owner approved the fixture/query wording and expected relevance labels exactly as written on 26 November 2026. Execution used a fresh temporary SQLite database and no live Ryze data. See the linked dated report for the implementation revision, per-query results, false positives/negatives, access-control checks, metrics, and limitations.

## Proposed synthetic records

Create two isolated synthetic owners, `owner-a` and `owner-b`. Use stable fixture IDs and explicit timestamps/status metadata.

| Fixture | Owner | Category / type | Synthetic content and status |
|---|---|---|---|
| `R1` | owner-a | Personal / Preference | Earlier preference (2026-09-02): “Prefer concise, one-paragraph weekly project updates.” Superseded by R2, but retained as history. |
| `R2` | owner-a | Personal / Preference | Current preference (2026-11-01): “For weekly project reports, use no more than five bullets.” Explicitly supersedes R1 for current weekly reports. |
| `R3` | owner-a | Experience / Project | Atlas project decision: use local SQLite persistence for the Atlas workstream. |
| `R4` | owner-a | Experience / Project | Atlas 2 is a separate Telegram onboarding project; do not treat it as the Atlas persistence workstream. |
| `R5` | owner-a | Experience / Episodic | Synthetic restore exercise dated 2026-11-14: a bad backup was rejected, the pre-restore snapshot was used for recovery, and service resumed. |
| `R6` | owner-a | Experience / Semantic | Synthetic migration rule: preserve legacy record IDs, text, tags, outcomes, timestamps, and legacy scope. |
| `R7` | owner-a | System / restricted | Synthetic owner-only export rule: ordinary portable exports must not contain credentials or session data. Exclude by default; include only when the query explicitly authorizes restricted System Memory. |
| `R8` | owner-b | Personal / Preference | “Use metric units in measurements.” This is private to owner-b and must never be returned to owner-a. |

No fixture contains a real credential, real user preference, real project record, or real backup detail.

## Proposed fixed queries and adjudicated expected results

Use each query exactly as written; do not tune the wording after inspecting results. `Expected relevant` lists the only fixtures that count as relevant for that query. An excluded fixture is a false positive if returned in the answer context.

| Query | Owner / context | Exact query | Expected relevant | Main behavior tested |
|---|---|---|---|---|
| `Q01` | owner-a | “How should I format the current weekly project reports?” | `R2` | Paraphrase retrieval and current-version preference |
| `Q02` | owner-a | “What was my earlier style for weekly project updates?” | `R1` | Historical version retrieval when history is requested |
| `Q03` | owner-a | “What is my current preference for weekly project reports?” | `R2` | Stale-versus-current conflict handling |
| `Q04` | owner-a | “What persistence decision was made for the Atlas project?” | `R3` | Project-scoped semantic retrieval |
| `Q05` | owner-a | “Which project is the Telegram onboarding work, Atlas or Atlas 2?” | `R4` | Disambiguation of similarly named projects |
| `Q06` | owner-a | “What happened in the restore exercise on 14 November?” | `R5` | Dated episodic retrieval |
| `Q07` | owner-a | “Which fields must the migration retain from legacy records?” | `R6` | Semantic paraphrase and field-list retrieval |
| `Q08` | owner-a | “List my Personal Preference records about weekly report format.” | `R1`, `R2` | Category/type filtering and version visibility |
| `Q09` | owner-a | “Show Project memories for Atlas 2.” | `R4` | Project-name and category filtering |
| `Q10` | owner-a, ordinary context | “What is the owner-only export rule?” | none | Restricted System Memory excluded by default |
| `Q11` | owner-a, explicitly authorized restricted context | “Include restricted System Memory for this request: what must an ordinary portable export exclude?” | `R7` | Explicitly authorized restricted retrieval |
| `Q12` | owner-a | “Which measurement units do I prefer?” | none | Cross-owner isolation; `R8` must not be returned |
| `Q13` | owner-a | “What music did I listen to while cooking?” | none | Irrelevant query / no-result behavior |
| `Q14` | owner-a | “Show both the earlier and current weekly-report preferences in date order.” | `R1`, `R2` | Provenance, version history, and source preservation |

The owner should explicitly confirm or amend the expected labels, particularly where current-versus-historical preference relevance is subjective. If labels change, record the approved version before running the harness.

## Proposed evaluation/reporting rules

- Report per-query expected IDs, retrieved IDs, true/false positives, and false negatives; also report precision, recall, and F1 with the averaging method stated.
- Evaluate access-control outcomes separately: `R7` must be absent for `Q10` and available only for explicitly authorized `Q11`; `R8` must be absent from every owner-a query.
- Treat a returned superseded record as a false positive for current-preference queries `Q01` and `Q03`, but as relevant for the historical queries `Q02`, `Q08`, and `Q14` where specified.
- Do not infer semantic-retrieval quality from a single paraphrase case or claim production representativeness from these eight synthetic records. Record unsupported filter semantics as limitations rather than changing expected outcomes after the run.
- Do not change ranking, schema, or production memory based on this test without a separately reviewed change and regression evidence.

## Approval record

The owner explicitly approved this exact synthetic fixture/query set on 26 November 2026. Its wording and expected labels remain unchanged in the report. Any future changes require a versioned proposal and new approval. Gate 5 remains PARTIAL / BLOCKED independently.

## Follow-up authorization — 26 November 2026

After reviewing the failed initial evaluation, the owner explicitly directed that the work proceed with the coding and testing needed to pass Gate 4. The bounded retrieval remediation and retest therefore changed implementation behavior, not this approved fixture/query set or its expected labels. The historical baseline and post-remediation run are retained as separate artifacts; this follow-up does not grant permission to weaken restricted-memory authorization or to claim production-corpus or target-Windows acceptance.
