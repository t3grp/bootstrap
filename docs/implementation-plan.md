# Bootstrap implementation plan

Version: 0.2 draft. This plan covers the intended workspace, agent team, self-hosted application, and paid hosted service. It is a sequence of implementation gates, not a claim that any application behavior already exists.

## 1. Delivery strategy

Build four usable stages: **workspace foundation → assisted workspace → agent team → managed hosted launch**. Keep the user workspace functional throughout. A person should create and organize work before choosing an agent, model, or integration.

Use deterministic provider and connector adapters early so domain behavior, recovery, and interface states can be exercised without live credentials. Add one complete live connection before widening the integration catalogue. Hosted provisioning and billing are required for the commercial launch, with independent acceptance gates; they are not substitutes for a usable workspace.

## 2. Ordered build slices

| Slice | Work | Completion gate | Depends on |
| --- | --- | --- | --- |
| B0 Foundation | Public monorepo, owner authentication, workspace-scoped schema/migrations, web/worker health, Compose, shared contracts, approved UI tokens/notices | Fresh setup opens a real workspace; cross-workspace access fails; build has no private catalogue dependency | Project license and provenance before copying code |
| B1 Manual workspace | Projects, user/unassigned tasks, Markdown documents/versions, files, bounded typed tables, CSV, Everything/Today, notes and scratchpad | User completes ordinary project work with no agents, model key, or AI balance; resources export | B0 |
| B2 One useful agent | Six resource areas, pinned skills, editable memories, explicit grants, contextual chat, task/thread/run, bounded model loop, output receipts, SSE | One specialist uses selected resources and produces a saved workspace result; refresh/restart preserves progress | B1 |
| B3 Controlled connection | Notion reads and reviewed page creation, account binding, capability gateway, exact approval, action ledger, reconciliation | Intended account is used; stale/double approvals cannot dispatch; an uncertain write is not blindly duplicated | B2 |
| B4 Agent communication | Durable messages/deliveries, action/notification semantics, child assignments/results, task revisions, shared caps, parent cancellation | A directly selected agent obtains specialist help without a Chief of Staff; no authority or budget widening | B2; integrate B3 action rules |
| B5 Complete workflows | Gmail/Calendar/GitHub action manifests, launch/client-delivery flows, routine scheduler, occurrence deduplication, source checkpoints, review and usage views | Both primary workflows and supporting meeting/triage cases pass; missed runs and revoked sources behave correctly | B3–B4 |
| B6 Managed instances | Control-plane owner/account mapping, Stripe hosting subscription, entitlement reconciliation, provisioner adapter, routing, per-user isolation, health, suspend/archive/restore | Verified purchase produces one healthy intended instance; retries reuse resources; cancellation preserves the disclosed recovery path | B1 data/export contract; stable B0 deployment |
| B7 Managed usage | Model gateway, Composio broker, manual top-ups, rate cards, atomic reservations, settlements, refund/reversal flows, usage UI | Concurrent work cannot exceed credits; duplicate events/receipts cannot grant or charge twice; unknown usage remains reconcilable | B2 runtime request IDs; B6 account/entitlement |
| B8 Public and hosted beta | Standalone setup, license/notices, contribution docs, release evals, accessibility, export/import, backup/restore, lifecycle operations and commercial settings | Core AC01–AC42 and hosted HC01–HC14 have evidence; operational/pricing decisions are configured before live charging | B0–B7 |

B6 and B7 can proceed in parallel with B4–B5 once their contracts are stable. The paid launch waits for all applicable gates. Publish progress by working slice and known limitations; do not promise a calendar date before team capacity and implementation spikes are known.

## 3. First implementation PR

The first code change should deliver B0 and the smallest useful B1 path:

1. Scaffold TypeScript/pnpm, web and worker entrypoints, database migrations, local storage, and Docker Compose.
2. Add owner login/bootstrap and workspace-scoped access helpers.
3. Adapt the approved AffectUI shell and BeUI table primitives into controlled product components.
4. Create a project with a manually editable document, a small typed table, a file attachment, and a task assigned to Me.
5. Add version checks, durable persistence, reload behavior, and a visible empty Team state.
6. Prove that the flow works without model, Composio, or hosted-control credentials.

Its reviewable outcome is a usable personal business workspace. The following PR adds one specialist with the six resource tabs, a declarative skill, selected resources, and a persisted run that produces a document/table proposal. Routines can be configured in that slice; their scheduler is activated only when B5's occurrence and recovery gates pass.

## 4. Core acceptance scenarios

The functional requirement identifiers come from [product specification](product-spec.md). Tests should exercise observable guarantees and actual failure boundaries rather than duplicate implementation details.

| ID | Scenario | Required evidence | Slice / requirements |
| --- | --- | --- | --- |
| AC01 | Owner assigns one specialist a bounded task | Persisted agent, instruction/skill/resource snapshot, task/thread/run, and result in the existing project | B2; FR-01–04, FR-19 |
| AC02 | Two workspaces use overlapping resource IDs | API, retrieval, files, SSE, approvals, and connector requests cannot cross the boundary | B0–B5; FR-01, FR-06 |
| AC03 | Browser refresh/disconnect during work | Event cursor resumes; no repeated assignment, message, or external operation | B2; FR-03, FR-09 |
| AC04 | Worker crashes between model steps | Checkpoint resumes safe work; completed output survives; ambiguous provider use is reconciled | B2; FR-09 |
| AC05 | Multiple accounts for the same service | Connecting B after choosing A never redirects A's queued action; disabling A blocks it | B3; FR-05 |
| AC06 | Reviewed action/account/attachment changes | Old approval is superseded and cannot authorize the new payload | B3; FR-07 |
| AC07 | Two tabs approve concurrently | One atomic decision and one logical action reservation | B3; FR-07, FR-09 |
| AC08 | Provider commits a write then times out | Outcome remains unknown; no blind second write; reconciliation or user verification is available | B3; FR-09 |
| AC09 | Permission revoked after approval | Dispatch is blocked; local disconnect and actual upstream revocation remain distinguishable | B3; FR-05–07 |
| AC10 | Retrieved content requests more access or another recipient | Source instructions cannot alter grants, action destination, or authorized payload | B2–B5; FR-06, FR-10 |
| AC11 | Delegate attempts excessive depth or scope | Server rejects excess work, resources, accounts, and permission expansion | B4; FR-08 |
| AC12 | User cancels root task while children run | Queued descendants stop; dispatched effects and eventual receipts remain honestly recorded | B4; FR-08–09 |
| AC13 | Concurrent work exhausts root budget | Atomic reservations prevent new excess spend; child/retry limits do not reset; outputs remain | B4; FR-08, FR-12 |
| AC14 | Weekly client review has an old blocker and unavailable source | Open commitment carries forward; coverage gap is visible; failed source checkpoint does not advance | B5; FR-10–11 |
| AC15 | User edits a meeting follow-up before sending | Correct account/thread, exact final text/attachments, valid authorization, provider receipt | B5; FR-04–07 |
| AC16 | Issue triage reruns the same report | Successful issue creation is not repeated; unfinished safe work can continue | B5; FR-09 |
| AC17 | Routine duplicated, missed, or affected by daylight saving | One logical occurrence; specified skip/catch-up behavior; visible history | B5; FR-11 |
| AC18 | Knowledge source removed or grant revoked | Removed access cannot feed future retrieval or dispatch; retention is visible | B2–B5; FR-06, FR-10 |
| AC19 | Backup restored into an isolated deployment | Data/files recover with dispatch disabled; uncertain actions reconcile before writes | B8; FR-09, FR-13 |
| AC20 | Outsider builds a fresh public clone | No private t3UI, organization endpoint, secret fixture, or hosted-service dependency | B0, B8; FR-13 |
| AC21 | Keyboard, screen reader, reduced motion, and phone usage | User completes manual work, agent assignment, and long action review with correct focus/readability | B1–B8; FR-14 |
| AC22 | Production UI uses actual server state | No demo timers create connection, approval, run, deployment, or balance success | B1–B8; FR-04, FR-07, FR-12, FR-23–25 |
| AC23 | Approval expires or approver loses authority while queued | Resume requests current authorization and makes no external call | B3; FR-06–07 |
| AC24 | Worker loses lease after dispatch intention but before receipt | Replacement reconciles the same operation key without resending a non-idempotent action | B3; FR-09 |
| AC25 | Remote update races another writer | Provider atomic precondition prevents stale overwrite, or the capability remains disabled | B3–B5; FR-07, FR-09 |
| AC26 | Upstream access revoked while content remains cached | New retrieval blocks unverifiable/revoked material and shows missing coverage | B2–B5; FR-06, FR-10 |
| AC27 | User works with no agent/model key/AI balance | Projects, manual tasks, documents, files, tables, notes, and scratchpad remain usable under hosting entitlement | B1; FR-15–17, FR-22, FR-26 |
| AC28 | Two agents share a file/table; one agent is removed | Both bindings point to one resource; deleting agent/binding does not delete business data or grant others access | B2; FR-18 |
| AC29 | Human and agent edit the same document/rows | Version conflict preserves the newer user data; reviewed bulk change never partially overwrites silently | B1–B2; FR-21 |
| AC30 | Typed-table operations and CSV hit validation/size limits | Stable IDs, consistent schema/types, useful errors, bounded import/query/export; invalid mutation leaves valid state intact | B1; FR-17 |
| AC31 | Skill library changes while an installed agent is running | Explicit upgrade required; run keeps pinned version; installing skill grants no credentials/capability | B2; FR-19 |
| AC32 | Owner corrects or forgets memory | Future context respects revision/deletion; agent inference is distinguishable from confirmed fact | B2; FR-20 |
| AC33 | User asks for help on selected table rows/document | Exact attached context is visible; scope excludes unselected or ungranted content | B2; FR-03, FR-06, FR-18 |
| AC34 | Agent message admission is retried after lost response | Same key/payload returns same receipt and recipient deliveries; changed payload reuse conflicts | B4; FR-08–09 |
| AC35 | Notification arrives before or after restart | Persisted activity creates no model turn and does not satisfy an awaited task result | B4; FR-08, FR-12 |
| AC36 | Child result repeats or arrives for superseded task | Correct parent revision resumes once; stale result remains inspectable without completing new work | B4; FR-08–09 |
| AC37 | Sender spoofing or channel-based privilege escalation | Trusted sender comes from execution context; group/channel membership grants no resources | B4; FR-06, FR-08 |
| AC38 | Parent waits while workers restart | Durable dependency releases worker slot and resumes from accepted child results without new budget | B4; FR-08–09 |
| AC39 | Routine changes or pauses while occurrence is queued | Current definition/enabled-state check prevents stale admission; routine uses normal mailbox identity | B5; FR-11 |
| AC40 | Source-derived memory survives source revocation | Memory cannot bypass current source access; historical run text is not silently reinjected | B2–B5; FR-10, FR-20 |
| AC41 | Owner exports and imports a workspace | Canonical resources, tasks, agent settings/skills/memories and references survive; secrets/billing authority do not transfer | B8; FR-13, FR-18–20 |
| AC42 | No coordinator exists | User opens specialist directly, assigns work, receives result, and retains manual work in the same project | B2–B4; FR-02–04, FR-15 |

## 5. Hosted acceptance and evidence

The fourteen [hosted-service acceptance cases HC01–HC14](hosted-service.md#10-hosted-launch-acceptance) are required for the paid release, alongside the core suite.

| Hosted group | Required cases | Build slices / requirements |
| --- | --- | --- |
| Payment and provisioning | HC01–HC05, HC13 | B6; FR-23–24 |
| Credits, concurrent usage, and reversals | HC06–HC07, HC10 | B7; FR-25 |
| Zero balance, suspension, outage, and recovery | HC08–HC09, HC11–HC12 | B6–B8; FR-24–26 |
| Standalone independence | HC14 | B0, B8; FR-13 |

Keep business-operation evidence as well as screenshots: event IDs, operation keys, instance handles, approval versions, immutable ledger entries, provider receipts, and outcome states. Use redacted fixtures and isolated test accounts. Stripe test-mode scenarios must cover duplicate/concurrent fulfillment, delayed payment, unordered updates, missing webhooks, disputed/refunded credit, and restore without old-balance replay.

## 6. Test and evaluation approach

Use focused unit/property tests for policy intersections, state transitions, schema validation, version checks, idempotency, reservation arithmetic, and rate-card rounding. Use real PostgreSQL for transaction races, outbox/inbox behavior, row scopes, leases, and concurrent credit reservations. Fault-inject at dispatch and settlement boundaries.

Use Playwright for complete user flows and accessibility: manual project work, contextual assignment, six agent tabs, proposed changes, account selection, action review, provisioning, and low-credit recovery. Test the actual app/database roles and managed gateway identities, not only privileged test helpers.

Evaluate agents against seeded launch and client-delivery datasets with known facts, stale evidence, malicious source instructions, missing access, unresolved commitments, and duplicate requests. Score outcome usefulness, evidence coverage, task completeness, policy compliance, and cost per accepted result. Keep first-review acceptance denominator fixed: artifacts presented for first review, not only the artifacts eventually accepted. Numerical success/performance targets in the product and technical designs remain proposed until measured.

Live smoke tests use bounded budgets and designated accounts. Certify each enabled capability's schema, account selection, permission boundary, receipt, and safe retry classification. Do not expand the action list merely because an integration exists in Composio.

## 7. Release gates and operational decisions

Before public beta, publish setup and upgrade instructions, environment-variable names, migrations, backups/restores, export/import, component notices, contribution guidance, issue templates, and a secret-free demo. Adopt the selected new-code license and retain applicable UI notices. Confirm no copied Openbot noncommercial source or private catalogue dependency is present.

Before accepting paid subscribers, configure the infrastructure provider/region, resource limits, readiness/recovery objectives, plan and credit prices, rate-card economics, tool-cost treatment, tax/payment settings, and disclosed grace/retention/refund policies. Exercise capacity failure, provisioning retries, entitlement recovery, archive/restore, and account separation. These are concrete launch gates, not reasons to delay the workspace foundation.

The release evidence must cover 42 core scenarios and 14 hosted scenarios. Disabled/deferred features must be clearly labelled, with no production UI offering an unimplemented action. Record remaining measured limitations and operator runbooks rather than describing target behavior as proven.
