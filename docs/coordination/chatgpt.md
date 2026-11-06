# ChatGPT work record

Updated: 6 November 2026, after the owner authorized implementation and merging
completed work when checks pass and there is no conflict.

## Current ownership

- Coordination/status documentation: PR #5 merged as `af2bfc43716bf042590ca05e0d0edd9ef1a7b054`.
- Existing completed delivery: [agent execution PR #3](https://github.com/t3grp/bootstrap/pull/3),
  head `c5a6fa015bd88032cb20d455329a98eef222d3b6`; CI passed; integrated into main
  through PR #4, with PR #3 subsequently closed.
- Current product task: **C01 — named table views, persistence and contract**.
- State: **In progress; backend/API only**.
- Implementation branch: `feat/named-table-views`.
- Exact base SHA: `af2bfc43716bf042590ca05e0d0edd9ef1a7b054`.
- Work already owned elsewhere: D01 Cloudflare/deployment and M0 Muse Bot landing page.

## C01 bounded deliverable

Implement owner/workspace-scoped named table-view persistence and expose one shared
contract for list/create/update/delete. A view owns its name and validated display,
sort and filter settings; it continues to refer to the existing canonical table.
Deleting a view or removing an embed must not delete table rows. Existing local
table revisions and draft/conflict behavior remain intact.

The D1 dependency is resolved by the contributor's published deployment/persistence
handoff in `main@b97c9637da24073de7415e86f7c678e0251f2b54`, following passing D1 CI
and deployment. The only open PR at admission was the now-merged coordination PR.
C01 uses the existing guarded atomic-batch adapter and adds the required revision
triggers. It does not change the transport, deployment configuration, authentication,
storage, worker or agent runtime. First-owner production acceptance stays with D01.

Claimed paths:

- `packages/core/src/table-views.ts` and its export from `packages/core/src/types.ts`.
- `packages/db/src/schema.ts` and `packages/db/migrations/0002_table_views.sql`.
- `apps/web/src/lib/server/table-views.ts`.
- `apps/web/src/app/api/table-views/route.ts` and `[id]/route.ts` beneath it.
- `apps/web/src/lib/api.ts` for typed client functions.
- `tests/domain/table-views.test.ts`, `tests/domain/table-views-d1.test.ts`,
  and API acceptance in `tests/e2e/table-views.spec.ts`.
- `tests/helpers/d1.ts`, limited to loading all ordered SQL migrations in the
  existing disposable D1 fixture; the current helper only loads `0001_d1.sql`.
- `docs/table-views.md`, this owner record, and board status in `README.md` here.

Do not implement Muse Bot's view picker/dialogs or rewrite the table/editor surface.
Do not touch D01 storage, HTTP/validation, deployment or dependency changes while
that track remains reserved. A necessary shared-file change must be recorded and
serialized with its current owner.

Shared-test integration request resolved for C01: no competing PR was open when
the migration-fixture change was claimed. D01's merged persistence handoff is the
base. The fixture must apply `0002_table_views.sql` for both domain and HTTP
acceptance to exercise the deployed schema. Only its migration-loading loop is
claimed; the D1 binding, transport and lifecycle stay unchanged.

## Contract handoff to M01

Before UI API wiring, publish the types, operation names, validation/size limits,
revision/conflict behavior, selected-view routing/persistence decision, and error
states in this record, with the contract commit SHA. Provide deterministic fixtures
for loading, empty, ready, denied, stale revision and failure states. Reuse existing
canonical table structures; do not ask Muse Bot to invent a separate data model.

Acceptance:

1. Named view settings survive reload and remain distinct for the same table.
2. Inline and full-page uses show the same canonical row data.
3. Cross-workspace access and invalid settings fail without a partial mutation.
4. Conflicting updates preserve recoverable user state.
5. View deletion preserves the table and its data.
6. Existing workspace/agent tests pass; UI acceptance is integrated after M01.

## Requests and evidence

- Muse Bot acknowledgment: pending in [muse-bot.md](muse-bot.md).
- C01 contract commit: pending.
- Implementation PR / focused checks / final CI: pending.
- Next queued work: C02 page-history API, then C03 import; later tasks follow the
  [board](README.md) and activate one bounded PR at a time.
