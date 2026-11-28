# Stage 3 research and architectural enhancement report

**Date:** 29 November 2026
**Repository:** `mohdnurkhairulnizam/RyzeFramework`
**Status:** Research completed; no Stage 3 runtime implementation authorized

## Conclusion

None of the eight assessed repositories is a drop-in RyzeFramework runtime. Each introduces a competing execution/orchestration authority, a separate persistence model, an unverified platform/provider boundary, or a combination of these. The recommended approach is to keep Ryze's existing OpenCode executor, approval and permission controls, task lifecycle, logging, Telegram boundary, and SQLite authority, while adapting selected patterns behind narrow interfaces.

The strongest candidates for bounded adaptation are SkillOpt's offline proposal-and-validation loop, promptfoo and Inspect AI's evaluation mechanics, WinSW's Windows process supervision, and selected planning/barrier/recovery patterns from the OpenCode-oriented projects. LangGraph, Inspect AI, and the two OpenCode orchestration projects should be studied rather than installed as parallel runtimes.

Stage 2 remains active/not complete. WP-1 Protected Skill Registry remains the first Stage 3 implementation slice after Stage 2 closure or explicit owner disposition and separate implementation authorization.

## Comparison matrix

| Repository | Best use for Ryze | Main conflict | Decision |
|---|---|---|---|
| [Microsoft SkillOpt][1] | Offline skill proposals, bounded edits, held-out validation, regression gates | Python/JSON-file state, transcript privacy exposure, Alpha/preview APIs, no SQLite or Ryze approval authority | **Adapt concepts** |
| [promptfoo][2] | Deterministic and model-graded evaluation, datasets, CI gates, red-team checks | Own SQLite database, agent workspaces are not sandboxes, OpenCode/FreeLLMAPI contract unverified | **Adapt as isolated evaluator** |
| [WinSW][3] | Windows process hosting and coarse restart supervision | Not an agent/task engine; service-account, UAC, restart-duplication, and framework risks | **Adapt as optional host** |
| [opencode-agent-team][4] | Visible OpenCode subtasks and sequential delegation patterns | Replaces built-ins, in-memory state, weak tests, advisory permissions, Unix-oriented installer | **Study patterns** |
| [LangGraph][5] | Typed state, routing, interrupts, retry/backoff, checkpoint concepts | Python-first, separate execution engine, resume may re-execute side effects, SQLite saver is lightweight | **Study patterns** |
| [Inspect AI][6] | Evaluation harness, solvers, scorers, logs, retries, and resume patterns | Separate solver/approval model, trusted-log code retry, Linux/Docker assumptions | **Study/adapt evaluation ideas** |
| [orchestrate][7] | Run artifacts, structured failures, review/rework, continuation | Bash/jq, JSONL state, dangerous default permissions, weak Windows/CI evidence | **Adapt narrow patterns** |
| [orchestrator-opencode][8] | Scope accounting, dependency batches, handoffs, adversarial review, barriers | Permissive configuration, own artifacts/lifecycle, no package lock or CI | **Adapt narrow patterns** |

No project should be integrated wholesale. “Adapt” means implementing the pattern behind a Ryze-owned boundary, not importing the project's runtime lifecycle or authority model.

## Repository findings

### Microsoft SkillOpt — adapt the improvement protocol, not the runtime

SkillOpt treats a natural-language Markdown skill as trainable text. Its loop uses rollouts, reflection, structured patches, aggregation, bounded updates, and held-out validation. SkillOpt-Sleep adds transcript harvesting, versioned state, replay, no-regression options, and staged adoption. These are strong references for a future skill factory.

Ryze must not adopt SkillOpt's JSON/file state as authority. Transcript harvesting can expose secrets, private prompts, tool outputs, or prompt injection. The research materials also describe the package as Alpha/research-oriented and Sleep as preview. SkillOpt has no verified FreeLLMAPI-specific behavior, SQLite authority, or Ryze approval integration. The safe use is an offline proposal generator that emits a candidate patch and evidence record to the WP-1 registry; it must never directly promote or execute the result.

### promptfoo — adapt as a read-only evaluation adapter

promptfoo is the strongest fit for evaluation mechanics. It supports deterministic assertions, model-graded rubrics, datasets, latency/cost checks, red-team plugins, result artifacts, and CI-oriented gates. Its repository has cross-platform CI and agent-skill smoke tests. It also maintains its own Drizzle/libSQL SQLite database and explicitly states that agent workspaces are not security sandboxes.

Ryze should consume sanitized immutable run snapshots and import evaluation results keyed to Ryze task/evaluation IDs. promptfoo must not write Ryze lifecycle truth, approval state, or memory. Telemetry/sharing controls, native dependencies, Node version requirements, and FreeLLMAPI/OpenCode compatibility require an isolated compatibility test.

### WinSW — adapt only as a Windows host boundary

WinSW is a Windows service wrapper, not an agent runtime. Its useful capabilities are graceful stop, bounded termination, service failure actions, restart delays, and failure-count reset. It can host the existing Ryze process without owning task state.

The application-level watchdog must reconcile SQLite state before retrying work. A process restart alone can duplicate external side effects or strand in-flight tasks. Service account, PATH, working directory, UAC, laptop sleep, and .NET target-framework behavior must be tested on the exact Windows target. The repository materials identify .NET 8 end-of-life as a future migration concern, so any artifact must be pinned.

### opencode-agent-team — study visible delegation only

This small TypeScript OpenCode plugin uses an orchestrator and static worker, with sequential delegation, visible subtasks, and bounded status polling. It replaces OpenCode built-ins, keeps state in memory, has no durable resume path, and exposes broad worker permissions through prompt/configuration conventions. Its installer is Unix-oriented and the repository has no meaningful behavioral test or release program.

Ryze may borrow the concepts of visible child tasks, sequential delegation locks, and bounded polling. It must not replace OpenCode built-ins or bypass Ryze approvals, permissions, task lifecycle, logging, or SQLite.

### LangGraph — study typed state and interruption semantics

LangGraph provides typed graph state, node routing, interrupts, retries, subgraphs, and checkpoint concepts. Its retry implementation includes bounded attempts and backoff, but resuming an interrupted node can re-execute the node from its beginning. Its SQLite checkpoint package is explicitly lightweight and not a scalable multi-thread authority.

Ryze may study idempotent resume, typed state transitions, and interrupt handling. It should not adopt LangGraph as a second executor or database authority. Any retry around a tool, file, provider, or Telegram side effect requires an idempotency key and an approval-aware compensation rule.

### Inspect AI — study evaluation architecture

Inspect AI is a Python evaluation framework with tasks, datasets, solvers, agents, tools, scorers, logs, retries, and a large evaluation collection. It has strong testing and release signals. Its retry/recovery behavior is evaluation-centric; trusted-log retry can execute code named by a log, so the mechanism must not be exposed to untrusted Ryze data.

Inspect AI is suitable as a research reference for evaluation reports, scorer separation, and resume semantics. It is not a replacement for OpenCode or Ryze task state, and Windows 10, FreeLLMAPI, native OpenCode, and SQLite authority remain unverified.

### orchestrate — adapt bounded run artifacts and review loops

orchestrate uses Bash/jq, Markdown skills, model routing, run directories, append-only JSONL indexes, structured exit codes, continuation, retry, review/rework, and handoff artifacts. These are useful operational patterns, but the current configuration includes dangerous permission bypasses and is not a Windows-native or SQLite-backed system.

Ryze can adapt structured run outcomes, scope/dependency planning, review/rework loops, and continuation packets behind its existing executor. It must not adopt the project's JSONL index, unrestricted permissions, or shell runtime as authority.

### orchestrator-opencode — adapt scope and barrier patterns

orchestrator-opencode provides planning, dependency batches, named roles, adversarial review, handoff/compaction, and an OpenCode subagent barrier. Its configuration is permissive, it writes its own artifacts and Markdown memory, it has no package lock or CI, and its Windows behavior is not established beyond installer-level support.

Ryze can study deterministic scope accounting, dependency-aware planning, missing/idle/timeout status handling, and adversarial verification. A missing child status must never be treated as success, and the imported project must not write a parallel task lifecycle.

## Skill Factory implications for WP-1

WP-1 remains the authoritative SQLite registry for skill identity, revision, status, permissions, dependencies, contracts, validation evidence, approval, and rollback lineage. No external research project may replace it.

SkillOpt's concepts can later inform a bounded offline workflow:

1. Select an approved, sanitized evaluation slice.
2. Run the existing Ryze executor and record a baseline in SQLite.
3. Generate a candidate skill patch as bounded structured operations.
4. Validate against held-out cases and an explicit no-regression policy.
5. Record evaluator version, model/provider, scores, uncertainty, and evidence.
6. Stage the candidate as `proposed` or `validated`.
7. Require owner approval before any future promotion.

This is a future enhancement to WP-1. It is not permission to harvest private transcripts, mutate live skill instructions, or execute candidate code.

## Agent Factory boundary

The future Agent Factory should be a declarative profile compiler, not an executor. It may validate and materialize a profile containing role, model/provider reference, allowed skill versions, tool allowlist, resource limits, sandbox mode, approval policy reference, and evaluation configuration. It may create an SQLite-linked run specification for the existing Ryze/OpenCode executor.

It must not directly spawn arbitrary agents, grant permissions, bypass approvals, own task state, persist a second database, harvest raw private transcripts, or silently select models/providers. Agent creation, activation, delegation, suspension, and retirement should be auditable registry transitions.

## Multi-agent orchestration boundary

Use native OpenCode delegation through a Ryze adapter. Ryze owns parent and child task IDs, budgets, approvals, cancellation, timeouts, result attribution, and finalization. Workers receive least-privilege profiles and sanitized context. Outputs return as bounded typed reports. Parallelism is limited to independently scoped, side-effect-free work and must respect laptop/API quotas.

The barrier must distinguish completed, failed, timed out, aborted, and unknown states. Missing status must never be treated as success. No imported project may disable OpenCode built-ins or install a competing lifecycle.

## Watchdog direction

The first watchdog work should be application-level: SQLite-backed heartbeat/lease, monotonic deadlines, stale-run reconciliation, idempotency keys, and explicit `running → interrupted/recoverable` transitions. WinSW may later host the existing Ryze process as an optional Windows boundary after exact target testing. A wrapper restart cannot replace SQLite reconciliation or authorize duplicate side effects.

## Evaluation architecture

Separate execution, observation, and judgment. The existing executor produces canonical events and artifacts. An evaluation adapter consumes sanitized immutable snapshots and writes results keyed to Ryze run/evaluation IDs. Deterministic checks should precede model judges. Provider failures, grading failures, and assertion failures must remain distinct.

The future evaluation suite should cover FreeLLMAPI envelopes, OpenCode behavior, permissions, approvals, cancellation, retries, SQLite transactions, Windows paths/service accounts, crash recovery, held-out skill validation, no-regression gates, edit ablations, prompt injection, and resource budgets.

## Ordered roadmap

1. Close Stage 2 or record an explicit owner disposition of the retention gate.
2. Implement WP-1 metadata, validation, approval, provenance, and rollback records in SQLite.
3. Keep one SQLite writer and import external artifacts only as immutable evidence.
4. Add a minimal declarative Agent Factory boundary that compiles profiles for the existing executor.
5. Add an isolated evaluation adapter with deterministic assertions first.
6. Add bounded child-task orchestration, barriers, cancellation, leases, and idempotency.
7. Add application-level heartbeat/reconciliation, then evaluate WinSW only as an optional host.
8. Keep MemPalace optional and disabled; it cannot replace registry metadata or audit history.
9. Run a staged Windows 10, provider, security, and resource pilot before any unattended activation.

## Limitations

Exact Windows 10 end-to-end behavior, FreeLLMAPI protocol semantics, native OpenCode compatibility for promptfoo/Inspect, laptop resource ceilings, crash-consistent cross-process recovery, and production semantic safety remain unverified. Repository CI and benchmark claims are not Ryze acceptance evidence.

## References

[1]: https://github.com/microsoft/SkillOpt "Microsoft SkillOpt repository"
[2]: https://github.com/promptfoo/promptfoo "promptfoo repository"
[3]: https://github.com/winsw/winsw "WinSW repository"
[4]: https://github.com/cytsaiap-xyz/opencode-agent-team "OpenCode Agent Team repository"
[5]: https://github.com/langchain-ai/langgraph "LangGraph repository"
[6]: https://github.com/UKGovernmentBEIS/inspect_ai "Inspect AI repository"
[7]: https://github.com/haowjy/orchestrate "orchestrate repository"
[8]: https://github.com/itohnobue/orchestrator-opencode "orchestrator-opencode repository"
[9]: https://microsoft.github.io/SkillOpt/docs/guideline.html "SkillOpt guidance"
[10]: https://github.com/promptfoo/promptfoo/blob/main/src/providers/agentWorkspace.ts "promptfoo agent workspace implementation"
[11]: https://github.com/winsw/winsw/blob/master/doc/selfRestartingService.md "WinSW self-restarting service guidance"
[12]: https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/langgraph/pregel/_retry.py "LangGraph retry implementation"
[13]: https://github.com/UKGovernmentBEIS/inspect_ai/blob/main/docs/_errors_and_retries.md "Inspect AI errors and retries"
[14]: https://github.com/itohnobue/orchestrator-opencode/blob/main/.opencode/plugin/subagent-barrier.js "OpenCode orchestrator subagent barrier"
