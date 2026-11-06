# Bootstrap engineering rules

Adopted on 6 November 2026 at the owner's request from the
[Vox thread](https://x.com/Voxyz_ai/status/2118720058872701273), including its sixth
post. The procedures below are adapted to Bootstrap's stack, ownership, and cost
constraints. They are requirements for applicable work, not evidence that a new
audit has passed.

## Working agreement

Use the [coordination board](coordination/README.md) before editing. Keep one
writer per shared surface and preserve active PR ownership. Reviews run
sequentially in this chat under the current no-subagent/no-paid-model constraint.

Begin audit-only work with findings: affected page and path, observed problem,
impact, proposed correction, and evidence. Report unknowns as unverified. Apply
fixes when implementation is authorized; reuse existing authorization rather than
asking for the same permission again. A new database, deployment-region change,
dependency removal, or concurrency change needs a specific approved scope.
The previously approved D1/R2 migration remains the current architecture.

## 1. Clear product and implementation

Use a straightforward layout, a clear primary task, and an implementation that
contributors can understand. Remove repeated labels and decorative copy when the
interface already communicates their meaning. Preserve information needed for
recovery, access decisions, costs, and actual task status. Consider the human,
maintainer, and agent caller together. Follow [DESIGN.md](../DESIGN.md), the
existing interaction contract, and the owning contributor's boundary.

## 2. Release review

Review these areas before shipping the affected surface:

| Area               | Required checks                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design             | Reuse palette, type, spacing, and component geometry; check hierarchy, density, and actual text contrast; update DESIGN.md when the system changes            |
| Mobile             | Usable navigation and touch targets, readable enlarged text, preserved layout, and no page-wide sideways scrolling                                            |
| Interaction states | Loading, empty, failure, validation, pending/pressed feedback, and coherent overlays/tab transitions with reduced motion                                      |
| Real journeys      | Complete the applicable setup, editing, assignment, or checkout flow; inspect links, controls, and keyboard operation                                         |
| Release details    | Clear purpose, one principal next action per surface, suitable titles/descriptions/icons, and intentional example content rather than accidental placeholders |

Record findings before edits, then fix the authorized set and capture comparable
before/after views plus behavior evidence. Mark unbuilt flows, such as checkout,
as unavailable rather than passed. Do not create purchases to exercise a review.

## 3. Measured performance

Use a production build or preview. Establish mobile Lighthouse baselines with
three runs per selected page and report the median: the homepage plus two or
three measured slow pages when available. Record each build's commit identity;
hold device/network settings, authentication state, and cache conditions constant
when repeating the measurements after fixes.
Also exercise primary flows under low-end Android/slow-4G emulation.

Inspect four areas:

- Assets: correctly sized modern images, deferred below-fold media, a small font
  set, and nonessential third-party scripts kept off the critical path.
- Frontend: bundle evidence, deferred heavy UI, server data loading where useful,
  streamed agent output, and honest loading placeholders.
- Data/API: appropriate indexes, query count, pagination, and background work.
  Cache only genuinely public equivalent responses; keep authenticated responses
  private and out of shared caches.
- Hosting/network: actual database locality, suitable static rendering, and
  parallel independent requests that preserve ordering and concurrency limits.

Preserve features. Record each change's path and affected page. Follow the working
agreement for dependency, region, or database changes. An unavailable measurement
is a limitation, not a fabricated score or an optimization claim.

## 4. Read-only cleanup assessment

For a requested disk audit, collect paths and sizes without reading file contents.
Skip cloud-synced personal stores, photo libraries, external drives, and locations
that require another system permission. Show a local treemap, deletion effects,
and separate regeneration candidates from items needing personal review. Session
history, downloaded models, and Docker data belong in the review category.

Track size history in the chosen report location and highlight growth. Generate
a cleanup script only for the user's reviewed selections, using each tool's own
cleanup interface. A report does not authorize deletion. Project work does not
silently expand into a scan of the user's home directory.

## 5. Outbound reliability and duplicate effects

Inventory HTTP, database, queue, storage, and model calls in the changed scope.
Use finite, appropriate deadlines. A local timeout does not prove that the remote
operation stopped or failed to commit.

For existing retries, use bounded exponential backoff with jitter and a total
deadline. Do not introduce a retry layer by default. Prove retryable writes are
idempotent and cannot create duplicate records or charges; record risky cases.
Preserve Bootstrap's operation identities, atomic D1 batches, fenced worker
leases, and uncertain-outcome reconciliation. Never replay an ambiguous paid
model request or possible committed write just because a transport timed out.

Assess connection/capacity limits against expected concurrency, reporting evidence
before changing them. D1 bindings do not use a PostgreSQL connection pool.
Verify changed failure and replay behavior with deterministic tests and the
required CI checks; list touched paths and unresolved risks.

## 6. Enforce lessons from repeated mistakes

When the same defect pattern appears twice, add a narrow automated guard with a
message that explains the repair. Prefer lint/static checks for source patterns;
use a regression test for behavioral failures. Cover the real failure and a valid
case so the guard does not merely duplicate implementation or prohibit legitimate
code. Integrate the check into the appropriate verification command. Keep a brief
explanation, but treat the executable guard as the protection against recurrence.

## Evidence and scope

Run focused checks for changed behavior, then required CI. Reuse evidence for
unchanged code; repeat a check only to resolve a concrete failure or satisfy a
gate. Do not use live model charges for verification. Keep implementation,
verification, merge, deployment, and production acceptance distinct.

This adoption adds contributor documentation and the existing design baseline.
It does not claim a whole-site review, new Lighthouse measurements, a full outbound
call audit, a home-folder scan, or a newly installed lint rule. Those checks attach
to their applicable owned task and must have their own evidence.

## Source posts

- [Product simplicity](https://x.com/Voxyz_ai/status/2118720059267055844)
- [Release review](https://x.com/Voxyz_ai/status/2118720059883585653)
- [Performance measurement](https://x.com/Voxyz_ai/status/2118720060730839480)
- [Development cleanup](https://x.com/Voxyz_ai/status/2118720061376725100)
- [Timeouts, retries, and duplicate effects](https://x.com/Voxyz_ai/status/2118720061884215668)
- [Automating repeated corrections](https://x.com/Voxyz_ai/status/2118720062270193837)
