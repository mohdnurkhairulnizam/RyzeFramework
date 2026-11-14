# Origin Blueprint

This file is the project’s versioned copy of the technical design baseline supplied for the RyzeFramework merge. It is retained verbatim as the source of architectural intent.

PERSONAL AI AGENT

MASTER TECHNICAL BLUEPRINT

Stages 1–4: Architecture, Implementation Methodology, Procedures & Verification

Document Date: 14 November 2026
Document Status: Technical Design Baseline
Development Phase: Architecture and Implementation Planning
Scope: Stage 1, Stage 2, Stage 3 and Stage 4 only

---

PART A — PROJECT OVERVIEW

1. Project Objective

The objective is to develop a personal, general-purpose, goal-driven AI agent capable of understanding objectives, planning tasks, executing operations, retaining knowledge, developing new capabilities and recovering from operational failures.

The intended system is not simply a chatbot.

It must eventually be capable of:

1. Understanding user instructions and objectives.
2. Breaking complex objectives into executable tasks.
3. Selecting appropriate AI models and tools.
4. Executing tasks through authorised applications and resources.
5. Processing documents, spreadsheets, files and data.
6. Maintaining persistent identity and long-term memory.
7. Learning from previous experiences.
8. Developing and improving its own skills under controlled conditions.
9. Recovering from software and operational failures.
10. Creating independent copies of its complete system.
11. Creating either Master or Slave installations.
12. Maintaining separate memory histories between installations.
13. Exchanging approved knowledge without losing original information.

The development approach is to establish the architecture and specifications first, then implement and test each stage progressively.

2. Initial Infrastructure and Constraints

The initial development environment is:

Component| Specification
Primary computer| HP laptop
Operating system| Windows 10 Home Single Language
Processor| Intel Core i5-7200U
RAM| 12 GB
Architecture| 64-bit
Initial model execution| Cloud-based
Initial AI engine| OpenCode
Model gateway| FreeLLMAPI
Initial interface| Telegram user account through a local Telethon worker
Version control| Git
Supporting automation| Python

Confirmed development constraints

- Docker is excluded.
- Initial development must remain relatively simple.
- Telegram is the initial communication interface through the owner-authorised user account and local worker.
- Cloud AI inference is preferred initially because of hardware limitations.
- Installation and implementation will follow architecture approval.
- Permissions must be controlled.
- Critical operations require owner approval.
- Stage 1 must not become unnecessarily complicated.

Colibri, Termux/SSH and a separate dashboard are not included in the initial Stage 1 implementation scope.

---

PART B — STAGE 1

FOUNDATION & EXECUTION ENGINE

1.1 Objective

Establish the operational foundation of the AI agent.

The purpose is to create an agent that can receive instructions, understand objectives, plan tasks, use AI models, execute approved operations and return verified results.

1.2 System Architecture

The initial architecture consists of four principal components.

Component| Responsibility
OpenCode| Main AI execution and orchestration
FreeLLMAPI| AI model gateway
Telegram user-account client / Python worker| User communication interface and Telegram integration
Python| Supporting automation and integration

Git provides version control for the system's source code, scripts and configuration.

Architecture workflow

Android Telegram account ↔ Telethon user-account worker → authenticated worker bridge → OpenCode → FreeLLMAPI → AI Model → Approved Tools → Result Validation → worker → Telegram account.

1.3 Component Responsibilities

A. OpenCode — Main Execution Engine

OpenCode acts as the primary execution environment.

Its responsibilities include:

- Receiving user instructions.
- Understanding the intended outcome.
- Planning task execution.
- Breaking objectives into smaller operations.
- Selecting appropriate tools.
- Managing tool execution.
- Handling task context.
- Collecting results.
- Validating outputs.
- Returning completed work.

OpenCode is the operational engine, not the permanent memory database.

B. FreeLLMAPI — Model Gateway

FreeLLMAPI provides the connection between OpenCode and available AI models.

Its responsibilities include:

- Connecting to configured AI models.
- Handling model API requests.
- Providing a model gateway independent of the execution engine.
- Allowing model selection without redesigning the entire agent.
- Supporting future model replacement.

The initial direction is cloud-based model inference.

C. Telegram User-Account Client — User Interface

Telegram remains the initial communication channel, using the owner-authorised Telegram user account rather than a Telegram bot account.

Required functions:

1. Receive user instructions through the owner-authorised Telegram user account.
2. Authenticate the account through Telethon using phone code and, when enabled, Telegram two-step password.
3. Accept supported file uploads through the worker.
4. Forward requests to the execution engine through a sanitized authenticated worker bridge.
5. Return progress information where appropriate.
6. Return generated reports.
7. Return processed documents and files.
8. Receive follow-up instructions.

The Telegram API credentials and Telethon session files remain local to the Python worker. The dashboard must never receive API hashes, raw phone numbers, session paths, session bytes, message bodies or raw Telegram objects. Login is an explicit owner action; the worker must refuse to operate when the local session is not authorized.

The worker-to-dashboard protocol is limited to sanitized heartbeats, approved control commands, acknowledgements and activity events. Arbitrary shell commands, file paths, Python expressions and Telegram credentials are not protocol fields.

The initial objective is to communicate with the AI through an Android device without requiring a separate dashboard.

D. Python — Supporting Automation

Python provides supporting functionality where direct OpenCode tool capabilities are insufficient.

Potential responsibilities include:

- File processing.
- Data conversion.
- API integration.
- Automation scripts.
- Supporting utilities.
- System integration.

E. Git — Version Control

Git maintains revision history for:

- Source code.
- Python scripts.
- Configuration files.
- System instructions.
- Skill definitions.
- Deployment scripts.

Git is not the only backup mechanism. Live memory databases and operational data require separate backups.

1.4 Task Execution Procedure

Every task should follow a controlled execution lifecycle.

1. Receive the user's instruction.
2. Authenticate the user.
3. Establish task context.
4. Interpret the intended outcome.
5. Break the objective into smaller tasks.
6. Identify the required AI model.
7. Identify the required tools and resources.
8. Check permissions.
9. Execute authorised operations.
10. Monitor execution.
11. Validate the actual results.
12. Record relevant execution information.
13. Return the result through Telegram.

A command being executed does not automatically mean the task has succeeded.

The agent must verify the result before reporting completion.

1.5 Permission Architecture

The execution engine must operate under controlled permission levels.

Level| Permission| Example
L0| Read-only| Inspect files and retrieve information
L1| Low-risk modification| Create drafts and temporary files
L2| Controlled execution| Execute approved scripts
L3| Administrative| Modify services and system configurations
L4| Critical| Delete important data or perform irreversible operations

Higher-risk actions require explicit owner approval unless a narrowly defined operation has already been authorised.

The AI model must not be able to override the permission system through its own instructions.

1.6 Stage 1 Completion Criteria

Stage 1 must demonstrate:

- Telegram user-account communication through the authorized Telethon worker.
- OpenCode execution.
- FreeLLMAPI connectivity.
- File upload and processing.
- Report and file delivery.
- Permission enforcement.
- Execution logging.
- Error reporting.
- Result validation.

Expected outcome: A functional AI agent capable of performing authorised tasks rather than merely answering questions.

---

PART C — STAGE 2

IDENTITY & ADVANCED MEMORY

2.1 Objective

Establish permanent AI identity and structured memory.

The AI must retain relevant knowledge across conversations, sessions and projects without having to reconstruct everything from the beginning.

2.2 Three Main Memory Categories

A. System Memory

System Memory contains information required to operate and maintain the AI.

It includes:

- Core system instructions.
- AI operating procedures.
- System architecture.
- Configuration references.
- Tools and dependencies.
- Skill registry.
- Permission policies.
- Recovery procedures.
- System identity configuration.

System Memory is protected.

Changes to important system instructions, permissions and architecture must follow a controlled revision process.

B. Experience Memory

Experience Memory stores information acquired through the AI's activities.

It includes:

- Previous conversations.
- Completed and incomplete tasks.
- Project information.
- Research findings.
- Successful solutions.
- Failed approaches.
- Troubleshooting.
- Diagnostics.
- User corrections.
- Lessons learned.
- Reusable procedures.

The objective is to prevent the AI from repeatedly solving the same problems from scratch.

C. Personal Memory

Personal Memory contains two separate elements.

AI Identity

- Permanent AI name.
- Identity description.
- Personality.
- Communication style.
- Working principles.

User Profile

- User preferences.
- Instructions.
- Relevant personal context.
- Working information.
- Preferred communication style.

The AI's identity must remain separate from the owner's identity.

2.3 Experience Memory Classification

Experience Memory should also support more specific memory classifications.

Memory type| Purpose
Episodic| Events, conversations and task history
Semantic| Facts and acquired knowledge
Procedural| Methods and instructions
Preference| User preferences
Project| Project-specific information

These are secondary classifications within the three main memory categories.

2.4 GitHub Memory Research

Three principal candidates were discussed.

Candidate 1: OpenCode Memory

Repository: "tickernelz/opencode-mem"

"https://github.com/tickernelz/opencode-mem" (https://github.com/tickernelz/opencode-mem)

<badge color="success">Earlier preferred candidate for further evaluation</badge>

Features discussed:

- OpenCode V2 integration.
- Markdown-based memory.
- Local vector storage.
- Automatic memory extraction.
- Automatic memory recall.
- Cross-project user profile.
- Memory interface.
- Profile and skills support.
- Redaction and encryption features.

Important limitation identified:

The earlier discussion raised a Windows multi-session limitation involving multiple Windows sessions sharing the same memory database.

This must be tested before selecting it for production.

Candidate 2: MemSearch

Repository: "zilliztech/memsearch"

"https://github.com/zilliztech/memsearch" (https://github.com/zilliztech/memsearch)

<badge color="info">Alternative candidate</badge>

The relevant retrieval approach discussed was:

1. Search for relevant memory.
2. Expand the retrieved result.
3. Access the original transcript.

An important design principle is to preserve original information.

A summarisation failure must not permanently destroy the quality of future memory retrieval.

Candidate 3: Mem0

Repository: "mem0ai/mem0"

"https://github.com/mem0ai/mem0" (https://github.com/mem0ai/mem0)

<badge color="secondary">Not selected</badge>

An OpenCode V2 plugin compatibility issue was identified during the earlier discussion.

It remained a comparison candidate rather than the selected implementation.

Letta and Graphiti were also mentioned during the earlier exploration. Their final roles were not decided.

2.5 Memory Storage Architecture

SQLite was considered as a possible local structured database.

However, the final database and retrieval architecture remain undecided.

The intended design should separate:

1. Memory storage.
2. Memory classification.
3. Memory retrieval.
4. Memory updating.
5. Memory reporting.
6. Memory backup and restoration.

Git manages code and configuration revisions. It must not be treated as the sole backup mechanism for the live memory database.

2.6 Memory Record Structure

Each memory record should contain:

Field| Purpose
memory_id| Unique record identifier
category| System, Experience or Personal
memory_type| Episodic, Semantic, Procedural, etc.
owner_scope| System, owner or authorised user
source_system_id| Originating installation
branch_id| Memory branch
timestamp| Creation or modification date
content| Actual information
tags| Classification and retrieval
version| Record revision
sync_status| Local, pending, synchronised or conflicted

The source and branch identifiers are particularly important for Stage 4.

2.7 Memory Operating Procedure

When the AI encounters new information:

1. Identify whether the information is worth retaining.
2. Determine its source.
3. Classify it.
4. Determine its memory category.
5. Check privacy and access restrictions.
6. Search existing records for duplicates.
7. Create or update the appropriate record.
8. Preserve the original source where possible.
9. Record timestamps and provenance.
10. Make the information available for future retrieval.

When performing a new task:

1. Identify the task context.
2. Search relevant memory.
3. Retrieve matching records.
4. Expand the original information where necessary.
5. Apply the retrieved knowledge.
6. Record new experience after completion.

The AI should retrieve relevant information rather than loading the entire memory database into every conversation.

2.8 Memory Reporting

Memory reporting should allow inspection of:

- Newly captured memories.
- Updated records.
- Duplicate records.
- Archived information.
- Rejected or excluded information.
- Memory classification.
- Source and timestamps.
- Project association.
- Memory branch.
- Retrieval results.

The exact report format and automated reporting schedule remain to be finalised.

2.9 Stage 2 Completion Criteria

- Persistent AI identity.
- Three main memory categories.
- Secondary memory classification.
- Memory creation and retrieval.
- Contextual memory search.
- Duplicate detection.
- Protected System Memory.
- Original source preservation.
- Memory export.
- Memory restoration.

Expected outcome: An AI that maintains its identity and remembers useful knowledge and experiences.

---

PART D — STAGE 3

AUTONOMOUS SKILLS & SELF-RECOVERY

3.1 Objective

Allow the AI to develop additional capabilities while protecting the stability of its existing system.

Stage 3 also introduces an independent watchdog responsible for detecting failures and recovering the system.

3.2 Skill Classification

Two categories of skills are required.

A. Core Skills

Core Skills are essential operating capabilities.

Examples:

- Task planning.
- Instruction interpretation.
- Permission checking.
- Memory operations.
- File management.
- Tool orchestration.
- Execution management.
- Monitoring and recovery.

Core Skills are protected against uncontrolled modification.

B. Evolving Skills

Evolving Skills are additional capabilities that the AI can develop.

Examples:

- Internet research.
- Browser automation.
- API integration.
- Excel processing.
- Document processing.
- Programming.
- Data analysis.
- Application automation.
- Specialised workflows.

The AI should be able to identify capability gaps and propose new skills.

3.3 Skill Registry

Each skill should have a structured record.

Field| Purpose
skill_id| Unique identifier
skill_name| Skill name
tier| Core or Evolving
version| Current revision
status| Active, testing or disabled
dependencies| Required components
permissions| Required access
validation_status| Testing result
previous_version| Rollback reference

3.4 Controlled Skill Revision and Replacement

The system must never blindly overwrite an operational skill.

The intended revision lifecycle is:

Stable Revision → Backup → New Revision → Isolated Testing → Validation → Approval → Promotion → Monitoring → Rollback if Required

Detailed procedure:

1. Identify a capability gap.
2. Analyse the required improvement.
3. Prepare the new skill revision.
4. Identify the currently active revision.
5. Back up the stable version.
6. Back up related configuration and data.
7. Develop the new revision separately.
8. Test its functionality.
9. Check dependencies and permissions.
10. Validate its output.
11. Obtain approval where required.
12. Promote the new revision.
13. Monitor its performance.
14. Roll back if it fails.

3.5 Replacing Hardcoded Values

Frequently changed values should not be scattered throughout application code.

The proposed configuration method is to separate application logic from configurable values.

For example:

Instead of embedding model endpoints, directory paths, model identifiers or operating settings directly in multiple scripts, the system should retrieve them through a central configuration interface.

The intended architecture is:

Application Code → Configuration Interface → Versioned Configuration

The configuration layer should support:

- Model endpoint.
- Model identifier.
- Working directory.
- Database location.
- Skill paths.
- Operational settings.
- Version information.

Secrets and API keys must be stored separately from ordinary configuration.

Configuration revision procedure

1. Identify the existing configuration schema.
2. Preserve the current configuration.
3. Create the new configuration revision.
4. Map old configuration values to new fields.
5. Validate required settings.
6. Test the application against the new configuration.
7. Activate the new revision only after successful validation.
8. Retain the previous configuration for rollback.

If a required configuration value is missing or invalid, deployment must stop rather than silently starting with an incorrect configuration.

Exact filenames, keys and migration scripts must be established against the actual installation before implementation.

3.6 Backup Architecture

Three recovery elements must be maintained separately.

Recovery item| Purpose
Git revision| Recover source code and configuration history
Last-known-good backup| Restore a verified working system
Memory backup/export| Recover operational memory and stored information

Additional recovery information should include:

- Previous stable skill versions.
- Required dependencies.
- Recovery configuration.
- Deployment records.
- Diagnostic logs.

Backup procedure

Before changing a production component:

1. Identify the active version.
2. Record its revision identifier.
3. Back up the working configuration.
4. Export or back up relevant memory data.
5. Preserve the previous stable application version.
6. Verify the backup.
7. Proceed with the new revision only after backup confirmation.

Restoration procedure

If the new revision fails:

1. Stop the affected operation.
2. Preserve diagnostic information.
3. Identify the last-known-good revision.
4. Restore the previous application files.
5. Restore the matching configuration.
6. Restore data only when necessary.
7. Verify database integrity.
8. Restart the affected services.
9. Perform health checks.
10. Record the recovery event.

Restoring an old memory database must not accidentally erase newer valid memory records.

3.7 Independent Watchdog

The watchdog is a separate recovery process.

It must not depend on OpenCode or the main AI engine to perform recovery.

Its responsibilities include:

- Monitoring approved processes.
- Detecting crashes.
- Detecting unresponsive services.
- Preserving diagnostic logs.
- Restarting approved services.
- Detecting repeated failures.
- Restoring stable revisions where authorised.
- Verifying recovery.
- Notifying the owner.
- Recording incidents.

Watchdog recovery procedure

Step 1 — Monitoring

The watchdog continuously checks the health of the main AI engine and designated services.

Step 2 — Failure Detection

A failure may be detected through a missed heartbeat, failed health check or terminated process.

Step 3 — Diagnostic Preservation

Before recovery, the watchdog preserves:

- Error logs.
- Process information.
- Failure timestamps.
- Relevant diagnostic information.

Step 4 — Recovery Decision

Determine whether the failure is temporary or whether the current revision is unstable.

Step 5 — Controlled Restart

Attempt an authorised restart.

Step 6 — Rollback

If the current revision remains unhealthy, restore the last-known-good application revision and compatible configuration.

Step 7 — Verification

Perform another health check.

Step 8 — Notification

Notify the owner through the available communication channel.

Step 9 — Experience Recording

Record the incident and recovery result in Experience Memory when the main system becomes available.

Watchdog protection

The watchdog must have:

- Bounded restart attempts.
- A cooldown period.
- Failure logging.
- Recovery verification.
- Protection against endless restart loops.
- Restricted administrative permissions.

A Windows Task Scheduler process, independent Python watchdog or another Windows-compatible supervisor may be evaluated.

The exact watchdog implementation, heartbeat interval, retry count and restart commands remain subject to technical testing.

3.8 Stage 3 Completion Criteria

- Core and Evolving Skills registered.
- Skill revision management.
- Configuration separation.
- Backup verification.
- Controlled deployment.
- Rollback capability.
- Independent watchdog.
- Crash detection.
- Service recovery.
- Diagnostic preservation.
- Owner notification.
- Recovery incident recording.

Expected outcome: An AI capable of expanding its skills while protecting its own operational stability.

---

PART E — STAGE 4

MASTER–SLAVE SYSTEM

Duplication, Migration & Memory Branching

4.1 Objective

Allow the Master installation to duplicate its complete AI system onto a pendrive or external storage device.

The owner must be able to choose the type of copy:

1. Master Copy.
2. Slave Copy.

The duplicated system must be capable of independent operation on a compatible computer.

Stage 4 is specifically about complete system duplication and migration, not sub-agent management.

4.2 Master System

The Master is the primary AI installation.

Its responsibilities include:

- Maintaining the original configuration.
- Maintaining system identity.
- Maintaining memory.
- Maintaining installed skills.
- Creating complete system copies.
- Selecting the copy type.
- Managing duplication.
- Recording the origin of each copy.

The initial Master installation is intended to reside on the HP laptop.

4.3 Copy Types

A. Master Copy

A Master Copy is another installation with Master-level capabilities.

It can operate independently and can potentially create further system copies.

B. Slave Copy

A Slave Copy is a working AI installation with restricted capabilities.

The exact restrictions have deliberately not been decided yet.

They must be defined separately before Slave implementation.

4.4 System Duplication Architecture

The duplication process must preserve the necessary components:

- AI execution engine.
- Required runtime.
- System configuration.
- AI identity.
- System Memory.
- Selected Experience Memory.
- Personal Memory according to copy policy.
- Installed skills.
- Skill registry.
- Supporting scripts.
- Required dependencies.
- Local database.
- Watchdog configuration.
- Recovery utilities.
- Launcher.
- Synchronisation manager.
- Backup metadata.

Sensitive credentials must not simply be copied as exposed plain-text values.

4.5 System Identity

Each installation must have a unique system identity.

Proposed identity fields:

Field| Purpose
system_id| Unique installation ID
parent_system_id| Source installation
snapshot_id| Duplication reference
copy_type| Master or Slave
branch_id| Memory branch
source_revision| Original system revision
created_at| Duplication date
configuration_version| Configuration revision

The duplicated installation must not accidentally retain the same active system identity as the original.

4.6 Portable Deployment

The Master should be able to create a portable system package on an external drive.

The package must be checked for:

- Storage capacity.
- Filesystem compatibility.
- Write errors.
- Package integrity.
- Required dependencies.
- Configuration validity.
- Memory database integrity.

The target computer must meet the operating-system and runtime requirements.

A pendrive alone cannot guarantee that every computer will run the system without preparation.

4.7 Independent Operation

After duplication:

System A: Original Master installation.

System B: Duplicated installation on the external drive.

Both installations must have:

- Their own system identity.
- Their own local configuration.
- Their own memory database.
- Their own memory branch.
- Their own logs.
- Their own skill versions.
- Their own synchronisation queue.

Both systems should operate independently without requiring the other installation to be online.

Offline operation remains subject to locally available tools and models. Cloud model access and cloud synchronisation require connectivity.

4.8 RUN Procedure

The portable system startup sequence:

1. Detect the external installation.
2. Check system compatibility.
3. Verify package integrity.
4. Unlock protected data where required.
5. Load configuration.
6. Open local memory.
7. Load approved skills.
8. Start required services.
9. Start the watchdog.
10. Perform health checks.
11. Report system readiness.

4.9 STOP Procedure

The shutdown sequence:

1. Stop accepting new tasks.
2. Complete or safely cancel active tasks.
3. Commit pending database changes.
4. Save memory.
5. Preserve execution logs.
6. Preserve unsynchronised records.
7. Stop services.
8. Confirm that no active writes remain.
9. Confirm safe removal of the external drive.

4.10 Memory Branching

Memory branching is a fundamental Stage 4 function.

When a Master creates a copy, the new installation receives a snapshot of the original memory.

After duplication, both installations can develop independently.

Example:

- Master A researches a technical solution.
- Master B independently discovers another solution.
- Each system retains its own experience.
- Both systems continue operating independently.
- Approved information can later be exchanged.

The system must preserve the origin of each memory record.

Every record should retain:

- Memory ID.
- Source system ID.
- Branch ID.
- Original snapshot reference.
- Creation timestamp.
- Version information.
- Synchronisation status.
- Sharing classification.

4.11 Google Drive Synchronisation

Google Drive was discussed as a possible central exchange repository.

It should not be treated as a live database simultaneously shared by both installations.

The intended architecture is:

Master A Local Database → Synchronisation Manager → Google Drive Exchange Repository ← Synchronisation Manager ← Master B Local Database

Each installation maintains its own local memory database.

Google Drive acts as the exchange point for approved information.

Upload procedure

1. Identify new or modified memory records.
2. Identify records pending synchronisation.
3. Apply memory classification.
4. Check sharing permissions.
5. Exclude private records unless authorised.
6. Validate records.
7. Package eligible information.
8. Upload to the exchange repository.
9. Verify successful upload.
10. Update the local synchronisation checkpoint.

Download procedure

1. Connect to the exchange repository.
2. Identify new records.
3. Download the records.
4. Verify package integrity.
5. Check unique IDs.
6. Detect duplicates.
7. Identify conflicting changes.
8. Apply sharing restrictions.
9. Merge approved records.
10. Preserve original provenance.
11. Update the synchronisation checkpoint.

Offline operation

When disconnected:

- Each installation continues using local memory.
- New experiences are stored locally.
- Eligible records are queued.
- Synchronisation takes place when connectivity returns.

4.12 Memory Sharing and Privacy

Not every memory should be shared.

Potentially shareable information:

- General technical knowledge.
- Troubleshooting solutions.
- Reusable procedures.
- Approved skills.
- General system improvements.

Private by default:

- Personal conversations.
- User identity information.
- Private preferences.
- Sensitive context.
- User-specific instructions.

The synchronisation manager must apply classification and sharing permissions before uploading information.

4.13 Conflict Handling

The two installations must never silently overwrite each other's memory.

The initial design should use an append-first approach.

When conflicting information is detected:

1. Preserve both original records.
2. Identify their source installations.
3. Identify their memory branches.
4. Record their versions.
5. Flag the conflict.
6. Place unresolved conflicts into a review queue.
7. Merge only through an approved resolution process.

4.14 Migration Modes

Two migration concepts were also discussed.

Master Migration

- Full system migration.
- Full or selected memory migration.
- Controlled Personal Memory transfer.
- Master-level administrative capabilities.

User Migration

- Simplified configured package.
- Approved settings.
- Selected skills.
- Selected memory.
- Authorised user profile.
- Restricted administrative access.

These migration modes must eventually be reconciled with Master Copy and Slave Copy.

They are related concepts, but their exact relationship has not yet been finalised.

4.15 Stage 4 Completion Criteria

- Master can create a complete system copy.
- Owner can select Master or Slave.
- Each copy has a unique identity.
- System can migrate to another compatible computer.
- Independent operation is verified.
- Memory branches remain separate.
- Approved memory synchronisation works.
- Duplicate detection works.
- Conflicts do not cause data loss.
- Offline operation works within available capabilities.
- Safe shutdown works.
- Backup restoration is verified.

Expected outcome: A Master system capable of creating independent Master and Slave installations while preserving system identity, memory history and controlled knowledge exchange.

---

PART F — IMPLEMENTATION SEQUENCE

6.1 Development Order

Order| Activity| Completion requirement
1| Inspect existing HP environment| Confirm actual software and dependencies
2| Implement Stage 1| Working execution engine
3| Test Stage 1| Telegram user-account worker, model, tools and permissions
4| Finalise Stage 2| Confirm memory technology
5| Implement Stage 2| Persistent structured memory
6| Test Stage 2| Retrieval, export and restoration
7| Implement Stage 3| Skill management and watchdog
8| Test Stage 3| Recovery and rollback
9| Finalise Stage 4| Duplication and migration specifications
10| Implement Stage 4| Master and Slave copies
11| Test Stage 4| Independent operation and branching
12| Implement synchronisation| Controlled memory exchange

Each stage must pass its completion tests before the next stage is considered operational.

PART G — IMPORTANT UNRESOLVED TECHNICAL DECISIONS

The following matters must not be treated as finalised:

Subject| Outstanding decision
Stage 1| Exact OpenCode configuration
Stage 1| FreeLLMAPI endpoint and model selection
Stage 1| Telegram user-account worker implementation details
Stage 2| Final memory platform
Stage 2| Database and retrieval integration
Stage 2| Automated memory reporting schedule
Stage 3| Exact configuration schema
Stage 3| Backup directory and scripts
Stage 3| Git branching and deployment procedure
Stage 3| Watchdog implementation technology
Stage 3| Heartbeat interval and retry policy
Stage 4| Exact Slave feature restrictions
Stage 4| Portable runtime packaging
Stage 4| Encryption and credential management
Stage 4| Google Drive integration
Stage 4| Memory conflict-resolution policy
Stage 4| Master/Slave versus migration-mode relationship

These decisions require technical verification and testing.

PART H — GOVERNING IMPLEMENTATION PRINCIPLES

The following principles apply across all four stages.

1. Never replace a working production component without preserving a recovery point.
2. Keep configuration separate from application code.
3. Keep secrets separate from ordinary configuration.
4. Use Git to track software and configuration revisions.
5. Back up live memory separately.
6. Test new revisions before deployment.
7. Preserve the last-known-good version.
8. Keep the watchdog independent of the main AI engine.
9. Preserve original memory and its provenance.
10. Never silently overwrite another installation's memory.
11. Apply permissions outside the AI model's own reasoning.
12. Verify actual results before reporting completion.
13. Maintain clear records of changes and recovery operations.
14. Do not mark a stage complete until its acceptance tests have passed.

---

FINAL PROJECT STATUS

Current status: Architecture and technical planning.

The four-stage architecture is defined as follows:

Stage| Primary responsibility
Stage 1| Foundation & Execution Engine
Stage 2| Identity & Advanced Memory
Stage 3| Autonomous Skills & Self-Recovery
Stage 4| Master–Slave System, Duplication, Migration & Memory Branching

The initial implementation direction is OpenCode, FreeLLMAPI and Telegram through an owner-authorised user-account worker, with a controlled permission system.

The memory research includes OpenCode Memory, MemSearch and Mem0, with OpenCode Memory as the earlier preferred candidate for further evaluation.

Stage 3 introduces controlled revisions, separate backups, configuration management and an independent watchdog.

Stage 4 introduces complete system duplication, Master and Slave copy selection, portable deployment, independent memory branches and controlled synchronisation.

No stage is considered implemented merely because its architecture has been documented.

This document is the working technical design baseline. Any future revision must preserve the decisions already established, explicitly record changes, and distinguish confirmed implementation from proposed improvements.

---

TELEGRAM USER-ACCOUNT INTEGRATION ADDENDUM

The Telegram interface is based on the connected RyzeTel implementation, not a bot token. A local Python worker uses Telethon's `TelegramClient` with a stable per-account session name. The owner completes login through a dashboard-controlled subprocess: the worker requests a phone code, accepts the code, handles `SessionPasswordNeededError` by requesting the two-step password, verifies `is_user_authorized()`, and then disconnects. Subsequent worker startup connects to the existing local session and refuses to continue when authorization is absent.

The worker is the only component allowed to access Telegram API credentials and session files. It sends only sanitized telemetry to the dashboard over an authenticated worker API. The worker must have a process lock so two instances cannot open the same Telethon SQLite session concurrently. Outbound actions require explicit approval, honour pause/stop state and suppression rules, use bounded retry/backoff for transient worker-to-dashboard failures, and log sanitized identifiers only.

This replaces the earlier Telegram bot proposal. Bot tokens, bot webhooks and bot-specific authentication are not part of the current design. The exact Telethon worker deployment, local session protection, owner identity binding, data retention, rate limits and approval UX remain implementation decisions subject to technical verification.
