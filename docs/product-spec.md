# Bootstrap product specification

Version: 0.1 proposal. Date: 6 November 2026. Implementation status: planned.

## 1. Product purpose

Bootstrap helps a founder turn business goals into completed work through a small, persistent team of agents. The founder supplies the direction and business context; agents gather information, prepare deliverables, carry out permitted actions, and report results with evidence.

The product promise is: **organize an agent team that understands your business and can work through the tools you already use.** Chat makes delegation easy. The durable product consists of responsibilities, work, outputs, knowledge, permissions, and history.

An agent is a saved role that runs when needed. Creating an agent does not start a continuously running model or incur idle model usage. A coordinator should involve specialists only when their work improves the outcome.

## 2. Initial audience and value

Start with solo founders and small knowledge-based businesses: SaaS founders, consultants, agencies, and digital-product operators. Their initial work includes planning, customer research, meeting preparation, communication drafts, and operational follow-through.

| Founder problem | Product response | Observable value |
| --- | --- | --- |
| Business context is repeated in every conversation | Editable business profile and scoped knowledge | Consistent audience, offer, terminology, and constraints |
| Requests become long conversations without execution | Convert actionable requests into tasks with an owner and completion criteria | A saved output or verified action |
| Different functions need different expertise | Persistent specialist roles with explicit tools and sources | Useful delegation across the business |
| Supervision consumes the time supposedly saved | Bounded execution and a focused review queue | Decisions arrive with concrete work to approve |
| Automation is difficult to trust | Sources, action previews, provider receipts, and recovery history | Clear distinction between drafted and completed work |

The initial interface supports one owner in a workspace. Data boundaries support more than one workspace from the beginning. Multi-user membership management and approval hierarchies come later.

## 3. Product vocabulary

| Object | Meaning |
| --- | --- |
| Workspace | One business, its owner, profile, resources, connections, and limits |
| Agent | Persistent role, instructions, model choice, grants, and operating limits |
| Goal | Lightweight grouping of related tasks and a desired business outcome |
| Task | A specific assignment with an owner, output, and completion criteria |
| Run | One bounded execution attempt for a task |
| Artifact | Versioned output such as a brief, proposal, checklist, or email draft |
| Action | A proposed or executed change to an external service |
| Routine | A task template with a schedule and authorized source scope |
| Connection | One authenticated account in one external service |
| Knowledge source | A selected document, page, file, or founder-maintained business fact |

A conversation can contain several tasks. A task can have several attempts. Repeating a task creates a new run without erasing earlier results. An artifact can be accepted without being published externally.

## 4. First-release scope

### Included in v0.1

1. Business workspace, owner authentication, profile, and configurable timezone.
2. Template-based and custom agents with versioned instructions, sources, and tool grants.
3. Business chat and direct agent conversations, streaming updates, and persistent history.
4. Tasks with owners, statuses, due dates, simple dependencies, outputs, and completion criteria.
5. Versioned artifacts with citations, founder edits, acceptance, and Markdown/JSON export.
6. Composio connection lifecycle and visible account selection.
7. A tested action set for Gmail, Google Calendar, Notion, and GitHub.
8. Server-enforced permissions and concrete review of external actions.
9. Bounded delegation, visible runs, cancellation, retries, and interruption recovery.
10. Scheduled briefs, in-app notifications, usage, and spend controls.
11. Docker-based self-hosting, demo fixtures, migrations, and backup/restore instructions.

The integration catalogue may show additional services as available through Composio, but only validated capabilities are enabled for execution in the first release. Tool availability, configured credentials, granted access, and tested support are distinct states.

### Later releases

Add additional certified integrations, richer domain templates, multiple human members, event-triggered routines, a visual workflow editor, custom MCP servers, a template marketplace, and isolated code execution when the reference workflows justify them.

A full CRM, accounting system, helpdesk, autonomous purchasing/payment engine, and unrestricted browser or shell operator are outside v0.1. Bootstrap coordinates work in existing systems and retains its own work records.

## 5. Agent team

| Role | Responsibility | Initial outputs | Typical access |
| --- | --- | --- | --- |
| Chief of Staff | Clarify outcomes, assign work, synthesize progress, surface decisions | Operating brief, task plan, decision summary | Business profile, selected tasks and artifacts; only explicitly granted external sources |
| Growth and Research | Understand customers, prepare meetings, develop positioning and communication | Research brief, interview guide, outreach or proposal draft | Selected customer context, approved knowledge, selected email threads |
| Operations | Track commitments, triage incoming work, prepare procedures, keep work organized | Checklist, triage report, proposed issue or page update | Selected calendar, Notion pages, GitHub repository, permitted mail scope |
| Custom agent | Founder-defined function | Founder-defined artifact contract | Explicitly selected sources and capabilities |

Product/Engineering, Customer Success, Content, and Finance Operations are useful later templates. Finance templates initially summarize supplied information; financial transactions need a separate product and authorization design.

### Agent configuration

Each agent stores a name, role, objective, instructions, output expectations, knowledge grants, connection bindings, allowed capabilities, autonomy policy, model profile, run limits, and optional routines. A change creates a version. In-progress runs retain their configuration snapshot while current permission revocations still take immediate effect.

Agent pages show responsibility, access, current assignments, recent outputs, and configuration history. An agent can be ready, paused, or require setup; these states are separate from a run being active or waiting.

### Coordination rules

The coordinator may create at most three specialist assignments at one delegation level in the proposed initial defaults. Specialists return structured findings, sources, artifacts, and unresolved decisions. They do not create another team. One synthesis or revision pass is allowed within the same root budget.

The parent run owns cancellation, total spend, tool-call limits, and active execution time. A child receives only the intersection of the task's authority, its own grants, and explicitly shared resources. A coordinator cannot grant itself access by delegating to a more privileged specialist.

## 6. Founder onboarding

1. Create a workspace and set its timezone.
2. Describe the offering, customers, business stage, and current priority. A short paragraph is enough.
3. Review the proposed business profile; distinguish founder-provided facts from inferred suggestions.
4. Choose a first outcome, such as a weekly brief or customer meeting preparation.
5. Create the minimum relevant agents. Do not populate unused departments.
6. Configure a model provider and a budget, or enter the labeled demo experience.
7. Connect only the service needed for this task. Show the account identity and requested use.
8. Review the task plan, allowed sources, intended output, and limits; run the task.
9. Accept or revise the artifact. Offer recurrence after the first successful result.

Failed connection setup must preserve onboarding progress. A founder can complete a task using supplied context before connecting every service.

## 7. Reference workflows

### A. Weekly operating brief

**Request:** “Review our project updates and tell me what changed, what is stuck, and the three priorities for this week.”

The founder selects Notion pages and a GitHub repository. The coordinator reads the permitted period; Operations extracts commitments and blockers. The coordinator saves a brief containing developments, unresolved decisions, suggested priorities, and source links. The founder accepts or edits suggested internal tasks. Any requested external page or issue creation uses a separate concrete action preview.

A recurring run uses the last successful source checkpoint and the configured timezone. Missing or disconnected sources appear as coverage gaps. A missing source is never treated as having no changes. Failed reads do not advance that source's checkpoint. Duplicate scheduled deliveries create one logical run per routine occurrence.

Each brief combines new source changes with current unresolved commitments and blockers. An unresolved item remains visible until resolved or explicitly dismissed; advancing a source checkpoint does not remove it.

**Done:** the brief exists; every material factual claim has a source or is marked as inference; accepted tasks have an owner; any external changes link to provider evidence.

### B. Customer meeting preparation and follow-up

**Request:** “Prepare me for this customer interview and help me follow up.”

The founder selects a calendar event and relevant email thread. Growth/Research uses those sources and the business profile to prepare a brief, open questions, and desired learning. After the meeting, the founder supplies notes. The agent produces findings, follow-up tasks, and an email draft.

The founder edits the actual recipient, subject, body, and attachments, then chooses Send. That explicit instruction authorizes the unchanged action; Bootstrap does not add a second identical confirmation. The executor verifies account binding and current grants, sends once, and records the result.

If a send times out after dispatch, its outcome becomes unknown. Bootstrap investigates or requests a targeted check; it does not automatically resend. An edited draft requires fresh authorization. Provider acceptance is recorded separately from delivery to or reading by the recipient.

**Done:** the brief and follow-up draft are saved; any sent action has provider evidence; new tasks have owners; proposed business-profile updates remain editable.

### C. Customer issue triage

**Request:** “Review these customer reports, prepare replies, and turn confirmed defects into work.”

Operations reads selected threads or a permitted label, groups duplicates, and classifies reports. It drafts supported responses and proposed GitHub issues with observed behavior, evidence, and source references. Uncertain claims remain visible. The founder reviews each action, or the action uses a previously defined narrow standing grant.

The external action record retains the source item and provider result. A rerun checks that record before creating another issue. An item is marked processed only when its required actions are complete. A failed response or issue creation remains resumable without redoing successful actions.

**Done:** each input is resolved, pending review, or explicitly blocked; every created issue or sent message has a receipt and a link to the original report.

## 8. Functional requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| FR-01 | Business profile and workspace boundaries | Profile edits persist; a second workspace cannot read the first workspace's data |
| FR-02 | Agent templates and custom roles | Instructions, sources, model, and grants are versioned and used by subsequent runs |
| FR-03 | Chat to work | Actionable chat creates a task with owner, expected output, criteria, and a linked run |
| FR-04 | Tasks and artifacts | Task detail links all attempts and artifact versions; completion requires evidence |
| FR-05 | Composio accounts | Two accounts for the same service remain independently selectable and never silently substitute |
| FR-06 | Tool authorization | Every invocation checks workspace, connection, capability, resources, and current grant state |
| FR-07 | External action review | Preview exposes exact account, destination, content, effect, and material attachments |
| FR-08 | Team execution | Delegation is bounded, parent budgets include children, and cancellation propagates |
| FR-09 | Recovery | Worker restart resumes safe work; ambiguous external writes are not blindly retried |
| FR-10 | Knowledge | Sources have ownership, provenance, freshness, status, and editable access grants |
| FR-11 | Routines | Timezone, next occurrence, last outcome, pause state, and missed-run behavior are visible |
| FR-12 | Operating control | Active runs, reasons for blocking, costs, limits, and audit events are inspectable |
| FR-13 | Portability | Fresh self-hosting works without private repositories or organization-specific services |
| FR-14 | Accessible interface | Keyboard operation, readable status, mobile review, and reduced-motion behavior pass acceptance |

## 9. Trust and autonomy

The default policy permits scoped reads, internal drafts, and internal work updates. External writes are reviewed unless a narrow standing policy already authorizes the exact class of action. External tool operations that delete provider data, move money, change provider permissions, or execute arbitrary code are disabled in v0.1. Unclassified tools are also disabled. Owners can manage internal records, remove knowledge, revoke connections, and edit Bootstrap access grants through authorized settings.

An approval belongs to the actual action, not to a general agent persona. Material changes to account, target, payload, resource version, or attachments invalidate approval. Reuse of an approval is single-use and recorded. Revoking access blocks future calls, including after approval.

Progress labels reflect persisted events. A successful model response does not establish task completion. Cancellation prevents further dispatch while preserving records of external effects already completed or in flight.

## 10. Success measures and pilot targets

The primary measure is **useful outcomes accepted per active founder per week**. Count accepted artifacts and verified business actions; do not count generated messages or number of agents.

Proposed pilot targets, to be measured rather than advertised as existing results:

- At least 70% of a ten-founder pilot completes one reference workflow without developer help.
- Median time to first accepted artifact below 15 minutes after required credentials are ready.
- At least three accepted outcomes per weekly active founder.
- At least 80% of artifacts presented for first review are accepted without substantial rework in the reference scenarios.
- Zero unauthorized external actions or duplicate effects in the release acceptance suite.
- Every supported workflow reports cost per accepted outcome, with unknown cost marked explicitly.

Also measure review waiting time, connection failures, action failures, source coverage, and return usage. Collect content-free usage only with opt-in telemetry; self-hosting must work with telemetry disabled. Ask founders about time saved rather than manufacturing a time-saved estimate from token counts.

## 11. Version sequence

The first alpha proves one agent completing real work with persistence and permission enforcement. The beta adds bounded teamwork, all three reference workflows, routines, and verified self-hosting. Later versions expand business templates and integrations based on observed demand. [The implementation plan](implementation-plan.md) defines the gates for moving between these stages.
