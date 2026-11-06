# Muse Bot work record and handoff

Prepared: 6 November 2026, at the owner's request; identity clarified in this chat.

**State: awaiting Muse Bot acknowledgment.** The owner confirmed that the name
Muspod refers to Muse Bot. This record retains Muse Bot's existing landing-page
assignment and proposes its next UI tasks. It does not claim the bot received a
message, has repository access, or has started work.

## Please record before implementation

| Field | Current value |
| --- | --- |
| Acknowledged by / timestamp | Muse Bot (Muse), 2026-11-06 ~19:50 SGT — M0 landing page acknowledged; this record is updated in the M0 implementation PR |
| Collaborator identity or reachable project handle | Muse Bot confirmed by the owner; works in this repo as the Muse agent (Marley) |
| Existing task, branch and touched paths | M0 landing page: branch `feat/landing-page-integrated`, base `main@868f636800d19a420a4721d898a32826bb0d8924`; see paths below |
| Current / next task | M0 landing page (in review, draft PR); M01 proposed next |
| Implementation branch / exact base SHA | `feat/landing-page-integrated` from `main@868f636800d19a420a4721d898a32826bb0d8924` |
| Exact intended paths | New isolated marketing route only: `apps/web/src/app/welcome/**` (layout, page, `landing.module.css`, `components/**`, `lib/**`, `scripts/verify.mjs`, `evidence/verify-results.json`, `PROVENANCE.md`, `README.md`); plus this record. No changes to the root route, root layout, `apps/web/src/app/globals.css`, `apps/web/src/lib/**`, manifests/lockfile, or any workspace/app file. The standalone build's `opengraph-image` route is NOT included (needs the `wawoff2` dependency — requested from the integration writer; see the PR body). |
| Contract commit consumed | None (M0 needs no backend contract) |
| Current state / blocker | Draft PR open for review; needs reviewer evidence check. Blocker for full LP16: og:image needs the integration writer to add `wawoff2` (+ `@fontsource/inter` files) so `opengraph-image.tsx` can be added. |
| Review PR and verification evidence | Pending (PR number recorded here when opened) |

If work is already underway, record it here first. The board's reservations will
be reconciled around that existing work; do not restart or duplicate it.

## M0 — current landing-page assignment

Keep the existing [Muse handoff](../muse-handoff.md) and
[landing-page specification](../landing-page-spec.md). Deliver the isolated,
Linear-inspired marketing page and disclosed concept fixtures with LP01–LP18
evidence. ChatGPT owns authenticated application/backend work and will not build
this page in parallel. Record the current branch, exact paths, progress and PR
above; do not restart an existing implementation.

Landing styles and fixture state stay separate from the authenticated workspace.
Request root-route, global-style or dependency changes through the integration
writer. This handoff does not authorize production publishing or live paid calls.

## M01 — next named table-view interface

Begin after M0 is handed off or a resequence is recorded and acknowledged. C01's
backend work waits for the active D1 persistence handoff. M0 can progress in its
isolated marketing scope while those backend changes are finalized.

Own the remaining named-view interface for the existing canonical table: view
picker, create/rename/delete controls, and sort/filter/visible-column settings.
Preserve the existing application design, keyboard access, mobile layout, canonical
inline/full-page data, selection behavior and recoverable edits.

Initial reserved scope:

- New table-view UI and scoped styles under `apps/web/src/components/tables/views/`.
- Necessary table presentation integration under `apps/web/src/components/tables/`,
  after listing exact files; exclude `table-utils.ts` and existing save protections.
- New focused UI acceptance under `tests/e2e/workspace-ui/`.

ChatGPT owns the model, migrations, API contract/client, server implementation and
shared workspace/route wiring. Request changes to shared files here; do not edit
the database, worker, API, global CSS, manifests/lockfile or root workspace wiring
in parallel. Avoid the active Cloudflare/deployment track's reserved files entirely.

UI fixtures may be prepared before the C01 contract is ready. Keep them isolated
from production behavior. Once C01 publishes its contract, consume those types and
states; do not create an alternative schema or pretend persistence is live.

## Acceptance and return handoff

1. The owner can select, create, rename and delete a named view with clear pending,
   error, empty and conflict states.
2. Settings remain distinct across two views of one canonical table, and persist
   after reload when connected to C01.
3. Deleting a view never deletes table rows; existing edits and selection remain
   recoverable through navigation and conflicts.
4. Keyboard operation and 320/390px layouts remain usable; capture implemented
   desktop/mobile evidence.
5. Submit one focused PR, list exact files and contract SHA, provide focused checks
   and required CI, and record any remaining limitation here.

After M01, the proposed next UI tasks are M02 page-history/restore and M03 import
review. The later module pairs are queued in the [board](README.md). Do not begin
another owner's task without a recorded handoff.

## Requests to ChatGPT

No request or acknowledgment received yet. Add concrete contract/file requests
here; ChatGPT applies changes to its owned integration and backend paths.
