# Bootstrap module status and work ownership

Verified: **6 November 2026**, including the subsequent D1 integration update at
`4cca32597fc4b55a9b378af68de5d53cfe0afd50`. This is the shared coordination record
requested by the owner. It separates delivered code from planned modules and
gives each remaining task one implementation owner.

**The full product is not complete.** A usable manual workspace and one bounded
agent execution path are implemented in open PRs. Most teamwork, integrations,
recurring work, and commercial hosting modules remain to be built.

## Start here

- [ChatGPT task record](chatgpt.md): data, API, execution, contracts, and integration.
- [Muse Bot task record](muse-bot.md): landing-page ownership and queued workspace UI.
- [Existing Muse handoff](../muse-handoff.md): Muse Bot's current landing-page assignment.
- [Implementation plan](../implementation-plan.md): B0–B8 and acceptance identifiers.

Current shared folder:
<https://github.com/t3grp/bootstrap/tree/docs/bootstrap-module-coordination/docs/coordination>.
The coordination branch holds these records until they are merged. Implementation
branches remain separate; do not commit product code to the coordination branch.

The owner clarified in this chat that **Muspod means Muse Bot**. Use Muse Bot as
the collaborator name and retain the existing Muse landing-page assignment under
that identity. **Muse Bot has not acknowledged this split or supplied an active
branch.** This document is a published handoff and reservation, not evidence that
the bot has read it or started. No new bot session is launched by this handoff.

## 1. Verified delivery and open stack

All four existing PRs were open and unmerged when checked. No implementation is
being merged or deployed by this coordination update.

| PR | Branch / base | Verified scope and evidence |
| --- | --- | --- |
| [#1](https://github.com/t3grp/bootstrap/pull/1) | `docs/bootstrap-product-spec-20261106` → `main` | Specifications and independent Muse landing brief; draft |
| [#2](https://github.com/t3grp/bootstrap/pull/2) | `feat/workspace-foundation` → specification branch | Owner setup/auth, manual workspace, pages/editor, tables/files, six agent properties; 45 tests and five E2E cases passed at `f468f81037d19d061a9f1e86072fbda0480605a1`; draft |
| [#3](https://github.com/t3grp/bootstrap/pull/3) | `feat/agent-execution` → foundation branch | Bounded assignments, streaming, source scope, save/provenance, cancellation and recovery; 73 tests and seven E2E cases passed at `c5a6fa015bd88032cb20d455329a98eef222d3b6`; ready for review |
| [#4](https://github.com/t3grp/bootstrap/pull/4) | `deploy/cloudflare` → `main` | Integrated #1–#3 plus D1 records, private R2 and Container runtime; head `4cca32597fc4b55a9b378af68de5d53cfe0afd50` passed final D1 CI; application not live according to its deployment handoff |

Evidence: [foundation CI](https://github.com/t3grp/bootstrap/actions/runs/42096480392),
[agent CI](https://github.com/t3grp/bootstrap/actions/runs/42168818923),
[earlier Cloudflare CI](https://github.com/t3grp/bootstrap/actions/runs/42186542265).
That earlier Cloudflare run passed 82 tests and seven E2E cases at `1a3eceb`, before
the D1 change; the new D1 head passed
[run 42203372717](https://github.com/t3grp/bootstrap/actions/runs/42203372717).
PR #4 now targets `main` and
includes the earlier stack, so do not duplicate its integration by independently
merging or rebuilding #1–#3.

The refreshed [Cloudflare deployment record](../cloudflare-deployment.md) uses
**D1 for records and R2 for private files**, with durable SQLite locally. PR #4
records the dedicated D1/R2 resources and deployment settings as configured;
the earlier external-PostgreSQL/token blocker is superseded. Final D1 CI passed;
live acceptance and the persistence handoff remain with its existing contributor.
This coordination check did not
inspect secrets or prove a live endpoint. A single-owner deployment recipe does
not complete B6.

| Module | Current state | Remaining completion work |
| --- | --- | --- |
| B0 Foundation | Implemented foundation; release/live-operation gates remain | Merge/release sequencing, deployment acceptance, operational evidence |
| B1 Manual workspace | Useful core implemented; broader slice partial | Saved named table views, page history/restore interface, scalable loading; import belongs to the B8 portability gate |
| B2 One useful agent | Bounded assignment acceptance implemented; broader slice partial | Pinned executable skill versions, finer resource grants, richer contextual conversation, reviewed page/table proposals and memory workflows |
| B3 Controlled connection | Not implemented | First Composio/Notion account binding, read/write capability, exact approval, action receipt, revocation and uncertain-write reconciliation |
| B4 Agent communication | Not implemented | Durable deliveries, child assignments/results, revision-aware resumption, shared caps and cancellation |
| B5 Complete workflows | Not implemented | Approved Gmail/Calendar/GitHub capabilities, routines, occurrence deduplication, checkpoints and workflow acceptance |
| B6 Managed instances | Not implemented | Subscription entitlement, per-owner provisioning/routing/isolation, lifecycle and recovery; PR #4 only supplies a deployment foundation |
| B7 Managed usage | Not implemented | AI-credit top-ups, rate cards, atomic reservations/settlement, reversals, gateway and usage UI |
| B8 Public/hosted beta | Setup/CI/docs partly present; release incomplete | Native import, tested backup/restore, release/accessibility evidence and all applicable core/hosted acceptance |
| M0 Public landing page | Specification and Muse handoff prepared; no implementation PR found | Existing Muse assignment, LP01–LP18 and actual page evidence |

These are module-level findings from the current plan, source tree, build record,
and PR evidence. They are not a claim that every acceptance case is implemented
or that every screen has been exhaustively retested today.

## 2. Work split

`Reserved` means the named owner has the next task and others must leave its scope
alone. `Awaiting acknowledgment` means a handoff is published but its recipient
has not accepted it. `Queued` is an ordered future assignment, not active work.
`Blocked` needs the listed dependency. `Review` needs a PR and evidence. `Done`
needs the task's acceptance evidence; merged/deployed status is recorded separately.

| Pair | Area | ChatGPT owns | Muse Bot owns | Starting state / dependency |
| --- | --- | --- | --- | --- |
| C01 / M01 | B1 named table views | Persisted view model, scoped/versioned API and shared contract; domain tests | View picker, create/rename/delete controls, sort/filter/column configuration and interaction tests | C01 reserved, blocked on active D1 persistence handoff. M01 queued after M0 or an acknowledged resequence; API wiring waits for C01 contract |
| C02 / M02 | B1 page history | Scoped revision list/read/restore with optimistic conflict checks | History panel, revision preview, restore confirmation and recoverable conflict presentation | Queued after C01/M01; agree contract before wiring |
| C03 / M03 | B8 workspace import | Bounded parser, validation, reference mapping, atomic import and secret exclusion | Import preview/mapping, error review and truthful progress/result UI | Queued; current export/import contract first |
| C04 / M04 | B2 agent completion | Pinned skills, memory/source rules, finer grants, thread/proposal APIs and execution rules | Corresponding six-property, contextual chat and proposal-review interfaces | Queued; split into one capability per PR when activated |
| C05 / M05 | B3 first connection | Composio/Notion binding, capability gateway, approval/action ledger and reconciliation | Connected account selection, exact-action review, revocation and receipt views | Queued; first approved capability contract, deterministic connector fixtures |
| C06 / M06 | B4 agent teamwork | Messages/deliveries, child work, parent revisions, shared budgets/cancellation | Team activity, child-task/result and cancellation views | Queued; B2 contracts plus B3 action rules |
| C07 / M07 | B5 routines/workflows | Scheduler, occurrence deduplication, source checkpoints and approved action manifests | Routine editor, occurrence history, review queue and source-coverage states | Queued; B3–B4 |
| C08 / M08 | B6 managed instances | Account/entitlement, provisioner and lifecycle APIs; payment-event correctness | Instance setup/status, subscription and recovery interfaces | Queued; existing deployment track and stable contracts; no live billing activation |
| C09 / M09 | B7 managed usage | Gateway, rate cards, credit reservations, settlement and reversal ledger | Usage, balance and top-up interfaces driven by server state | Queued; B2 request identity and B6 account/entitlement |
| C10 / M10 | B8 release | Backend recovery/backup acceptance and evidence integration | Keyboard/mobile/accessibility and frontend release acceptance | Queued; relevant feature pairs complete |

**Preserved reservations outside this split:**

- **D01 — Existing Cloudflare/deployment track:** keep PR #4 with its current
  contributor. Neither ChatGPT's new C01 task nor Muse Bot's UI tasks claim this
  work. Its D1 migration actively changes database, auth, workspace and agent
  runtime contracts. C01 must wait for that persistence handoff; do not implement
  against the superseded PostgreSQL/PGlite model or create a competing migration
  or deployment branch.
- **M0 — Muse Bot landing page:** retain the original Muse assignment as Muse
  Bot's current priority. ChatGPT will not implement it. M01 is the next proposed
  UI task after M0 is handed off, unless Muse Bot records existing work and an
  agreed resequence. An acknowledgment is still needed before claiming progress.

## 3. File ownership and integration boundary

Current open-PR reservations override the broad path rules below. Each activated
task must narrow its exact paths in the corresponding owner record.

| Writer | Paths / responsibility |
| --- | --- |
| ChatGPT | `packages/db/**`, shared contracts in `packages/core/**`, `apps/web/src/app/api/**`, `apps/web/src/lib/**`, `apps/worker/**`, backend/domain tests; exclude the D01 reservations below |
| Muse Bot | Task-specific UI under `apps/web/src/components/tables/**` and `apps/web/src/components/workspace/**`, scoped component CSS, new `tests/e2e/workspace-ui/**`; exclude the shared/protected files below |
| ChatGPT, as single integration writer | `apps/web/src/components/workspace/workspace-app.tsx`, `apps/web/src/lib/api.ts`, route/layout entrypoints, `apps/web/src/app/globals.css`, shared package manifests/lockfile and existing E2E suites; D01 work stays with its existing owner until handed over |
| D01 existing contributor | `apps/cloudflare/**`, current `packages/db/**` D1 migration/transport, auth/setup/workspace and agent-runtime changes, worker/instrumentation/health changes, storage/HTTP/validation, Cloudflare/D1 tests/helpers and operational docs; `packages/core/src/file-storage.ts`, scripts, Docker/Compose/CI/dependency changes in [the active D1 commit](https://github.com/t3grp/bootstrap/commit/4cca32597fc4b55a9b378af68de5d53cfe0afd50) |
| Muse Bot, M0 | Isolated marketing route, styles and fixtures under the existing handoff; record exact paths before implementation; root-route/global changes go through the integration writer |

Editor synchronization and save conflict protections are a separate protected
boundary: `apps/web/src/components/editor/**`,
`apps/web/src/components/workspace/save-revisions.ts`, and
`apps/web/src/components/tables/table-utils.ts`. Neither first task modifies
these. A later necessary change gets one named writer and a focused regression
check. Never remove ProseMirror structural equality, navigation flushing,
acknowledged table revisions, or recoverable drafts for interleaved writes.

Keep the six agent property tabs and existing AffectUI/BeUI-inspired workspace.
The Linear-inspired marketing direction belongs only to Muse Bot's landing page.

## 4. How to claim, hand off, and avoid duplicate work

1. Fetch the current remote board and check open PRs before editing. Existing
   work wins; report an overlap instead of restarting it.
2. Update only your owner record with task ID, state, branch, exact base SHA,
   exact paths, dependencies, and timestamp. Use one active task per owner.
   Muse Bot's first update must acknowledge the split and identify any existing work.
3. Publish that claim before product-code edits. Push a fast-forward update or
   use an expected-head check. On a remote conflict, reread and preserve the other
   update; never force-push over another owner's record.
4. ChatGPT publishes the shared types/API contract and its version before Muse Bot
   wires persistence. Muse Bot can prepare isolated UI fixtures meanwhile; fixtures
   must not present mock success as live application behavior.
5. Request shared-file or contract changes in your owner record. The designated
   single writer applies them. Do not maintain two implementations of the same API,
   schema, worker, UI flow or migration.
6. Use one focused implementation PR per task. Record changed behavior, focused
   checks, required CI, screenshots when relevant, limitations, and the exact head.
   Reuse existing evidence; repeat checks to resolve a failure or satisfy a gate.
7. Update your record to `Review` when evidence is ready. Reassign work only after
   the current owner releases it or the user directs the change. Quiet time does
   not itself release a reservation.

This handoff does not launch an agent, create a coding session, enable paid AI,
merge a PR, or deploy anything. Verification continues with deterministic providers
and connectors under the current user constraints.
