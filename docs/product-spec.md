# Bootstrap product specification

Version: 0.2 draft. Date: 6 November 2026. Implementation status: planned.

## 1. Product purpose

**Bootstrap is a personal business workspace where founders organize projects, documents, tables, files, and work, supported by configurable agents.** The user supplies direction, creates and edits resources, and decides what to delegate. Agents help research, write, maintain information, and perform authorized actions through connected services.

The product promise is: **your workspace, with an agent team that understands your business and helps you get work done.** A founder can use projects, documents, tables, files, notes, and manual tasks without an agent or AI usage balance. Chat and agent activity support that work.

The initial audience is solo founders, consultants, agencies, SaaS founders, and digital-product operators. Their first outcomes include organizing a launch, preparing customer communication, managing client delivery, and maintaining an operating brief.

The hosted service provides one dedicated application instance per subscribed owner, containing that owner's workspaces. Subscription and AI-credit top-ups are separate launch requirements. The open-source edition also supports self-hosting. This revision supersedes the earlier coordinator-first and optional-hosting framing.

## 2. Ownership and product vocabulary

| Object | Meaning and ownership |
| --- | --- |
| Account and instance | One hosted owner and their provisioned application instance; billing is account-level |
| Workspace | One business or distinct area of work, with its profile, resources, agents, connections, and limits |
| Project | Workspace-owned objective grouping tasks, documents, tables, files, conversations, and activity |
| Document | Editable workspace content, including briefs, notes, procedures, and generated reports |
| File | A canonical uploaded or generated binary resource with metadata, versions, and access |
| Table | A typed, editable collection of records owned by the workspace |
| Task | Work assigned to the user, an agent, or nobody yet; includes status and completion criteria |
| Agent | Persistent instructions, skills, routines, memories, resource bindings, and execution limits |
| Run | One bounded attempt by an agent to perform an assignment |
| Action | A proposed or executed external-service operation with authorization and result evidence |
| Connection | One authenticated external account; service name alone does not identify it |
| Artifact | A versioned run output linked to a document, table change, file, task, or external result |

Projects and resources belong to the workspace. An agent's Files and Tables properties reference those canonical resources; attaching the same table to two agents does not create two copies. The owner can inspect and manage all resources. Workspace ownership does not automatically grant every agent access.

Agent bindings specify readable sources and permitted operations. Cross-workspace sharing is outside the first release; a run remains bound to its workspace. The owner can switch workspaces without silently transferring context, credentials, or agent permissions.

A conversation can contain several tasks; each task can have several attempts. Scheduled occurrences have distinct work/run identities and retain prior results. Output versions remain linked to their source run, subject to current access and retention policy. A document can be accepted without being published externally.

## 3. First-release scope

The first intended release includes:

- Owner identity, workspaces, business profiles, timezone, and projects.
- Manual tasks, editable documents and notes, files, bounded tables, and export.
- Workspace, project, and direct-agent conversations with selected resource context.
- Custom agents and templates exposing Instructions, Skills, Routines, Memories, Files, and Tables.
- Versioned skills, editable long-term memories, direct assignments, and bounded agent communication.
- Composio account connection and a certified action set for Gmail, Google Calendar, Notion, and GitHub.
- Exact action review, server-enforced permissions, recoverable runs, and cancellation.
- Simple scheduled routines, visible activity, usage limits, and in-app decisions.
- Hosted subscription, per-owner instance provisioning, and a separate AI-credit wallet.
- Docker-based self-hosting, demo fixtures, migrations, and backup/restore instructions.

The connector catalogue can show additional services, but only validated capabilities execute in the first release. Availability, configured credentials, granted access, and tested support are separate states.

Later releases can add multiple human collaborators, more certified integrations, advanced table views, event triggers, visual workflow editing, custom MCP servers, executable skill marketplaces, and isolated code execution. A complete CRM, accounting suite, spreadsheet engine, autonomous purchasing system, and unrestricted browser or shell operator remain outside initial scope.

## 4. Workspace resources and human work

### Projects, tasks, and capture

Projects group resources without duplicating them. Tasks support assignee Me/agent/unassigned, status, priority, due date, simple dependencies, and expected output. The user can create, reorder, complete, and reopen tasks manually. Assigning work to an agent is explicit; creating a project does not launch a team.

Everything and Today views help the user find projects, personal commitments, recent resources, and pending decisions. Notes and a persistent scratchpad capture information quickly. Turning a note into a document or task preserves its content and origin; it does not invoke AI unless requested.

### Documents and files

Documents support headings, paragraphs, lists, links, code, and simple formatted content, with autosave, versions, and Markdown export. Users can edit without AI. Agent proposals produce reviewable revisions; a sufficiently specific instruction can authorize an internal edit without repeated confirmation.

Files support upload, metadata, project association, download, replacement/versioning, and removal. Ingestion state is separate from upload success: queued, processing, ready, unsupported, or failed. A file that cannot be indexed remains downloadable. Agent access follows the canonical resource and current grants, including derived text and retrieval indexes.

Removing a resource revokes future retrieval and follows the documented retention policy. Referencing an old run must not bypass current access rules. Historical audit records can retain redacted metadata without exposing removed content.

### Bounded tables

The first table editor provides typed columns, stable row/column identifiers, row CRUD, grid view, sorting, filtering, search, selection, and CSV import/export. Initial field types are text, number, date, checkbox, single select, URL, and file reference. Document an initial capacity target and verify it before advertising performance.

Agents receive schema and scoped access to selected tables and permitted operations. Bulk changes show affected rows and a diff. Authorized routine updates can apply within defined fields and bounds. Every mutation checks resource versions; a stale proposal is rebased or returned for review instead of overwriting newer user edits.

Formula engines, relational databases, cross-table rollups, arbitrary scripts, public forms, and Notion-style page/database behavior are deferred. CSV import validates types and reports rejected rows; it does not silently execute formulas or discard invalid data.

## 5. Agents and collaboration

Agents are saved configurations invoked when needed. Creating an agent does not start a continuously running model. Growth/Research and Operations are starter templates; a Chief of Staff coordinator is optional. Users can directly assign any permitted specialist.

### Six agent properties

| Property | Contract |
| --- | --- |
| Instructions | Role, objectives, constraints, style, output expectations; editable and versioned |
| Skills | Assigned reusable procedures with inputs, required capabilities, steps, and expected outputs; pin each assignment to a skill version |
| Routines | Saved assignments or skills with resource scope, schedule, timezone, limits, and pause/history |
| Memories | Durable facts/preferences with origin, scope, status, and correction history; visible and editable by the owner |
| Files | Explicit bindings to canonical workspace documents/files with readable or writable scope |
| Tables | Explicit bindings to canonical tables, schema, and permitted record/field operations |

A tool performs an operation. A skill describes how to accomplish a class of work. A routine schedules a configured assignment. Instructions define the agent's role; memories preserve useful information between runs. Skills do not grant tools or credentials.

Skill updates never silently replace a pinned assignment. Show available updates and compatibility changes; apply a selected version to subsequent runs. Routines and runs record the skill/configuration versions they use. In-progress runs keep their snapshot, while permission revocations take effect immediately.

Memory is either workspace-scoped business knowledge or agent-scoped specialist context. Both remain owner-visible. Explicit “remember this” requests and reviewed suggestions can create memories. Store provenance and distinguish facts from inference. Correction supersedes earlier content; deletion stops future retrieval. Do not indiscriminately memorize conversation history or retain credentials as memories.

### Agent-to-agent communication

An assigned agent may request help from a named permitted agent. Messages carry task identity, requested result, shared resources, and remaining limits. Responses contain findings, sources, output references, and blockers. The project/task activity shows participants and who is waiting for whom.

Proposed defaults allow at most three child assignments, one delegation level, and one synthesis/revision pass within the root budget. Specialists cannot recursively form teams. The parent owns cancellation, total spend, tool-call limits, and active execution time.

A child receives the intersection of task authority, its own grants, and explicitly shared resources. Delegating to a more privileged agent cannot increase authority. Repeated failure produces a blocked result, not unlimited agent discussion. See [Agent architecture](agent-architecture.md) for the intended Openbot-based resource and runtime mapping.

## 6. Onboarding

1. Create an owner account. Hosted users subscribe and see instance provisioning progress; self-hosted users configure their deployment.
2. Create a workspace, set timezone, and describe the business. Confirm inferred profile suggestions.
3. Create a project or open the labeled demo. Add a document, task, file, or table immediately.
4. Choose a task for AI assistance and create or select the relevant agent.
5. Select its skill and exact resource scope. Hosted AI uses the configured service and wallet; self-hosted AI requires provider credentials.
6. Connect only the external service required for that assignment, verifying account identity.
7. Review the intended output, action policy, and limits; run the assignment.
8. Edit or accept the result. Offer recurrence only when a useful workflow has been established.

Connection or payment setup failures preserve completed onboarding steps. The user does not need an entire team or every integration to organize their workspace.

## 7. Reference workflows

### A. Customer launch workspace

The user creates a launch project, writes a brief, uploads product/pricing files, and creates a customer table containing company, contact, segment, status, and next action. They assign pricing confirmation and final offer approval to themselves.

They select customer rows and ask Growth/Research to prepare outreach. The agent uses its pinned skill, selected brief/files, and permitted sources. It may request one bounded specialist review. It returns proposed table enrichments and draft documents with sources.

The user edits the drafts and applies or rejects table changes. Sending an email uses the exact connected account, recipient, subject, content, and attachments. Choosing Send authorizes the unchanged action without a second identical confirmation. The executor rechecks grants, sends, and records provider evidence. Provider acceptance is distinct from recipient delivery or reading.

An uncertain send outcome is investigated or explicitly checked, never blindly resent. Material edits require fresh authorization. An accepted positioning decision can become editable workspace memory.

**Done:** the project contains usable shared resources, user-owned tasks, reviewable outputs, and evidence for any external effects.

### B. Client-delivery workspace

The user maintains a delivery table, meeting documents, client files, and manual commitments. They configure an Operations routine using a pinned weekly-review skill and selected resources.

The routine combines changes since the last successful checkpoint with still-open commitments and blockers. Missing sources appear as coverage gaps; failed reads do not advance their checkpoints. Duplicate schedule deliveries produce one logical occurrence. The routine uses the configured timezone and exposes missed-run behavior.

Operations can ask a permitted specialist a focused question. It saves a status document, proposes task/table changes, and links evidence. The user reviews the work, updates priorities, and records decisions. Any external publication uses the separate authorized action.

Insufficient AI balance pauses new AI work visibly while manual project editing remains available. Completed output remains usable if a later publication fails.

**Done:** current delivery records, a sourced status report, clear responsibilities, and safe recovery for incomplete actions.

### Supporting scenarios

Customer meeting preparation uses a selected event, email thread, notes, and product context to create a brief and follow-up draft. Customer issue triage groups selected reports, prepares responses and GitHub issues, and keeps each input pending until its required actions complete. Reruns check existing action records before creating duplicate effects.

## 8. Trust, authorization, and recovery

The default policy permits scoped reads, drafts, and authorized internal work updates. External writes require concrete review unless a narrow standing grant covers the exact action class, resources, bounds, and expiry. Internal bulk changes remain inspectable; concurrency checks apply even when no additional approval is needed.

External tool operations that delete provider data, move money, change provider permissions, or execute arbitrary code are disabled initially; unclassified tools are disabled too. Owners can manage internal records, memories, connections, and Bootstrap grants through authorized product settings.

Approval is bound to an exact action revision. Account, target, payload, resource-version, or attachment changes invalidate it. Approval is single-use and recorded. Revocation blocks future calls, including approved or resumed work. Reconnection cannot silently substitute another external identity. Local disconnection and provider token revocation have separately reported outcomes.

Worker restart resumes safe work from durable state. Ambiguous writes are not automatically retried. Cancellation prevents future dispatch, propagates to children, and preserves evidence of completed or in-flight effects. A successful model response alone does not establish completion.

## 9. Hosted subscription and AI usage

The hosted launch requires a subscription-controlled application instance per owner, supporting multiple isolated workspaces. The user sees provisioning, readiness, failures, payment problems, cancellation, and the applicable retention/export state. Checkout success does not imply that provisioning completed.

The subscription pays for the hosted instance and its defined service entitlement. AI top-ups fund a separate account-level wallet, with workspace/agent budgets. Show balance, model, token usage, charge, and any unknown cost. If models have different token prices, explain the credit conversion rather than implying interchangeable token value.

Reserve usage before execution, settle measured usage afterward, and release unused reservations. Repeated payment callbacks and retried execution records cannot create duplicate credits or charges. Launch with manual top-ups; future automatic top-up requires explicit opt-in and a limit. Whether a subscription includes a monthly AI allowance remains a pricing decision.

Zero AI balance prevents unfunded model work; it does not disable ordinary manual workspace work while the hosted subscription remains entitled. Subscription suspension is a separate lifecycle with disclosed access, retention, and export behavior. [Hosted service](hosted-service.md) specifies provisioning, billing, accounting, isolation, and recovery requirements.

## 10. Functional requirements

Existing FR-01–FR-14 identifiers are retained and refined; FR-15–FR-26 extend the workspace and hosted scope.

| ID | Requirement | Acceptance |
| --- | --- | --- |
| FR-01 | Profile and workspace boundaries | Profile persists; a workspace-bound run cannot read another workspace |
| FR-02 | Agent configuration | Six properties and grants are versioned; direct assignments work without a coordinator |
| FR-03 | Chat to work | An explicit assignment links task, expected output, selected context, criteria, and run |
| FR-04 | Human/agent tasks and outputs | Manual completion works; agent completion links evidence; attempts and output versions remain inspectable |
| FR-05 | Composio accounts | Same-service accounts remain independently selectable and never silently substitute |
| FR-06 | Tool authorization | Each invocation checks workspace, account, capability, resource scope, and current grants |
| FR-07 | External review | Preview exposes exact account, destination, content, effect, attachments, and action revision |
| FR-08 | Agent communication | Task-linked requests obey delegation limits, shared budgets, grants, and parent cancellation |
| FR-09 | Recovery | Worker restart resumes safe work; ambiguous external writes are not blindly retried |
| FR-10 | Knowledge access | Sources and derived content carry ownership, provenance, freshness, and current access |
| FR-11 | Routines | Pinned configuration, timezone, next/last occurrence, pause, and missed-run behavior are visible |
| FR-12 | Operating control | Runs, blocking reasons, costs, limits, and audit events are inspectable |
| FR-13 | Portability | Self-hosting and resource export work without private repositories or organization-specific services |
| FR-14 | Accessible interface | Core manual and agent workflows pass keyboard, mobile, and reduced-motion acceptance |
| FR-15 | Projects and manual work | User organizes projects and self-assigned tasks without invoking AI |
| FR-16 | Documents and files | Manual editing, versions, uploads, ingestion states, download, and removal follow access rules |
| FR-17 | Bounded tables | Typed grid CRUD/filter/sort/CSV and scoped agent proposals work with stable IDs |
| FR-18 | Canonical resources | Two agent bindings reference one resource; removing access affects future retrieval |
| FR-19 | Skill versions | Assignments pin a version; updates are explicit; runs record the version used |
| FR-20 | Long-term memories | Owner inspects, corrects, scopes, and deletes memories; future retrieval respects changes |
| FR-21 | Concurrent edits | Stale agent/user mutations cannot silently overwrite a newer resource version |
| FR-22 | Workspace overview and capture | Everything/Today, notes, and scratchpad preserve user work and link to canonical resources |
| FR-23 | Hosted provisioning | One subscribed owner obtains one intended instance; retries do not create duplicates |
| FR-24 | Subscription lifecycle | Readiness, payment, cancellation, suspension, retention, and export states are explicit |
| FR-25 | AI-credit wallet | Top-ups, reservations, settlement, limits, and receipts reconcile without duplicate accounting |
| FR-26 | Manual-work independence | Zero AI balance pauses AI execution while entitled manual workspace use continues |

## 11. Success measures and release sequence

Measure weekly active users organizing real work, then useful agent outcomes accepted per active user. Do not equate messages, agents, or generated tokens with value.

Proposed pilot targets are 70% of ten founders completing a reference workflow without developer help; median first useful workspace setup under ten minutes after service readiness; and first accepted agent output under fifteen minutes after required access is ready. At least 80% of first-presented outputs should need no substantial rework. These are targets to measure, not existing results.

Track manual-versus-assisted activity, connection failures, review delays, cost per accepted outcome, provisioning failures, and wallet reconciliation. Release acceptance permits no unauthorized effects, duplicate effects, or unexplained accounting discrepancies in tested scenarios. Optional product analytics are opt-in; operational billing/audit records are separately documented. Self-hosting works with analytics disabled.

Build in four gated stages: workspace foundation; one agent using its six properties; bounded team communication and routines; and paid hosted operation with instance and wallet recovery. Hosted launch cannot precede its provisioning/billing gates. [Implementation plan](implementation-plan.md) maps these requirements to build slices.
