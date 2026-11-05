# Workspace foundation build

Date: 6 November 2026. Scope: B0 and a useful first portion of B1, with agent
profile configuration prepared ahead of B2. The full product specification remains
the target; this document describes what the code actually does.

## Delivered

| Area | Current implementation |
| --- | --- |
| App | TypeScript/pnpm workspace, Next.js App Router, shared contracts, production standalone bundle |
| Owner access | Better Auth database sessions, token-protected atomic owner bootstrap, closed signup, same-origin writes |
| Persistence | Drizzle schema/migration, production PostgreSQL adapter, persistent single-process local PGlite |
| Workspace | Multiple owner workspaces, Everything/Today, projects, tasks, notes, scratchpads |
| Pages | Stable-ID blocks, nested tree, favorites, safe moves, autosave, immutable revisions, conflicts, exact subtree trash/restore |
| Editor | Tiptap community editor, slash menu, inline formatting, list/checklist, callout, code, keyboard block actions, typed references |
| Tables | Typed canonical rows/properties, edits, row selection, search/sort, inline/full-page presentation, optimistic revisions |
| Files | Private bounded uploads, authenticated attachment downloads, logical revocation and exact storage cleanup |
| Agent profiles | Instructions, skills/routine plans, memory notes, canonical page/file/table bindings; no execution |
| Export | Native current-resource JSON, page Markdown, table CSV; no file archive or import |
| Design | AffectUI-inspired original shell, licensed BeUI selection primitive, Inter/Lucide notices, responsive UI code |
| Operations | Container/Compose recipe, health endpoint, checked-in CI and setup scripts |

## Verification evidence

- TypeScript check passed.
- Optimized production standalone build passed without requiring AI or integration credentials.
- 14 domain tests passed: owner initialization race, secret validation, workspace
  isolation, private file scope, durable disk reopen, stale and simultaneous page
  saves, parent-cycle races, subtree restoration, unavailable references, typed
  table rollback, stable resource references, unsafe editor data, and export safety.
- 24 additional tests passed against the installed editor schema and real
  ProseMirror transactions: valid block defaults, invalid structures, stable IDs,
  block movement/duplication/deletion, and typed cell parsing.
- The live HTTP end-to-end scenario passed against the production standalone
  bundle: setup/sign-in, scoped resource writes, stale revisions, same-origin
  checks, private upload/download, export, and closed registration.
- Five end-to-end scenarios are checked in: owner/workspace flow, HTTP access guards,
  mobile layout, keyboard blocks/stable IDs, and typed/linked-table behavior.
- Local browser execution is blocked before page navigation: the environment
  denies Chromium's process singleton socket. The Playwright browser download also
  returned an invalid archive. The four UI cases are not successful UI checks;
  CI must run them before browser acceptance.

## Remaining milestone work

This is not a completed B1/B2 or hosted-service release. The next work includes:

1. Finish browser acceptance and validate the PostgreSQL/container deployment.
2. Saved named table views, import, a page history/restore UI, and lazy resource loading.
3. One bounded agent runtime: persisted tasks/threads/runs, streaming contextual
   chat, explicit grants, durable worker execution and recovery.
4. The first Composio connection with verified identity, scoped actions, approval,
   idempotent execution, and receipts.
5. Agent-to-agent communication, scheduled routines, and shared spending limits.
6. Managed instance provisioning, hosting subscriptions, and a separate AI-credit ledger.

The Muse landing-page specification remains unchanged and separate from these
authenticated application screens. No live infrastructure, external accounts,
messages, purchases, or subscription charges are created by this build.
