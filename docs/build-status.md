# Workspace and bounded agent build

Date: 6 November 2026. Scope: the existing B0/B1 workspace plus one bounded B2
assignment path. The full product specification remains the target; this document
describes the implemented behavior.

## Delivered

| Area           | Current implementation                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| App            | TypeScript/pnpm workspace, Next.js App Router, shared contracts, production standalone bundle                                   |
| Owner access   | Better Auth database sessions, token-protected atomic owner bootstrap, closed signup, same-origin writes                        |
| Persistence    | Drizzle schema/migration, production PostgreSQL adapter, persistent single-process local PGlite                                 |
| Workspace      | Multiple owner workspaces, Everything/Today, projects, tasks, notes, scratchpads                                                |
| Pages          | Stable-ID blocks, nested tree, favorites, safe moves, autosave, immutable revisions, conflicts, exact subtree trash/restore     |
| Editor         | Tiptap community editor, slash menu, inline formatting, list/checklist, callout, code, keyboard block actions, typed references |
| Tables         | Typed canonical rows/properties, edits, row selection, search/sort, inline/full-page presentation, optimistic revisions         |
| Files          | Private bounded uploads, authenticated attachment downloads, logical revocation and exact storage cleanup                       |
| Agent profiles | Instructions, skill/routine notes, memories, and explicit page/file/table read bindings                                         |
| Assignments    | Persisted threads, messages, assignments, runs, events, pinned context, and streamed progress                                   |
| Execution      | One bounded model step, deterministic and server-side compatible providers, cancellation, fenced leases, restart recovery       |
| Results        | Owner-reviewed new page, idempotent save, source snapshots, immutable run receipt and history                                   |
| Export         | Native current-resource JSON, page Markdown, table CSV; no file archive or import                                               |
| Design         | AffectUI-inspired original shell, licensed BeUI selection primitive, Inter/Lucide notices, responsive UI code                   |
| Operations     | Container/Compose recipe, health endpoint, checked-in CI and setup scripts                                                      |

## Verification evidence

### Preserved foundation

The branch was started from `f468f81037d19d061a9f1e86072fbda0480605a1`, still the
open PR #2 head when work began. Its [CI run 42096480392](https://github.com/t3grp/bootstrap/actions/runs/42096480392)
passed frozen installation, TypeScript, production build, 45 unit/domain/editor/
persistence tests, and all five end-to-end scenarios on their first attempts.

Those tests and the original fixes remain: ProseMirror structural equality,
page/agent navigation flushes, acknowledged table revisions across stale renders,
and interleaved-revision detection with recoverable drafts.

### Agent slice

- **26 focused tests passed** across `agent-execution.test.ts` and
  `agent-provider.test.ts`: scoped/idempotent admission, exact selected context,
  page/table/private-file sources, config snapshots, revoked bindings/memories/
  membership, cancellation, time/token/step limits, concurrent saves, source
  dependency checks, stale lease fencing, ambiguous live dispatch, and durable
  close/reopen checkpoint recovery.
- The installed AI SDK 7 adapter was exercised through a mocked HTTP transport,
  including credentials, output caps, usage, redirect refusal, and zero retries.
  **No paid or live AI request was made.**
- The production standalone web and separate worker bundle built successfully.
- The focused **HTTP end-to-end scenario passed** against that production bundle:
  authentication/origin/resource/SSE boundaries, duplicate admission, cancellation,
  output limits, and event-cursor replay.
- Local Chromium cannot start because this environment denies its process-singleton
  socket. This was observed before navigation; it is not a browser acceptance pass.
  Browser acceptance and screenshots run in GitHub Actions.
- Final CI includes the existing 45 regressions, the 26 new focused checks, two
  PostgreSQL integration scenarios, and all seven end-to-end scenarios. PostgreSQL
  uses two independent pools and kills/restarts a real built worker during streaming.
  The new browser scenario covers choose agent → select sources → submit → progress
  → reload in flight → save → reload page/run receipt, plus a 320px screenshot.
- [CI run 42168098794](https://github.com/t3grp/bootstrap/actions/runs/42168098794)
  passed installation, TypeScript, build, all **73 tests**, and all **seven E2E
  scenarios on their first attempts** at `acbe48ad2216052d0ed24e204267a6f5b3778a02`.
  The worker integration ran from an isolated copy of the standalone package.
  Screenshot review then identified a compressed mobile agent heading; the
  responsive follow-up and its final CI evidence are recorded in the stacked PR.

The stacked implementation PR records the exact final commit, run URL, counts,
and any remaining failures. Local targeted evidence does not substitute for the
required final CI result. See [agent operation and acceptance](agent-execution.md)
for reproducible commands and configuration.

## Remaining milestone work

This is not a completed B1/B2 or hosted-service release. The next work includes:

1. Validate a container deployment separately from the passing browser/PostgreSQL CI gate.
2. Saved named table views, import, a page history/restore UI, and lazy resource loading.
3. Expand the bounded agent path with granular grants, packaged skill versions,
   multi-turn chat, and a richer review/task workflow. These are not implied by this slice.
4. The first Composio connection with verified identity, scoped actions, approval,
   idempotent execution, and receipts.
5. Agent-to-agent communication, scheduled routines, and shared spending limits.
6. Managed instance provisioning, hosting subscriptions, and a separate AI-credit ledger.

The Muse landing-page specification remains unchanged and separate from these
authenticated application screens. No live infrastructure, external accounts,
messages, purchases, or subscription charges are created by this build.
