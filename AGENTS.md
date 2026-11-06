# Bootstrap contributor instructions

## Coordination

Before implementation work, read [the coordination board](docs/coordination/README.md)
and the relevant owner record. Until that documentation is merged, the current
board is on the remote `docs/bootstrap-module-coordination` branch; use its latest
version rather than an older local copy.

Record one task, branch, base commit, and intended paths before editing. Respect
another owner's reservation. Shared contracts and integration files have one
writer; request a change through the owner record instead of editing them in
parallel. Existing open PR ownership takes precedence over future task assignments.

Keep verified delivery, proposed work, acknowledgment, and deployment status
distinct. The board does not expand user authorization to merge, deploy, incur
model charges, or launch other coding sessions. Current user instructions prevail.

## Engineering rules

Read [the engineering rules](docs/engineering-rules.md) before changing behavior
and [DESIGN.md](DESIGN.md) before changing interface code. These implement the
owner's 6 November 2026 instruction to follow the linked Vox thread.

1. Keep the human workspace central. Prefer clear structure and direct actions;
   remove redundant copy while preserving useful errors, consent, and status.
2. Review design, mobile layouts, interaction states, real journeys, and release
   details before shipping. Record concrete findings before implementation.
3. Measure performance before and after optimization under the same conditions.
   Preserve functionality and keep authenticated responses out of shared caches.
4. Disk cleanup starts with a metadata-only report. Use reviewed selections and
   tool-native cleanup commands; never execute deletion from an unreviewed report.
5. Bound outbound calls, preserve safe retry/idempotency semantics, and report
   uncertain outcomes. Changing concurrency requires evidence, not guesswork.
6. When a mistake repeats, add an actionable lint or regression guard for the
   actual failure pattern instead of relying only on another prose reminder.

For the current Bootstrap work, use this chat and sequential reviews: no subagents,
separate model sessions, or paid model requests for development/testing. Use
deterministic providers. New explicit owner instructions may change these bounds.
The thread's suggested agent counts do not override these existing constraints.

Keep the coordination board's ownership boundaries, including Muse Bot's landing
page and workspace UI. The original deployment contributor's standards-adoption
record is [D02](docs/coordination/deployment.md).
