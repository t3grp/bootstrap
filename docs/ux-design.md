# Bootstrap interface and design system

Version: 0.1 proposal. Primary visual language: AffectUI. Supplemental components: BeUI. “Effect UI” in the product brief is interpreted as AffectUI from t3UI.

## 1. Interface principles

The interface makes four questions easy to answer: what is being worked on, what needs the founder, what was produced, and what changed in connected services. Chat, tasks, runs, artifacts, and approvals are linked views of the same work.

Use quiet surfaces, readable work lists, clear status labels, and a restrained accent. Give the current assignment and output more space than agent avatars. Home does not contain invented revenue, productivity, hours-saved, or confidence metrics.

AffectUI supplies the primary typography, spacing, surface, border, and interaction language. BeUI components are adapted to the same token layer. Bootstrap owns its product components, routes, and state contracts.

## 2. Navigation and routes

All routes below are relative to `/w/:workspaceId`. Workspace selection is validated by the server.

| Surface | Route | Content and primary action |
| --- | --- | --- |
| Today | `/` | Needs you, working now, recent results; start work |
| Chat | `/chat/:threadId` | Conversation, task proposals, citations, output links; send request |
| Tasks | `/tasks` | Filterable list, optional board, assignee, due date, output; create task |
| Task detail | `/tasks/:taskId` | Outcome, criteria, owner, outputs, attempts, activity; review or continue |
| Team | `/team` | Agent roles, readiness, work, access, limits; create agent |
| Agent detail | `/team/:agentId` | Instructions, context, tools/accounts, limits, history; configure or assign |
| Knowledge | `/knowledge` | Profile, documents, selected connected sources, freshness; add context |
| Connections | `/connections` | Accounts, granted use, health, dependent agents; connect or reconnect |
| Review | `/approvals` | Exact actions and decisions; review next action |
| Run detail | `/runs/:runId` | Persisted progress, children, tool summaries, costs, blockers; stop or resolve |
| Artifact | `/artifacts/:artifactId` | Versions, edits, sources, origin task, external destinations; edit or export |
| Routines | `/routines` | Schedules, timezone, next/last runs, pause; create routine |
| Settings | `/settings` | Workspace, provider credentials, budgets, policies, export; manage settings |

The main sidebar contains Today, Chat, Tasks, Team, Knowledge, and Connections. A persistent review count opens Review. Routines are reached through Today and Tasks; Settings sits in the workspace menu. Runs and artifacts are primarily reached from their tasks and chat links.

## 3. Screen behavior

### Today

Order work by urgency and actionability. “Needs you” contains a concrete action or question and a task link. “Working” shows the responsible agent, current persisted step, elapsed active time, and stop control. “Recent results” links accepted or reviewable artifacts. A new workspace offers one starter outcome and a labeled demo.

### Chat

Support business-wide chat and a direct agent thread. Show the responding role, sources, connected account where relevant, and linked tasks. A substantive assignment becomes a task card with objective, owner, expected output, completion criteria, and limits.

Enter submits; Shift+Enter inserts a newline. Preserve IME composition behavior. Do not clear the draft until the server acknowledges it. Allow cancel while streaming and preserve the partial result. Reconnection resumes persisted activity without resubmitting the message. Scrolling must respect a founder reading earlier messages.

Use structured cards for task proposals, clarification questions, artifacts, and external actions. A clarification answer is not an authorization to send or publish anything. Render sanitized text and safe links; external content cannot execute HTML or scripts.

### Team and agent setup

The first form asks for role, intended outcome, instructions, and expected deliverables. Subsequent sections select context, exact accounts/capabilities, permission policy, and limits. Model tuning stays under Advanced.

Before saving, show a plain-language capability summary such as “Reads the selected customer thread and product notes; prepares a reply; sending requires your review.” Agents do not inherit every workspace connection.

The team roster distinguishes ready, paused, and needs setup. A ready agent can be idle. A running agent can have several assignments, within limits. An org chart can later help inspect larger teams; the initial roster and assignment list must work without one.

### Tasks and artifacts

Task detail shows the latest usable artifact even when a later action fails. Keep attempts and output revisions available subject to current artifact access and retention policy. Each artifact has an owner, task, source references, creation time, content version, and review state. Founder edits create a new version and invalidate affected pending actions.

The first release supports formatted text, research tables, and structured drafts. It does not need a complete office document suite. Label drafts and effects precisely: Draft in Bootstrap, Ready for review, Queued to send, Accepted by Gmail, or Could not confirm send outcome.

### Connections

Show the actual account name/email or provider identifier, service, connection owner, state, grants, last check, and agents using it. Two accounts for the same service receive distinct labels. Reconnection must not silently attach another identity to an existing task.

A connection is usable only after server verification. Cancellation or failure during OAuth shows a recoverable state. Disconnect lists affected routines and agents, removes future access, and invalidates affected queued work. Historical records retain appropriate redacted evidence.

### Action review

Display exact operation, connected account, target, recipient or resource, full content or diff, attachment list, affected record count, and the reason review is required. Allow editing before authorization. Long payloads remain accessible on mobile.

Approval uses a versioned server request. A successful approval is shown as authorized/queued, not as a completed external action. Double-clicking or acting in two tabs must not dispatch twice. Expired, superseded, rejected, and already-executed states have distinct messages.

Do not offer an unconditional “Always allow everything” shortcut. A standing grant is an explicit settings operation with named capabilities, resources, bounds, expiry, and revocation. Do not show Undo after a message is sent; an actual compensating action needs its own supported workflow.

### Run detail

Show a concise progress summary followed by expandable steps, source references, actions, and child assignments. Events come from durable server state. The view exposes useful action summaries and evidence, never private model chain-of-thought or secrets.

Use specific remedies: reconnect an account, provide missing context, revise a rejected draft, increase a budget, or verify an uncertain action. Retry appears only when the server classifies the operation as safe to retry. Stop explains that it prevents further dispatch and cannot reverse completed external actions.

## 4. Verified component adoption map

Read-only inspection baseline: t3UI commit `66ff17008ebf30e73e7662234e3f14660f8a5c14`. Paths below are relative to `components/collections/libraries/`. These are candidates and adaptation requirements, not implemented Bootstrap features. See [source notes](sources.md).

| Bootstrap use | Source candidate | Required adaptation |
| --- | --- | --- |
| Shell | `affectui/recreated/app-shell-frame.tsx` and CSS | Route-aware navigation, real workspace/user, stable panel state |
| Composer | `affectui/recreated/chat-composer.tsx` | Server acknowledgments, real pending/error state, remove simulated connection/approval and synthetic dictation |
| Home/chat reference | `affectui/recreated/screens.tsx` | Replace fixture data and local behavior with Bootstrap data contracts |
| Task board | `affectui/recreated/blocks.tsx`, `TaskBoard` | Controlled state, stable IDs, versioned task mutations |
| Run view | `affectui/recreated/agent-run.tsx` | Use presentation in a server-controlled view; remove simulated progress and local authorization transitions |
| Inline approval | `affectui/recreated/approval-card.tsx` | Bind exact action revision, asynchronous decision, server expiry; disable broad Always option |
| Review queue | `affectui/recreated/review-center.tsx` | Durable decisions, version checks, real action status; no misleading local undo |
| Tables | `beui/vendor/components/motion/table/` | Stable `getRowId`, controlled sort/selection, server pagination and loading |
| Tabs | `beui/vendor/components/motion/tabs.tsx` | One consistent page-tab style, route state, keyboard/mobile acceptance |
| Compact activity | `beui/vendor/components/agents/agent-activity/` | Map waiting, error, cancelled, and paused states in addition to working/complete |
| Clarification | `beui/vendor/components/agents/approval-card/` | Use question/options view for questions; keep authorization semantics separate |
| App selector | `affectui/recreated/integration-picker.tsx` | Real toolkit/account availability and status |
| Connection settings reference | `affectui/recreated/integration-settings.tsx` | Build OAuth and account lifecycle forms; existing site URL/timezone/API-key form is insufficient |

`affectui/vendor/illustrations/agent-team.tsx` is an illustration, not a functional team editor. The roster, role editor, permission summaries, and task assignment interfaces need product implementation.

The inspected AgentRun defaults to automatic demonstration progress and contains local restart/approval transitions even when used with host-driven steps. Its approval callback alone does not provide durable authorization. The composer also contains timer-driven connection/approval outcomes. Neither component may claim a real operation succeeded based on those local transitions.

## 5. Component packaging and provenance

Create a small `packages/ui` containing selected, adapted source and Bootstrap wrappers. Extract a single semantic token layer for surface, text, border, focus, status, spacing, and typography. Keep demo styles, fixtures, sample accounts, and catalogue navigation outside production bundles.

For each imported file, record source repository, path, pinned commit, license, attribution, dependency/assets, and local changes in a provenance manifest. Retain third-party notices. Verify fonts, icons, avatars, and transitive assets separately. Do not depend on the private t3UI repository during public install or build.

The existing source records distinguish MIT upstream files from independent recreations and do not establish universal visual/API parity. Bootstrap acceptance concerns its adapted components and actual workflows. No screenshot acceptance or parity certification was performed by this specification task.

## 6. Responsive and accessible behavior

On desktop, use navigation plus one main work surface. Add a context inspector when sufficient width remains. Avoid forcing navigation, task list, chat, and artifact into four narrow columns.

On mobile, show one work surface at a time, preserve selection and drafts when navigating back, and present action review full-screen. Keep the approval footer reachable without obscuring content. Tables and code can scroll inside their own container; the page must not require horizontal scrolling for essential actions.

Acceptance viewports: 320, 390, 768, 1280, and 1440 CSS pixels. These are test targets, not fixed device assumptions. Required behavior includes:

- Complete keyboard paths for onboarding, agent setup, chat, task review, and authorization.
- Visible focus, dialog focus containment, Escape behavior, and correct focus return.
- Text/icon status in addition to color, readable contrast, zoom support, and practical touch targets.
- Reduced motion that preserves the same state information.
- Screen-reader updates in manageable units, not one announcement per streamed token.
- Reachable long email addresses, error text, document names, and approval payloads.
- Loading, empty, disconnected, denied, expired, failed, cancelled, and unknown-outcome states.

## 7. Product UI acceptance

The founder must complete the first result, recover a refreshed run, select between two same-service accounts, edit and approve a draft, stop delegated work, and resolve a failed connection on desktop and mobile. Seeded demo behavior must never activate for a real run. Screenshots accompany interaction evidence; static screenshots alone do not establish working authorization or recovery.
