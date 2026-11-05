# Bootstrap decision register

Date: 6 November 2026. Version: 0.2 draft. The product direction below follows the user's stated requirements; implementation defaults remain proposals until built and validated.

## Confirmed product direction

- Open-source business workspace for founders and solo entrepreneurs.
- The user's projects, documents, files, tables, tasks, and conversations are central; agents support the user.
- Each agent exposes instructions, skills, routines, memories, files, and tables.
- Agent communication follows useful Openbot architectural patterns through an original implementation.
- Composio connects the user's business services.
- AffectUI and BeUI from the t3UI catalogue guide the interface.
- A paid subscription provisions a user instance, with additional top-ups for AI usage.

## Proposed implementation defaults

| Decision | Proposed default | Reason and consequence |
| --- | --- | --- |
| Initial customer | Solo founders and small knowledge businesses | Focuses on customer work, research, planning, and operations |
| Ownership | One owner per workspace initially; one hosted account/instance per subscriber, with multiple workspaces | Business boundaries remain explicit without charging automatically for every project/workspace |
| Workspace resources | Canonical projects, documents, files, typed tables, and manual tasks | Users and agents work on the same information; agent profile resources are bindings |
| Agent team | Directly usable Growth/Research and Operations templates, custom agents, optional Chief of Staff | Coordination is a convenience, not a prerequisite |
| Agent communication | Persistent identities, separate task threads, durable messages/deliveries, action versus notification | Work survives restart and acknowledgements do not create endless model turns |
| Delegation | One level, three child assignments, shared message/step/time/spend limits | Bounded collaboration with one responsible task owner |
| Skills | Declarative procedures, pinned versions, provenance and declared capability requirements | Installing instructions does not grant tools or executable code |
| Memory | User-visible workspace and agent memories with provenance, revision, correction, and deletion | Confirmed facts remain distinguishable from working notes |
| Tables | Typed grid, basic filter/sort/search, CSV, stable IDs, reviewed agent changes | Useful business data without a full spreadsheet/database platform |
| First connectors | Gmail, Calendar, Notion, GitHub | Certify a small set of actions for the launch/client-delivery workflows |
| First connected slice | Notion read and reviewed page creation | Exercises account binding, evidence, authorization, dispatch, and receipt handling |
| Runtime | TypeScript, Next.js, AI SDK, PostgreSQL, pg-boss, separate worker | Portable core with durable execution and a modest infrastructure footprint |
| UI language | AffectUI primary; selected BeUI components; Bench as workspace-layout inspiration | Uses the requested source while keeping business work central |
| External actions | Exact review unless specifically or narrowly pre-authorized | Authorization binds to actual account, target, content, and attachments |
| Managed infrastructure | Per-user app/worker containers, separate database credentials and private storage, on potentially shared hosts | Fulfils an instance promise without implying dedicated hardware |
| Hosting revenue | Recurring subscription for capacity and operations | Kept independent of AI consumption and credit balance |
| AI purchases | Manual top-ups of defined AI usage credits, versioned model rates, visible token breakdown | Different token categories/models need not cost the same |
| Payment/runtime boundary | Stripe for payment state; Bootstrap ledger and managed gateway for real-time reservations | Duplicate events and concurrent runs cannot mint or spend twice |
| Model/integration credentials | Managed gateways hold platform keys; self-host uses direct operator credentials | User instances never receive platform-wide secrets |
| Self-hosting | Complete core, BYOK, Composio configuration, local/S3 storage, demo mode | No hosted subscription or private infrastructure needed to run the public application |
| New-code license | Apache-2.0 proposal, retaining component notices | Owner adoption remains pending; no LICENSE is installed by this documentation change |

## Decisions to settle at their implementation gate

**Foundation:** select the project license and record per-file provenance for the chosen UI subset. Openbot's inspected upstream is noncommercial-licensed; its patterns inform an independently authored design, with no upstream source copied. t3UI's root license does not override upstream or media licenses. The specification can be reviewed without adopting a license yet.

**Connected actions:** select development Composio configuration, isolated accounts, and approved test actions. Discover and pin actual tool slugs and schemas. Validate callback identity, account pinning, revocation, receipts, and atomic update preconditions. Keep unsupported capabilities disabled.

**Pilot usability:** choose the initial customer cohort and evaluate launch preparation and client-delivery workflows. Measure the model profile, agent limits, table/import capacities, memory quality, and first-use guidance. User permission rules must be understandable without reading developer documentation.

**Managed hosting:** choose the infrastructure provider/region, provisioning adapter, capacity limits, routing domain, encrypted backup location, restoration process, and operator access policy. Publish the distinction between an isolated application instance and shared physical infrastructure. Test per-instance separation and restore before accepting live subscriptions.

**Commercial launch:** choose hosting price, credit-pack amounts/currency, rate card and margin, any included credits, connector/tool allowances, taxes and payment settings, grace period, archive retention, refund/expiry terms, and initial-provisioning failure remedy. A 7-day payment recovery grace and 30-day retained archive are proposed configurable defaults, not adopted promises. Usage credits apply to Bootstrap's defined services; do not present them as transferable cash or a general payment wallet. Confirm jurisdiction-specific terms before charging customers.

**Future collaboration:** invitations, shared account ownership, multiple human administrators, and role lifecycle are later capabilities. Serving many separately isolated subscribers does not imply that multi-human workspaces are implemented.

These decisions do not block writing the workspace foundation or deterministic adapters. They must be resolved before the associated live deployment or release gate.

## Deferred scope

A visual workflow canvas, arbitrary code/browser/MCP execution, a skill marketplace, deep org charts, formulas/relations/rollups, real-time multi-human editing, and autonomous purchases can follow demonstrated usage. All six basic agent resource areas and managed subscription/credit behavior belong to the intended first product; they are not deferred away.

Start with a Postgres queue and simple container operations. Reconsider a larger workflow engine or orchestration platform only when measured needs justify it; neither removes the need to reconcile external actions or provider charges.

Bootstrap's open-source core includes workspace resources, agent configuration and communication, permissions, routines, and integration adapters. The managed service sells operation and convenience. External model and connected-service providers can have their own charges and availability limits; disclose those distinctions in setup and usage screens.
