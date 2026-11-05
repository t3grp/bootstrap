# Bootstrap interface and design system

Version: 0.2 draft. Date: 6 November 2026. Primary visual language: AffectUI; supplemental components: BeUI. “Effect UI” is interpreted as AffectUI from t3UI. Implementation status: planned.

## 1. Workspace-first direction

The centrepiece is the user's workspace: projects, documents, tables, files, personal tasks, and conversations. Agents are available within that work. The initial screen should help a user find or create useful material before asking them to configure a team.

The [Bench walkthrough](https://x.com/thekitze/status/2118237135698632943) informs the information architecture: a light Everything overview with grouped project/“Benches” cards, a right-side To-dos/Notes/Scratchpad area, compact agent statuses at the bottom, and a focused Today view. Bootstrap adopts these organizational ideas with its own Projects terminology, branding, content, and implementation. Do not copy Bench imagery or imply component/source reuse.

AffectUI provides the typography, spacing, surfaces, borders, and interaction language. Adapt BeUI through one token layer. Keep readable work surfaces and restrained accents; avoid invented revenue, hours-saved, productivity, or confidence metrics.

## 2. Navigation and routes

Workspace routes are relative to `/w/:workspaceId`; the server validates every selection. Billing and instance status are account-level.

| Surface | Route | Main content |
| --- | --- | --- |
| Everything | `/` | Grouped projects, recent resources, personal capture |
| Today | `/today` | My commitments, due work, decisions, active assignments |
| Projects | `/projects`, `/projects/:projectId` | Objective, tasks, documents, tables, files, chat, activity |
| Documents | `/documents`, `/documents/:documentId` | Editable canonical content, versions, sources |
| Tables | `/tables`, `/tables/:tableId` | Typed data, grid controls, proposed changes |
| Files | `/files`, `/files/:fileId` | Uploads, metadata, processing, access, versions |
| Chat | `/chat/:threadId` | Workspace/project/direct-agent conversation |
| Team | `/team`, `/team/:agentId` | Agent roster and configuration |
| Task/run | `/tasks/:taskId`, `/runs/:runId` | Work, attempts, outputs, execution evidence |
| Review | `/approvals` | Exact decisions and action revisions |
| Routines | `/routines` | Schedules, scope, timezone, history |
| Connections | `/connections` | Verified accounts, grants, health |
| Settings | `/settings` | Profile, policies, limits, export |
| Account | `/account/billing`, `/account/instance` | Subscription, wallet, provisioning and lifecycle |

The main sidebar contains Everything/Today, Projects, Documents, Tables, Files, Chat, and Team. Connections and Settings sit below; Usage & billing opens the account view. Routines are reachable from projects and agents. A review badge opens pending decisions. Global resource views filter by project and reference the same objects.

## 3. Main work surfaces

### Everything and Today

Everything groups project cards and recent resources. A collapsible right panel holds personal To-dos, Notes, and Scratchpad; entries persist and can become canonical tasks/documents without AI. A compact bottom strip shows agent readiness/activity with links to actual runs. It must not obscure content or suggest idle agents consume continuous model usage.

Today prioritizes the user's commitments, overdue work, reviewable outputs, and active assignments. A new workspace offers Create project, Add document, Upload file, Create table, and a labeled demo. Team configuration is optional.

### Projects and resources

Project tabs are Overview, Tasks, Documents, Tables, Files, Chat, and Activity. A project card opens real work, not an automatic agent run. Task assignees include Me, an agent, and Unassigned. Manual edits and completion remain available with no AI balance.

Documents show save state, versions, sources, and agent-proposed revisions. Files distinguish upload from ingestion and preserve download for unsupported formats. Removal explains relevant access/retention effects; old activity links cannot bypass current permissions.

Tables provide a typed grid, search/filter/sort, row selection, CSV import/export, validation, and accessible row editing. No formula or relational-builder controls appear initially. Agent changes show row/field diffs and affected counts. A stale version produces a conflict view; the user can compare and reapply without losing newer work.

Selecting document content, table rows, or files enables Ask an agent. The composer visibly lists the exact resources being shared. Agent Files/Tables lists link back to the originals.

### Chat

Support workspace, project, and direct-agent threads. Show the responding agent, selected context, sources, and linked tasks/outputs. Assignments become task cards; ordinary note-taking does not silently delegate work.

Enter submits; Shift+Enter inserts a newline; preserve IME behavior. Retain the draft until server acknowledgement. Cancelling streaming preserves useful partial output. Reconnection resumes persisted activity without resubmitting messages. Respect a user reading earlier history.

Use structured cards for questions, work proposals, revisions, and external actions. Answering a clarification is not permission to publish. Sanitize content and links; retrieved text cannot execute HTML or scripts.

## 4. Agent setup and six property tabs

Users can create a specialist directly. Chief of Staff is an optional template. The roster distinguishes ready, paused, and needs setup; current work is a separate state.

An agent header shows its role, current assignments, capability summary, and Assign work. Provide exactly these six property tabs:

| Tab | Required interaction |
| --- | --- |
| Instructions | Edit role, objectives, constraints, output expectations; inspect versions |
| Skills | Select reusable procedures, see requirements, pin a version, explicitly accept updates |
| Routines | Configure assignment, sources, pinned versions, schedule/timezone, limits; pause and inspect runs |
| Memories | Inspect workspace/agent scope, provenance and inference status; correct, accept, or delete |
| Files | Bind canonical documents/files; show access and processing state |
| Tables | Bind canonical tables; inspect schema and permitted operations |

Activity, inter-agent communication, tools/accounts, limits, and model settings are accessible from the header or contextual panel; they do not displace those properties. Model tuning stays under Advanced.

The capability summary names readable resources and permitted effects. Skills do not confer credentials. Existing runs show their configuration snapshot; current revocations still apply. Communication shows requester, recipient, task, shared context, result, and waiting state. Do not present unrestricted group chat as required coordination.

## 5. Review, execution, and account control

### Connections and external actions

Connection cards show the actual identity, service, owner, grants, health, and dependent agents/routines. Same-service accounts remain distinguishable. OAuth failure is recoverable; success requires server verification. Reconnection cannot substitute another identity. Local disconnection and provider revocation show separate pending/failed/unsupported states.

Action review exposes operation, account, exact destination, recipient/resource, complete content or diff, attachments, affected count, and reason for review. Editing a material field creates a new action revision. Choosing Send/Approve authorizes that revision without another identical confirmation.

Authorized/queued is distinct from completed. Double-clicks or two tabs cannot dispatch twice. Expired, superseded, rejected, and executed states differ. Standing grants are explicit settings with capabilities, resources, limits, expiry, and revocation; there is no unconditional Always allow everything shortcut. Do not offer misleading Undo for a sent message.

### Runs and outputs

Task detail retains the latest usable output if a later action fails. Link output to canonical documents/files/table changes, source references, and versions. Access and retention remain enforced.

Run detail shows durable steps, child assignments, actual tool summaries, evidence, costs, and blockers. Expose useful summaries, never private model chain-of-thought or secrets. Retry appears only for server-classified safe operations. Stop prevents further dispatch and explains in-flight effects. Unknown write outcomes require verification rather than a blind retry.

### Hosted subscription and wallet

Account views distinguish subscription entitlement, instance readiness, and AI balance. Checkout leads to visible provisioning; failed provisioning offers recovery without another unintended purchase. Display instance lifecycle, subscription renewal/cancellation, applicable access/retention, and export.

Wallet shows balance, top-ups, reserved usage, settled charges, model/token breakdown, and limits. Launch with manual top-ups; a future automatic top-up feature requires explicit opt-in and a cap. Low balance pauses new AI work while entitled manual workspace use continues. Avoid blocking the document editor with an AI upsell. See [Hosted service](hosted-service.md) for lifecycle and accounting contracts.

## 6. Component adoption and provenance

Inspected baseline: t3UI commit `66ff17008ebf30e73e7662234e3f14660f8a5c14`. Paths below are relative to `components/collections/libraries/`; these are candidates, not implemented Bootstrap features. See [source notes](sources.md).

| Use | Source candidate | Adaptation |
| --- | --- | --- |
| Shell | `affectui/recreated/app-shell-frame.tsx` | Workspace routes, persistent panels, responsive overview |
| Composer | `affectui/recreated/chat-composer.tsx` | Real acknowledgements/context; remove simulated approval/connection and dictation |
| Screen reference | `affectui/recreated/screens.tsx` | Replace fixtures with canonical project/resource contracts |
| Tasks | `affectui/recreated/blocks.tsx`, TaskBoard | Stable IDs, controlled state, human assignees |
| Runs | `affectui/recreated/agent-run.tsx` | Server-controlled progress; remove local restart/approval transitions |
| Approval | `affectui/recreated/approval-card.tsx` | Exact revision, async decision, expiry; disable broad Always |
| Review | `affectui/recreated/review-center.tsx` | Durable decisions; no misleading local undo |
| Tables | `beui/vendor/components/motion/table/` | Stable row IDs, typed editing, controlled selection, pagination |
| Tabs | `beui/vendor/components/motion/tabs.tsx` | Consistent routed properties/project tabs, keyboard/mobile behavior |
| Activity | `beui/vendor/components/agents/agent-activity/` | Waiting, error, cancelled, paused, idle states |
| Questions | `beui/vendor/components/agents/approval-card/` | Clarification only; authorization semantics remain separate |
| App/account setup | `affectui/recreated/integration-picker.tsx`, `affectui/recreated/integration-settings.tsx` | Real toolkit/account lifecycle; existing generic settings form is insufficient |

The agent-team illustration is not a functional team editor. AgentRun and composer demos contain automatic/local progress; callbacks alone do not establish durable authorization. No real operation may report success from a demonstration timer.

Package selected adaptations in `packages/ui` with one semantic token layer. Exclude catalogue fixtures and navigation. Record each imported file's source, pinned commit, license, attribution, assets/dependencies, and changes. Verify fonts/icons separately and retain notices. Public build must not require private t3UI access. Existing source records do not certify universal visual/API parity; this specification performs no screenshot acceptance.

## 7. Responsive acceptance

On wide screens use navigation, a main resource surface, and an optional capture/context panel. Collapse secondary panels before narrowing useful content. Mobile uses one surface at a time, preserves drafts/selections, and provides full-screen action review. Agent status and approval footers must not cover controls.

Verify 320, 390, 768, 1280, and 1440 CSS-pixel widths; these are acceptance targets. Test keyboard creation/editing of projects, documents, tables, tasks, agent properties, and approvals; visible focus; dialog containment/return; readable contrast; zoom; practical touch targets; text alongside status color; and reduced motion. Announce streamed updates in manageable units.

Essential actions cannot require page-level horizontal scrolling. Tables/code may scroll within their container. Test long names, addresses, payloads, and errors, including loading, empty, denied, disconnected, expired, failed, cancelled, and unknown outcomes.

Acceptance includes manual work with zero AI balance, canonical resource sharing, stale-edit recovery, explicit skill updates, editable memories, bounded agent communication, same-service account selection, approved action recovery, and hosted provisioning/wallet states on desktop and mobile. Demo behavior never activates for a real run. Screenshots accompany interaction evidence; screenshots alone do not prove execution, authorization, or accounting.
