# RyzeFramework External Memory Provider Candidate Review

**Review date:** 2026-11-27
**Scope:** Hindsight, Mem0, Letta, Graphiti, Zep, Memori, and MemPalace
**Decision posture:** MemPalace selected for the next implementation track after Gate 0/1; no installation, production data, or live secrets

## Executive recommendation

RyzeFramework should **not adopt any reviewed candidate as its authoritative memory system**. By the owner's decision, **MemPalace is selected as the next implementation target**, but it remains a derived retrieval/projection component until its adapter, failure, Windows, export/restore, and authorization behavior are implemented and accepted. SQLite must remain Ryze's sole canonical authority for memory records, ownership, Personal/System classification, consent, provenance, versions, tombstones, branch lineage, audit events, and replication state. Every external system reviewed is better understood as a derived retrieval, enrichment, graph, or agent-runtime projection behind a provider-neutral `MemoryProvider` adapter.

The best shortlist for a later controlled evaluation is:

1. **MemPalace** — strongest local/verbatim source-preservation candidate, subject to Windows packaging, owner-isolation, and no-automatic-capture testing.
2. **Mem0** — best general-purpose secondary Personal Memory retrieval candidate for a TypeScript/Node application, subject to local Windows and deterministic outbox testing.
3. **Hindsight** — strongest retrieval breadth and temporal/evidence model, with unusually good Windows and TypeScript integration signals; operationally heavier because it owns PostgreSQL/pg0 and performs asynchronous LLM-driven consolidation.
4. **Graphiti** — strongest specialist candidate for temporal, relationship-aware, provenance-linked retrieval, but a poor fit for a local Node/SQLite baseline because it requires a Python and graph-database sidecar.

**Conditional secondary shortlist:** Memori is worth a narrow SQLite/BYODB compatibility spike if its Python-centric documented path can be proven from the required Windows TypeScript environment. **Letta** should be considered only as an optional agent runtime/orchestration layer, not a memory provider. **Zep** is a remote/hosted derived-context option, not a Stage 1 local base, and should be deferred unless Ryze explicitly accepts network, privacy, and service-dependency tradeoffs.

The owner has directed that comparative evaluation of the other candidates be skipped. The implementation track is therefore **MemPalace only**, beginning after Gate 0 and Gate 1. Mem0, Hindsight, Graphiti, Memori, Letta, and Zep remain documented alternatives but are not to be installed or evaluated in this workstream unless the owner reopens that decision.

## Decision constraints and evaluation rules

These constraints are requirements for Ryze, not vendor claims:

- **SQLite remains authoritative.** External stores may contain rebuildable projections only. They must never become the canonical source for ownership, policy, system instructions, branch state, deletion, or replication.
- **Provider-neutral adapter.** Ryze should expose a stable interface such as `addCandidate`, `search`, `get`, `delete`, and optional `reindex`, while provider-specific SDKs remain behind adapters.
- **Owner approval and provenance.** A user or authorized owner must approve any memory admission. Each canonical record must retain source event ID, actor/owner, timestamp, model/provider, confidence, consent/sensitivity, version, branch, and deletion/revocation state.
- **No automatic capture by default.** Conversation interception, background augmentation, automatic prompt injection, trace capture, and LLM-derived writes must be disabled unless an explicit Ryze policy enables them for a defined scope.
- **System Memory is protected.** No candidate's tags, banks, user IDs, repositories, graphs, or entity scopes are sufficient by themselves to authorize access to protected System Memory. Ryze must enforce policy before retrieval and again before prompt inclusion.
- **No Stage 3/4 claims from a memory provider.** A provider may assist with retrieval or enrichment; it is not thereby a watchdog, skill sandbox, approval gate, safety monitor, replication protocol, branch manager, or Master/Slave authority.
- **External evaluation is gated.** Use synthetic or redacted fixtures only; do not provide production data, live credentials, personal Telegram content, or unrestricted agent access. Evaluation must be cancellable and reversible.

## Comparison at a glance

| Candidate | Primary role | Local Windows/Node fit | SQLite-authority fit | Retrieval strength | Stage 1 disposition |
|---|---|---:|---:|---:|---|
| **Mem0** | Extracted fact and semantic memory index | Medium | Medium-low without adapter | Strong general-purpose retrieval; OSS differs from hosted Platform | Shortlist/defer; evaluate first |
| **Hindsight** | Multi-strategy agent-memory service | Good integration signals, heavier runtime | Low direct fit; PostgreSQL/pg0 | Very strong semantic, keyword, graph, temporal, reranking, budgets | Shortlist/defer; evaluate second |
| **Graphiti** | Temporal Context Graph projection | Low-medium; Python plus graph backend | Low direct fit | Excellent temporal/graph/provenance retrieval | Specialist shortlist/defer |
| **MemPalace** | Local verbatim memory with pluggable retrieval backend | Good local signal; Python/CLI/MCP, TS SDK unverified | Best conceptual coexistence; SQLite metadata plus index | Strong source preservation; semantic/lexical retrieval | Shortlist/defer; evaluate first |
| **Memori** | Structured augmentation and recall | Unverified for required TS/Windows BYODB path | Medium potential, but own tables and writes | Useful facts, entities, ranking, decay, semantic recall | Conditional spike only |
| **Letta** | Stateful agent runtime/orchestration | Medium, but current Node/Bun requirements matter | Low as a memory provider | Runtime-mediated MemFS/Git memory, not SQL retrieval | Defer; runtime-only candidate |
| **Zep** | Hosted temporal context layer | Good SDK fit, remote dependency | Low for local Stage 1 | Strong temporal graph and provenance-linked context | Defer; remote enrichment only |

The table combines verified vendor facts with Ryze-specific fit judgments. “Fit” and disposition are architectural inferences, not promises made by the candidates.

## Candidate assessments

### 1. Mem0 — best first controlled retrieval experiment

**Verified facts.** Mem0 is an active open-source memory layer with Python and TypeScript SDKs, a self-hosted FastAPI/Docker server, and a separate managed Platform. Its OSS model extracts durable facts from messages, stores metadata and embeddings, and supports add/search/update/delete/history operations with `user_id`, `agent_id`, and `run_id` scoping [1][2]. The TypeScript surface is asynchronous and supports configurable LLMs, embedders, vector stores, rerankers, and history stores. OSS TypeScript options include in-memory, Qdrant, pgvector, Redis, Supabase, Azure AI Search, Vectorize, and Milvus; SQLite is documented for history management, not as the semantic/vector authority [2][3]. The self-hosted server documents Postgres plus pgvector, localhost API/dashboard endpoints, JWT/API-key access, audit logs, and telemetry controls [4]. The repository and package are Apache-2.0 licensed [1][5].

Mem0's platform and OSS behavior must be kept separate. Official documentation says hosted Graph Memory and benchmark claims are not equivalent to OSS behavior; the default Node vector store is in-memory unless configured otherwise [2]. Current release/activity signals are positive, including coordinated Python and Node releases, but issue/PR counts and dates are snapshots rather than support guarantees [6].

**Advantages for Ryze.** Mem0 is the closest general-purpose match for a later TypeScript/Node secondary Personal Memory index. Stable owner/workspace/run identifiers can map to Ryze scopes; CRUD, search, history, and metadata are useful adapter primitives. Provider configuration is broad, and a self-hosted deployment is possible. It is less operationally specialized than a graph-first system and has a straightforward candidate-index interpretation.

**Disadvantages and risks.** LLM extraction and deduplication can merge or update facts, conflicting with deterministic provenance unless every write is mediated. The documented SQLite role is history management, not authoritative semantic storage. There is no verified built-in Ryze policy for protected System Memory, immutable canonical records, Master/Slave replication, or branch merge. The self-hosted stack adds Postgres/pgvector, Docker, credentials, upgrades, and possible telemetry/network paths. Hosted-only features and benchmarks must not justify local adoption. Exact FreeLLMAPI compatibility remains unverified and depends on endpoint/provider compatibility.

**Safe fusion pattern (design inference).** Write approved canonical records transactionally to SQLite first, then enqueue a redacted outbox job containing the canonical record ID, version, owner, branch, scope, and hash. The adapter may upsert a derived Mem0 memory using stable Ryze identifiers. On recall, Ryze authenticates and filters against SQLite, queries Mem0 only for candidates, validates returned IDs/version/hash/tombstone against SQLite, and records the retrieval event. Canonical delete/update becomes a SQLite tombstone followed by index reconciliation; Mem0 state is never treated as truth. For Stage 4, replicate SQLite events and rebuild a branch-specific Mem0 index rather than copying vector-store state.

**Stage fit.** Stage 1: moderate as a deferred secondary index, weak as the base store. Stage 2: moderate-to-good for Personal Memory after authorization and deletion tests; weak-to-moderate for protected System Memory. Stage 3: moderate only as a wrapped, allowlisted skill backend; not a watchdog or approval system. Stage 4: weak-to-moderate because identifiers and history help labeling but no native replication/conflict protocol was verified.

**Disposition:** **First evaluation candidate after the Ryze adapter contract exists; do not install now.**

### 2. Hindsight — strongest retrieval breadth, heavier sidecar

**Verified facts.** Hindsight is an active, MIT-licensed agent-memory API/service organized into isolated memory banks. `retain` extracts world and experience facts, entities, temporal information, relationships, and search representations; background consolidation creates evidence-backed observations with history. `recall` combines semantic, keyword/BM25, graph, and temporal retrieval, fuses/reranks results, and supports filters, source chunks, token budgets, and limits. `reflect` performs an agentic answer loop over retrieved memories [7][8][9]. It supports HTTP/REST, MCP, and a typed TypeScript client; the client exposes retain, batch retain, recall, reflect, bank creation, and version probing [10].

Deployment is explicitly available on Windows x86_64 through Docker, bare-metal installation, embedded pg0, and a Windows executable/release asset. The default embedded database is PostgreSQL-based pg0 and is documented as convenient for development but not recommended for production; production guidance uses external PostgreSQL 14+ with supported vector extensions. Docker documents API port 8888, control-plane port 9999, and persistent data under `/home/hindsight/.pg0` [11]. Provider configuration includes hosted, local, OpenAI-compatible, custom endpoints, Ollama, LM Studio, llama.cpp, and gateways such as LiteLLM [12].

**Advantages for Ryze.** Hindsight has the richest integrated retrieval model of the candidates: temporal grounding, graph relationships, keyword fallback, source chunks, evidence/history, token budgets, and optional synthesized views. Banks, tags, metadata, directives, and mission/disposition provide useful projection and query controls. Windows and TypeScript/Node integration are unusually strong signals for a localhost app. MIT licensing is permissive [13].

**Disadvantages and risks.** It directly conflicts with a strict SQLite-only base because it owns PostgreSQL/pg0 persistence. Retain/consolidation are asynchronous and LLM-driven, creating latency, cost, nondeterminism, and derived state. Tags and banks are scoping tools, not a complete Ryze authorization boundary. No verified native SQLite transaction integration, immutable Ryze event ledger, Master/Slave duplication, or branch/merge semantics exists in the reviewed sources. Running it adds a Python service, database process/files, models/providers, migrations, health checks, and recovery surface. Telegram support was not verified. FreeLLMAPI compatibility is only an inference if its endpoint is OpenAI-compatible.

**Safe fusion pattern (design inference).** SQLite commits the canonical event, owner/system class, ACL, provenance, version, branch, and revocation state. A durable outbox sends only sanitized, authorized projection jobs to a bank mapped to the owner/agent/branch, with opaque tags such as `ryze_owner`, `source_event_id`, and `schema_version`. Recall starts with SQLite policy evaluation, constrains bank/tag/type/time filters, then post-filters every returned ID against SQLite. Hindsight-derived reflection may suggest context but cannot decide policy. On correction or revocation, update SQLite first and enqueue deletion/rebuild; fail closed if freshness or authorization cannot be established. Stage 4 uses SQLite snapshots/event streams and separate Hindsight projections, never assumed bank copies.

**Stage fit.** Stage 1: conditional shortlist, but poor direct fit for SQLite authority. Stage 2: moderate for scoped Personal Memory; System Memory requires Ryze enforcement. Stage 3: moderate as an adapter behind an allowlisted skill and watchdog, not itself a watchdog. Stage 4: weak-to-moderate as a projection per branch, with no verified native replication/merge.

**Disposition:** **Second evaluation candidate if Ryze accepts a local sidecar; do not install now.**

### 3. Graphiti — best specialist for temporal relationship retrieval

**Verified facts.** Graphiti is a Python framework for temporal Context Graphs. It ingests text/JSON episodes, extracts entities and relationships, preserves episode provenance, supports custom Pydantic entity/edge types, and models bi-temporal valid/invalid windows. Retrieval combines vector similarity, BM25/full-text, graph traversal, temporal filters, and optional reranking. It supports provenance lookup, configurable search recipes, and valid/invalid time filters [14][15]. Supported graph backends include Neo4j, FalkorDB, and Amazon Neptune; Kuzu is deprecated, and a FalkorDB Lite extra has additional Python requirements. The official MCP server offers HTTP and stdio modes and Docker compositions [16]. Graphiti is Apache-2.0 licensed [17].

**Advantages for Ryze.** Temporal validity, episode provenance, multi-hop relationships, and custom constrained types are valuable for domains where “what was true when” matters. Incremental ingestion avoids full graph recomputation. Its source and MCP surfaces support an isolated experiment.

**Disadvantages and risks.** It is Python/graph-database-first, not native TypeScript/Node/SQLite. Tenancy, access control, and operations are explicitly application responsibilities. It adds a graph process, backup and synchronization complexity, LLM/embedding configuration, and likely a sidecar lifecycle on Windows. No native Telegram, OpenCode, FreeLLMAPI, Ryze provider, watchdog, replication, or branch/merge capability was verified. Active issue volume and package/commit version differences support pinning a reviewed version [18].

**Safe fusion pattern (design inference).** Use an outbox from committed SQLite events into a pinned Graphiti sidecar, carrying immutable record/version IDs, owner scope, memory class, source URI, timestamps, and policy labels. Translate an authorized SQLite scope into graph filters, limit results, then re-check all IDs, versions, and tombstones against SQLite. Treat stale or failed graph ingestion as projection failure and replay the outbox. For Stage 4, branch and replicate SQLite first, then rebuild isolated graph projections; never merge graph state directly.

**Stage fit.** Stage 1: defer because it violates the local Node/SQLite baseline. Stage 2: strong optional temporal/provenance projection after policy tests. Stage 3: limited MCP/adapter fit, not a watchdog or policy engine. Stage 4: poor native fit; temporal validity is not replication or branch merge.

**Disposition:** **Third evaluation candidate only if temporal graph retrieval is a demonstrated requirement.**

### 4. MemPalace — strongest local/verbatim-preservation candidate

**Verified facts.** MemPalace (`MemPalace/mempalace`) is a local-first MIT-licensed system that stores conversation history verbatim and retrieves it with semantic search. Its structure uses wings (people/projects), rooms (topics), closets (summaries), and drawers (verbatim memories). The default retrieval backend is ChromaDB, while the project documents a pluggable backend contract and a local SQLite metadata layer; alternatives include SQLite exact, Milvus, Qdrant, and pgvector [19][20]. Its CLI/MCP surface includes search, add, duplicate check, delete, checkpoint, knowledge-graph queries, timelines, and diary entries [20].

**Advantages for Ryze.** Verbatim storage directly supports Ryze's rule that derived summaries must retain and never replace source records. It is local-first, does not require an API key for the core path, and has explicit scopes and duplicate-check operations. The SQLite metadata plus rebuildable retrieval index is conceptually compatible with a provider-neutral projection, and MIT licensing is permissive [21]. It may be more privacy-preserving and less lossy than an automatic fact-extraction system.

**Disadvantages and risks.** It is Python/CLI/MCP-first; no first-party TypeScript/Node SDK was verified. ChromaDB and embedding/native dependencies add Windows packaging and index-repair complexity even though metadata uses SQLite. The default branch is `develop`, and the repository has a large open-issue count, so a reviewed release/commit must be pinned [22][23]. Its auto-save hooks and search-before-answer skills must not be enabled in Ryze because automatic capture is off by default. Wings/rooms/drawers are not a complete owner/category/sensitivity/branch policy, and cross-installation backup/merge behavior remains unverified.

**Safe fusion pattern (design inference).** Keep canonical records, owner/category/type, provenance, version, sensitivity, branch, approval, and tombstones in Ryze SQLite. Send only approved, sanitized source text through a durable outbox, with Ryze record/version/source metadata. Prefer an explicit read-only or owner-approved recall adapter; disable auto-save hooks and broad skills. Scope palace structures by owner/project, then post-filter every result against SQLite before model inclusion. Treat ChromaDB/index state as rebuildable cache state. For Stage 4, export or replay canonical SQLite events into a new palace/namespace; do not treat a Git or palace copy as the merge authority.

**Stage fit.** Stage 1: good research fit but not a replacement for SQLite. Stage 2: promising for source-preserving Personal/Experience recall after Windows and ACL tests. Stage 3: moderate as an explicit recall tool, not a watchdog or skill-approval system. Stage 4: weak-to-moderate as a rebuildable branch projection, with no verified canonical branch/merge protocol.

**Disposition:** **First evaluation candidate for a verbatim/local baseline; do not install now.**

### 5. Memori — promising SQLite angle, insufficient TypeScript proof

**Verified facts.** Memori is an agent-oriented augmentation and recall layer with Python and TypeScript SDK areas, cloud mode, BYODB support, integrations, and MCP-related materials. Its documented scopes combine `entity_id`, `process_id`, and `session_id`; it extracts facts, preferences, skills, attributes, events, rules, people, and relationships, and supports automatic/manual recall, semantic retrieval, relevance thresholds, ranking, decay, and execution traces [24][25]. BYODB documentation explicitly lists SQLite and demonstrates a Python `sqlite3` connection, while naming Memori-owned tables such as conversation-message, entity-fact, process-attribute, and knowledge-graph tables [26]. The project is Apache-2.0 licensed [27].

**Advantages for Ryze.** It has the clearest documented SQLite/BYODB story among candidates, plus structured memory categories, process/session attribution, and manual recall. It may fit a derived projection if its database ownership and transaction behavior are isolated. TypeScript support and provider/framework breadth are useful signals.

**Disadvantages and risks.** Cloud is the default zero-configuration path and requires a service key. The SQLite proof is Python-centric; turnkey parity for a Windows TypeScript/Node app is unverified. Automatic augmentation and prompt injection can create uncontrolled writes or leakage unless disabled. No protected System Memory, immutable provenance/version ledger, Master/Slave replication, branch model, Telegram/OpenCode/FreeLLMAPI-native integration, or Ryze provider contract was verified. PyPI labels the project Alpha, while the TypeScript package is much earlier/version-skewed, with low download signals and one listed maintainer [28].

**Safe fusion pattern (design inference).** Keep existing Ryze SQLite tables authoritative and, if evaluated, place Memori-owned tables in a separate database/schema or isolated projection area. Admission requires a SQLite transaction and outbox. Disable automatic capture and prompt injection by default; call manual, approved operations only. Retrieval returns candidate derived facts that Ryze validates against owner, branch, class, consent, version, and tombstone state. Stage 4 rebuilds or invalidates Memori indexes from canonical SQLite events.

**Stage fit.** Stage 1: conditional only after a Windows TypeScript BYODB proof. Stage 2: partial, potentially useful for Personal Memory but not System Memory. Stage 3: partial enrichment/trace fit, weak governance fit. Stage 4: poor/unverified.

**Disposition:** **Fifth, narrow compatibility spike only; otherwise defer.**

### 6. Letta — useful runtime, not a MemoryProvider

**Verified facts.** Letta is a stateful-agent harness/runtime with persistent agents, conversations, MemFS memory, tools, skills, permissions, and streaming. The requested `letta` repository explicitly directs active development to `letta-code`; the older repository includes the retired V1 API server. The active TypeScript source exposes App Server/SDK, MCP, channels, Telegram modules, and memory functionality [29][30]. Official guidance separates responsibilities: the controller owns product objects, users, durable results, authorization, and retry/reconnect policy, while App Server owns agent execution, tools, turn queueing, permissions, and event streaming [31]. Local deployment stores state locally and supports WebSocket access; current package metadata declares very new Node/Bun engine requirements [32].

**Advantages for Ryze.** It can provide stateful agent execution, tools, skills, permissions, streaming, Telegram routing, and local/remote App Server integration. MemFS Git-backed repositories offer commits, refs, snapshots, historical reads, and content-hash preconditions. Apache-2.0 licensing and active TypeScript development are favorable [33].

**Disadvantages and risks.** It has no verified SQLite-authoritative MemoryProvider, SQL retrieval layer, or migration path from Ryze's schema. Agent-editable MemFS is runtime-owned and does not satisfy protected System Memory or owner policy. Documentation states external tools are not a security boundary. The active source boundary and rapidly changing runtime increase upgrade risk, and native Windows behavior was not independently verified. No native Master/Slave replication or branch merge for Ryze's canonical data was verified.

**Safe fusion pattern (design inference).** Give Letta only scoped, read-only context snapshots or narrowly scoped Ryze tools. Never grant direct SQLite file access. Proposed memory writes return through the Ryze controller, pass owner/System policy, commit to SQLite, and are optionally mirrored with record ID/version/provenance. Use separate Letta repositories/refs only as disposable runtime projections. Keep SQLite changesets and replication authoritative.

**Disposition:** **Defer as an optional agent-runtime experiment; reject as the memory authority.**

### 7. Zep — strong remote temporal context, wrong Stage 1 boundary

**Verified facts.** The requested `getzep/zep` repository is explicitly not the Zep product/runtime; it contains examples, integrations, ingestion, ontology, and evaluation materials for Zep Cloud. Current official deployment documentation centers on Cloud, BYOK, and enterprise BYOC; the reviewed sources do not document a current local SQLite/offline Windows server [34][35]. Zep's architecture uses temporal Context Graphs, user graphs, shared Context Graphs, episodes, source traceability, and asynchronous graph derivation. Retrieval supports automatic hybrid semantic/full-text/graph search, advanced filters, reranking, and context templates [36][37]. Official Node/TypeScript access is through `@getzep/zep-cloud`; remote MCP supports OAuth 2.1/PKCE and scoped graph tools [38].

**Advantages for Ryze.** Temporal facts, source episodes, user/shared graph separation, graph retrieval, provenance links, MCP, and a typed SDK could enrich a future remote adapter. Security guidance explicitly emphasizes controlled writes, scoped retrieval, and treating memory as untrusted evidence [39]. Graph cloning can create asynchronous full-copy snapshots [40].

**Disadvantages and risks.** It introduces network, credentials, service availability, privacy, and hosted data terms. The candidate repository is not itself a local server. There is no verified SQLite/offline mode, Telegram/OpenCode/FreeLLMAPI connector, or native Ryze policy. Provenance does not prove truth, default recall favors recall over precision, and graph cloning is not incremental branching, merge, or Master/Slave replication. License metadata is inconsistent between GitHub and npm and must be resolved before redistribution [41].

**Safe fusion pattern (design inference).** Use Zep only as an optional remote derived index after a SQLite commit and explicit redaction. Map each approved owner to a user graph; use shared graphs only for approved non-secret shared material. Query only after SQLite policy evaluation and pass returned context as untrusted evidence, never as system/developer instructions. If unavailable, Ryze must operate from SQLite. Use clones only as disposable projections keyed to a Ryze snapshot ID.

**Disposition:** **Defer; consider only when Ryze has a defined privacy/network budget and remote-provider contract.**

## Recommended evaluation order and gates

### Gate 0 — architecture and safety before any provider

Approve the provider-neutral interface and SQLite schema first. The minimum canonical model should include record ID, owner/tenant, class (`Personal`/`System`/other), source event, raw text/hash or protected reference, consent, provenance chain, model/provider, confidence, version, branch, status/tombstone, and audit timestamps. Define an outbox with idempotency key, projection version, retry count, error state, and freshness watermark. No candidate is installed before this gate passes review.

### Gate 1 — synthetic contract test with a mock provider

**PASS in the sandbox on 28 November 2026.** `server/memoryProviderContract.test.ts` exercises the provider-neutral governance boundary with a disposable in-memory provider: owner isolation, restricted retrieval exclusion/explicit inclusion, owner confirmation for duplicates/conflicts/restricted writes, and append-first source lineage. The test ran 3 tests successfully; `pnpm run check` also passed. This is a contract-harness result, not MemPalace integration or Windows acceptance.

### Next implementation gate — MemPalace adapter

Implement MemPalace behind the existing `MemoryProvider` boundary only after an owner-approved implementation change. Use a disposable Windows-compatible environment and synthetic owners; disable auto-save hooks, search-before-answer skills, and any broad MCP write access. Test verbatim source retention, duplicate checking, owner/project isolation, explicit approval, index rebuild, restart, export/restore, CPU/RAM/disk use, and failure fallback to SQLite. Do not treat selection as proof of compatibility or authorization to send production data.

### Deferred alternative — Mem0

Comparative evaluation is intentionally skipped. Mem0 remains documented as an alternative only; do not install or evaluate it in this workstream.

### Deferred alternative — Hindsight

Comparative evaluation is intentionally skipped. Hindsight remains documented as an alternative only; do not install or evaluate it in this workstream.

### Deferred alternative — Graphiti

Comparative evaluation is intentionally skipped. Graphiti remains documented as an alternative only; do not install or evaluate it in this workstream.

### Deferred alternative — Memori

Comparative evaluation is intentionally skipped. Memori remains documented as an alternative only; do not install or evaluate it in this workstream.

### Separate tracks — Letta and Zep

Evaluate Letta only on the agent-runtime track: controller ownership, App Server lifecycle, Telegram routing, tool permissions, event replay, and least privilege. Evaluate Zep only on the remote-context track: data residency, network failure, cost, redaction, hosted-service terms, user/shared graph policy, and untrusted-context handling. Neither should compete with Mem0/Hindsight as a Stage 1 SQLite-adjacent memory index.

## Explicit reject and defer criteria

**Reject a candidate for Ryze's authoritative memory role if any of the following holds:**

- It requires its own database or service to be the source of truth for canonical memory.
- It cannot preserve or return a stable link to SQLite record/version/provenance state.
- It allows automatic capture, augmentation, deletion, or prompt injection to bypass owner approval.
- It cannot enforce owner, branch, consent, and System Memory policy through Ryze-side checks.
- It has no deterministic tombstone/reconciliation strategy.
- It treats tags, user IDs, banks, repositories, graph scopes, or tool permissions as a complete security boundary.
- It claims or is being used as a Stage 3 watchdog, approval gate, sandbox, or Stage 4 replication/merge authority without independent Ryze controls.

**Defer a candidate rather than reject it outright when:**

- Its retrieval value is plausible but local Windows/Node behavior is unverified.
- A Python, graph, PostgreSQL, or remote sidecar is acceptable only for a later optional track.
- OSS and hosted/platform features diverge materially and the local feature set has not been tested.
- The SDK/package/source boundary is changing or version-skewed; pinning and a compatibility spike are required.
- The candidate's licensing, telemetry, provider compatibility, or data residency requires procurement/legal review.

**Stop an external evaluation immediately if:**

- Production data, live secrets, personal messages, or unrestricted network credentials would be required.
- A provider attempts to write canonical SQLite state or inject unreviewed content into privileged prompts.
- Retrieval returns another owner, protected System Memory, tombstoned data, or a stale branch.
- Outbox replay is not idempotent, deletion cannot be reconciled, or failure does not fail closed.

## Final selection recommendation

For the current Ryze phase, **MemPalace is the selected implementation target, not the authoritative store**. Gate 0 architecture review and Gate 1 provider-neutral synthetic contract testing are complete. The next change must implement a reversible, SQLite-first MemPalace adapter using sanitized synthetic records only. The other six candidates are deferred and must not be installed or evaluated as part of this workstream unless the owner reopens the decision.

This preserves reversibility: Ryze can rebuild or discard every external projection, rotate providers without migrating authority, and continue operating from SQLite when a provider is stale, unavailable, too expensive, or unsafe.

## References

[1] Mem0 repository and README: https://github.com/mem0ai/mem0
[2] Mem0 OSS configuration: https://docs.mem0.ai/open-source/configuration
[3] Mem0 memory types and scoping: https://docs.mem0.ai/core-concepts/memory-types
[4] Mem0 self-hosted server README: https://github.com/mem0ai/mem0/blob/main/server/README.md
[5] Mem0 Apache License 2.0: https://raw.githubusercontent.com/mem0ai/mem0/main/LICENSE
[6] Mem0 releases: https://github.com/mem0ai/mem0/releases
[7] Hindsight homepage/architecture: https://hindsight.vectorize.io/
[8] Hindsight retain documentation: https://hindsight.vectorize.io/developer/retain
[9] Hindsight retrieval documentation: https://hindsight.vectorize.io/developer/retrieval
[10] Hindsight TypeScript client: https://www.npmjs.com/package/@vectorize-io/hindsight-client
[11] Hindsight installation/deployment: https://hindsight.vectorize.io/developer/installation
[12] Hindsight configuration: https://hindsight.vectorize.io/developer/configuration
[13] Hindsight repository/license: https://github.com/vectorize-io/hindsight
[14] Graphiti repository/README: https://github.com/getzep/graphiti
[15] Graphiti overview and quick start: https://help.getzep.com/graphiti/getting-started/overview and https://help.getzep.com/graphiti/getting-started/quick-start
[16] Graphiti MCP server: https://github.com/getzep/graphiti/blob/main/mcp_server/README.md
[17] Graphiti license: https://github.com/getzep/graphiti/blob/main/LICENSE
[18] Graphiti package metadata: https://raw.githubusercontent.com/getzep/graphiti/main/pyproject.toml and https://pypi.org/project/graphiti-core/
[19] MemPalace repository and README: https://github.com/MemPalace/mempalace
[20] MemPalace help and MCP tools: https://github.com/MemPalace/mempalace/blob/develop/mempalace/instructions/help.md
[21] MemPalace MIT license: https://raw.githubusercontent.com/MemPalace/mempalace/develop/LICENSE
[22] MemPalace GitHub metadata: https://api.github.com/repos/MemPalace/mempalace
[23] MemPalace release and package metadata: https://github.com/MemPalace/mempalace/releases/tag/v3.12.0 and https://pypi.org/project/mempalace/
[24] Memori repository/README: https://github.com/MemoriLabs/Memori/blob/main/README.md
[25] Memori concepts: https://memorilabs.ai/docs/memori-cloud/concepts/how-memory-works
[26] Memori BYODB and SQLite: https://memorilabs.ai/docs/memori-byodb/
[27] Memori license: https://raw.githubusercontent.com/MemoriLabs/Memori/main/LICENSE
[28] Memori release/package metadata: https://github.com/MemoriLabs/Memori/releases, https://pypi.org/project/memori/, and https://www.npmjs.com/package/@memorilabs/memori
[29] Letta repository status: https://github.com/letta-ai/letta
[30] Letta active source package: https://raw.githubusercontent.com/letta-ai/letta-code/main/package.json
[31] Letta App Server integration patterns: https://docs.letta.com/self-hosting/app-server/integration-patterns
[32] Letta deployment and local App Server: https://docs.letta.com/agent-sdk/deployment and https://docs.letta.com/self-hosting/app-server
[33] Letta memory, permissions, skills, channels, and license: https://docs.letta.com/configuration/memory, https://docs.letta.com/configuration/permissions, https://docs.letta.com/configuration/skills, https://docs.letta.com/self-hosting/channels, and https://raw.githubusercontent.com/letta-ai/letta/main/LICENSE
[34] Zep repository identity: https://github.com/getzep/zep
[35] Zep architecture/deployment: https://help.getzep.com/architecture-patterns and https://help.getzep.com/security-compliance
[36] Zep graph overview: https://help.getzep.com/graph-overview
[37] Zep retrieval: https://help.getzep.com/retrieving-context
[38] Zep TypeScript SDK and MCP: https://github.com/getzep/zep-js and https://help.getzep.com/context-mcp-server/connect
[39] Zep memory security: https://help.getzep.com/memory-security
[40] Zep graph cloning: https://help.getzep.com/cloning-graphs
[41] Zep source traceability, changelog, and package metadata: https://help.getzep.com/source-traceability, https://help.getzep.com/v4/changelog, and https://www.npmjs.com/package/@getzep/zep-cloud
