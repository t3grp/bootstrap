# ChatGPT work record

Updated: 6 November 2026, after the D1 integration update and Muse Bot clarification.

## Current ownership

- Coordination/status documentation: prepared in this chat.
- Existing completed delivery: [agent execution PR #3](https://github.com/t3grp/bootstrap/pull/3),
  head `c5a6fa015bd88032cb20d455329a98eef222d3b6`; CI passed; integrated into main
  through PR #4, with PR #3 subsequently closed.
- Next product task: **C01 — named table views, persistence and contract**.
- State: **Reserved; blocked on the active D1 persistence handoff; not started**.
- Implementation branch / base SHA: **not created; record before starting**.
- Work already owned elsewhere: D01 Cloudflare/deployment and M0 Muse Bot landing page.

## C01 bounded deliverable

Implement owner/workspace-scoped named table-view persistence and expose one shared
contract for list/create/update/delete. A view owns its name and validated display,
sort and filter settings; it continues to refer to the existing canonical table.
Deleting a view or removing an embed must not delete table rows. Existing local
table revisions and draft/conflict behavior remain intact.

PR #4 changed the database foundation to D1/local SQLite and merged while this
handoff was being prepared. Wait for that contributor's persistence handoff before
editing schema or runtime files. Use its guarded atomic-batch design and required
revision triggers; do not revive the old PostgreSQL/PGlite implementation. Record
the exact released base and handoff here before starting C01.

Expected path boundary, narrowed again when claimed:

- Shared table-view types in `packages/core/src/`.
- View persistence/migrations in `packages/db/`.
- Scoped server commands/reads in `apps/web/src/lib/server/` and API routing.
- Typed browser API in `apps/web/src/lib/api.ts`.
- Focused domain/persistence tests.

Do not implement Muse Bot's view picker/dialogs or rewrite the table/editor surface.
Do not touch D01 storage, HTTP/validation, deployment or dependency changes while
that track remains reserved. A necessary shared-file change must be recorded and
serialized with its current owner.

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
