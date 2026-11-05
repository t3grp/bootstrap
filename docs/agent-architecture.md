# Bootstrap agent architecture

Version: 0.2 proposal. This document defines the agent resource and collaboration contracts for the initial implementation. Read it with the [technical design](technical-design.md); its action gateway, approvals, connection bindings, and recovery requirements continue to apply.

## 1. Product and implementation boundary

An agent is a persistent teammate with instructions, skills, routines, memories, files, and tables. The founder can talk directly to any specialist, assign work explicitly, or choose an optional coordinator. A coordinator uses the same agent contract and permissions as every other teammate; it is not compulsory infrastructure or an obligatory intermediary.

Openbot provides the architectural reference for persistent identities, separate execution threads, durable messaging, and explicit delegation. The reference is upstream commit `4b39c9a497cfd4af7a718cfdeab52e2059ca6b91`, whose [README identifies a PolyForm Noncommercial license][openbot-readme]. Bootstrap implements these concepts originally; no Openbot source is copied. Its PostgreSQL, pg-boss, AI SDK, and web architecture does not depend on Openbot's desktop transport or provider processes.

## 2. Separate identity, work, context, and execution

Openbot distinguishes an agent's persistent identity from its task execution threads and queues. Bootstrap retains that distinction with the following records. [Reference: agent tasks][openbot-agents].

| Record | Required meaning and fields |
| --- | --- |
| `Agent` | Workspace, stable ID, name, role, status, active configuration version. Survives conversations and completed tasks. |
| `AgentVersion` | Immutable instructions, output expectations, model profile, skill installation versions, and configuration revision. Grants remain separately revocable. |
| `Task` | Objective, completion criteria, user/agent/unassigned ownership, parent/root task, revision, state, accepted result, and initiating human authority. The delegation contracts below apply to agent-assigned tasks. |
| `ExecutionThread` | Agent, context kind, optional task/channel, ordered transcript, and context checkpoints. A task gets its own thread without creating another agent. |
| `Run` | Task/thread, task revision, configuration snapshot, root run, checkpoint, attempt/fencing epoch, status, and usage. |
| `Message` / `Delivery` | Durable communication content and each recipient's independent admission/execution state. |

All records carry `workspace_id`; composite relationships enforce that boundary. Task completion depends on accepted evidence or verified effects. A completed model turn, delivered message, and successful business task are different outcomes.

Task threads share only granted resources. Separate model context does not isolate a shared file or table. Resource version checks and application permissions still apply. Recovery increments an attempt or fencing epoch on existing work; it does not create a fresh budget.

## 3. Every agent exposes six resource areas

### Instructions

Store a versioned role, standing instructions, responsibilities, completion expectations, and escalation guidance. Editing creates a draft version; activation is an authenticated founder operation. Existing runs retain their snapshot unless the founder explicitly restarts or revises the task. Tool permissions live in grants, so an instruction saying “use all accounts” grants nothing.

The context builder records which instruction version each model step received. Agent proposals to edit instructions remain reviewable changes, not self-authorized policy updates.

### Skills

Use `Skill`, immutable `SkillVersion`, and `AgentSkillInstallation` records. A version includes name, description, instruction entrypoint, packaged resource references, content hash, origin, license/provenance, and declared capability needs. An installation pins a version, records who installed it, and has an enabled flag.

The initial format supports a `SKILL.md` entrypoint and referenced documents. Executable bundles require a separate sandbox and capability review and are outside the initial release. Installation validates package paths, sizes, hashes, and supported content. A new library revision does not silently update installed agents. Updating an installation is explicit and does not alter an executing run's snapshot. These version and installation distinctions follow the useful [Openbot skill model][openbot-skills].

A skill can describe how to use a tool; it cannot install credentials, widen grants, or bypass approval. Context loads skill summaries first and relevant content on demand within its budget.

### Routines

`Routine` is owned by the workspace, has one responsible agent, and references an immutable definition: instruction, pinned `AgentVersion` and selected `SkillVersion` IDs, trigger, timezone, input/resource scope, output destination, limits, and missed-occurrence policy. Updating an agent or skill installation does not silently alter a routine; adopting new versions creates an explicit routine revision. Current grants and revocations still apply. `RoutineOccurrence` records the planned time or event identity and points to its message and root run.

Schedule ticks create ordinary durable work through the mailbox. The scheduler rechecks enabled state and definition revision before committing an occurrence. Enforce uniqueness on `(workspace_id, routine_id, occurrence_key)`. Pause, resume, edit, manual test, and run history are available on the agent's Routines tab. Existing timezone and catch-up rules in the technical design apply.

A scheduled run may produce a recorded “no update” result without notifying the founder. Failure, missing access, and approval needs remain visible. An occurrence never inherits unlimited spend or permission to replay old external writes.

### Memories

Memory records include agent/workspace scope, text, provenance, source references and versions, manual or automatic origin, revision, timestamps, and inclusion policy. Distinguish a small selected set included in context from searchable memories; Openbot makes a similar distinction between essential and searchable entries. [Reference: memory contract][openbot-memories].

Founder-controlled memories cannot be silently overwritten. An explicit user instruction to remember a fact authorizes that concrete addition. Agent-generated additions or corrections remain proposals until the owner accepts them; a successful run alone is not permission to persist a new fact. Commit an accepted proposal only after a fresh revision/authority check. Memory contains facts and preferences, not authorization. Retrieved source-derived memories retain access dependencies: revoked source access cannot be bypassed by retrieving its summary as memory.

Support inspect, edit, forget, and provenance views. Forget removes future retrieval and schedules derived-index cleanup under the documented retention policy. Historical receipts do not silently reintroduce forgotten text into new context.

### Files

The Files tab binds canonical `Document` and `File` resource kinds. `File` identifies an upload or generated file; immutable `FileVersion` records storage key, hash, media type, size, provenance, and producing run. Editable workspace text uses `Document` and `DocumentVersion`; selecting it does not create a duplicate File record. An explicitly exported document can produce a linked file. Resource grants authorize access; navigation bindings organize the agent view without copying material into an isolated agent library.

Messages carry authorized file/version references. Downloads and retrieval resolve IDs server-side, never model-supplied filesystem paths. An edit uses an expected version and creates a new version. Shared consumers see the same logical file, with explicit pinned references where reproducibility matters. Uploads, generated outputs, and imported sources use the existing private local/S3 storage adapter.

### Tables

Tables are also canonical workspace resources, available to multiple explicitly granted agents. Use `BusinessTable`, `TableColumn`, `TableRecord`, and revision/audit records. A table defines typed fields, required values, supported indexes, and a natural unique key where applicable. Start with text, number, date, checkbox, single select, URL, and file-reference fields.

Expose bounded typed list/query/insert/update/upsert operations. Parameterize database queries; agents receive no general SQL capability against application tables. Updates require an expected record revision. Upsert requires a declared unique key, so repeated research updates one lead or competitor rather than duplicating it. Schema changes and bulk deletion use explicit founder review; ordinary record writes follow their grants.

Openbot's shared table implementation allows every agent to read/write rows and uses creator ownership principally to control schema changes. Bootstrap deliberately uses explicit resource grants instead. [Reference: shared table implementation][openbot-tables].

## 4. Ownership, sharing, and context

The workspace owns canonical documents, files, and tables. `ResourceGrant` binds a typed resource ID to an agent with allowed operations, optional constraints, expiry, revision, and revocation state. `AgentResourceBinding` supplies navigation/pinning separately. Removing a binding does not delete the shared resource; revocation immediately blocks new reads and writes. Deleting an agent does not delete business documents, files, or tables.

Agent groups organize navigation. Collaboration channels contain a purpose, participants, task history, and decisions. Neither group membership, channel membership, nor a received message grants resource access. Context retrieval checks both the executing agent's current grants and the assignment scope before ranking or returning content.

A bounded context packet contains instruction/skill versions, selected memories, current task and revision, relevant messages, and authorized resource references. Additional history is retrieved deliberately. Instructions embedded in messages, files, table cells, or tool results remain untrusted input.

## 5. Single ownership and explicit delegation

The founder's selected agent owns the task. When routing is ambiguous, ask for a target or offer a suggestion; do not broadcast work. An optional coordinator can help select specialists. Each accepted task has exactly one current owner.

`assign_child` creates a child task while the parent owner remains accountable. `transfer_task` changes ownership only after the previous execution is stopped or reconciled. A child assignment includes objective, completion criteria, root/parent IDs, task revision, input references, allowed scope, deadline, and remaining budget. A child result includes status, evidence, output references, and any blocker/unblock action. This follows the explicit ownership and delegation pattern described in [Openbot channels][openbot-channels].

Waiting creates a durable dependency and sets the parent run to `waiting_input` with reason `teammate`; it releases the worker slot. Results resolve dependencies once. The parent resumes when its required children are terminal, or earlier on founder steering or a declared failure policy. Partial results remain usable.

Task corrections increment revision. Old deliveries and results cannot complete the revised task; preserve them as superseded evidence. Stop propagates to descendants. An agent cannot stop unrelated work, and reassignment does not conceal an uncertain external action.

## 6. Message and delivery contract

The server creates an envelope with message ID, workspace, authenticated sender, recipients, thread/task/root IDs, task revision, reply target, intent, kind, content parts, resource references, and timestamp. The model cannot select its trusted sender identity. Openbot similarly separates mailbox content from per-recipient delivery state. [Reference: mailbox][openbot-mailbox].

Bootstrap independently chooses two explicit intents:

- `action`: an assignment, question, or result that may create or resume executable work after admission checks.
- `notification`: retained information that never starts a model turn or satisfies an awaited result.

`kind` describes purpose (`assignment`, `question`, `result`, `update`); it does not confer authority. Notifications require `expects_reply=false` and cannot masquerade as task results. A necessary result uses `action`, references the original request, and identifies its task revision.

Each recipient gets a delivery ID, queue sequence, status, attempt, run linkage, timestamps, and error. States are `queued`, `claimed`, `running`, `completed`, `blocked`, `cancelled`, or `failed`. Notification deliveries complete on persistence without a run. Delivering an action acknowledges durable admission, not successful execution.

Initial envelope limits are 16 KiB of text and eight resource references. Transfer large content through authorized file references. Reject duplicate recipients, unknown agents, cross-workspace references, and self-assignment loops.

## 7. Durable admission and recovery

Resolve idempotency before reserving new capacity. A unique `(workspace_id, authenticated_sender_id, operation_key)` identifies an admission; its canonical payload hash includes recipients, reply target, content, references, and task revision. An identical replay returns the original receipt; a changed payload with the same key returns a conflict. For a new admission, one transaction validates current scope, reserves the message allowance, persists message/deliveries and any task transition, and inserts an outbox event.

An outbox dispatcher publishes delivery IDs to pg-boss. A unique inbox/claim record and fenced lease prevent duplicate logical execution when publication or acknowledgement repeats. A worker revalidates cancellation, task revision, scope, and budgets before a model step or tool call. No database transaction remains open across a provider request.

Persist result acceptance, dependency resolution, and the parent's resume event atomically. After a crash, replay pending outbox entries and reclaim eligible deliveries from checkpoints. Never resend an ambiguous external write merely because a lease expired; use the action ledger's reconciliation path.

Routine occurrences, founder messages, and agent actions use this same admission path. HTTP and SSE are presentation transports; disconnecting the browser does not cancel accepted work. The queue coordinates delivery; application records own business meaning and recovery.

## 8. Authority and shared execution limits

Every dispatch must satisfy initiating human authority, workspace policy, recipient agent grants, assignment scope, connection/resource identity, and applicable approval. A delegate may have specialist capabilities, but the assignment cannot expand the founder's authorized task. Sending credentials or approval text in a message cannot substitute for a grant or an approval record.

All children, retries, and synthesis share the root run's atomic budget ledger. Proposed evaluation defaults:

| Limit | Default |
| --- | --- |
| Delegation | One level from any selected owner; three child assignments per root |
| Active model concurrency | Two per workspace |
| Model steps / tool attempts | 24 / 40 per root |
| Active execution time | Ten minutes; durable waiting tracked separately |
| No-progress attempts | Three equivalent attempts, then block |
| Actionable coordination deliveries | 12 per root, counting each recipient |
| Notification deliveries | 12 per root, counting each recipient |
| Approval validity | 24 hours, shortened by material changes |
| Spend / context / output | Explicit configured caps; no unlimited default |

An idempotent replay creates no second delivery allowance, while actual execution retries still consume execution budgets. Notifications consume their own allowance and any tool attempt used to send them. Budget exhaustion preserves outputs and reports remaining work. A human can start a new bounded attempt; agents and routines cannot reset counters.

## 9. API and interface requirements

Agent details expose Instructions, Skills, Routines, Memories, Files, and Tables, plus task/activity history. File/table views distinguish owned business resources from the agent's granted access without presenting duplicate libraries. The founder can open any specialist's chat directly.

Add typed workspace-scoped operations for instruction activation, skill installation, memory changes, resource bindings/grants, table schema/record operations, message submission, child assignment, result submission, and transfer. Creates accept idempotency keys; edits require revision preconditions. Return durable IDs and current state. SSE exposes delivery, dependency, task, resource-version, and budget changes through the existing authenticated event stream.

The activity view shows owner, delegated work, waiting reason, receipts, and accepted outputs. Internal notifications stay inspectable without creating conversational noise. Business outcomes and required founder decisions remain prominent.

## 10. Acceptance gates

1. Repeated admission after a lost response returns one receipt; changed payload reuse conflicts.
2. A notification never starts a turn, before or after restart.
3. Child results resume the correct parent once; stale revisions cannot complete corrected tasks.
4. Forged senders, cross-workspace IDs, and ungranted resource references are rejected.
5. A delegate cannot widen account, tool, resource, or approval authority.
6. Routine recovery preserves one occurrence and the original delivery/run identity.
7. Two agents edit the same canonical file/table with revision conflicts instead of lost updates or isolated copies.
8. Revocation blocks queued work and retrieval; deleting an agent preserves workspace business data.
9. Child/retry activity exhausts the shared caps without silently resetting them.
10. Worker loss during external dispatch enters existing reconciliation rather than automatic duplicate execution.

[openbot-readme]: https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/README.md
[openbot-agents]: https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/docs/architecture/agents.md
[openbot-skills]: https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/docs/architecture/skills-and-plugins.md
[openbot-memories]: https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/packages/contracts/src/ipc-agent-memories.ts
[openbot-tables]: https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/src/backend/agent-data/agent-tables.ts
[openbot-channels]: https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/docs/architecture/channels-and-messaging.md
[openbot-mailbox]: https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/src/backend/mailbox-store.ts
