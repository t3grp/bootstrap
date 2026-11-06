# Workspace and bounded agent build

Date: 6 November 2026. Scope: the existing B0/B1 workspace plus one bounded B2
assignment path. The full product specification remains the target; this document
describes the implemented behavior.

## Delivered

| Area           | Current implementation                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| App            | TypeScript/pnpm workspace, Next.js App Router, shared contracts, production standalone bundle                                   |
| Owner access   | Better Auth database sessions, token-protected atomic owner bootstrap, closed signup, same-origin writes                        |
| Persistence    | Drizzle SQLite schema, Cloudflare D1 with revision-guarded atomic batches, persistent SQLite for local/Docker use                |
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
| Operations     | Live Cloudflare Worker/Container, D1 migrations, private R2, Compose recipe, health endpoint, CI and setup scripts              |

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
- That slice's CI included the existing 45 regressions, the 26 new focused checks, two
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

### D1 migration and live Cloudflare deployment

[PR #4](https://github.com/t3grp/bootstrap/pull/4) integrated the specification,
workspace, agent, and deployment history into `main` at
`f766865e8945ee684d5196ba560ed0791eb6ff7d`. Cloudflare D1 supersedes the earlier
PostgreSQL/PGlite deployment design. R2 stores private file bytes; the container
filesystem holds no durable application data.

- [Final PR CI](https://github.com/t3grp/bootstrap/actions/runs/42203372717)
  passed application/Cloudflare type checks, the actual Docker deployment dry run,
  the standalone build, **90 tests**, and **all seven browser scenarios** with a
  real local workerd D1 binding. Tests include atomic rollback, conflicting clients,
  ambiguous transport outcomes, and a killed/restarted standalone agent worker.
- [Merged-main CI](https://github.com/t3grp/bootstrap/actions/runs/42203801902)
  passed on the same application tree.
- [Production deployment](https://github.com/t3grp/bootstrap/actions/runs/42204035586)
  applied the D1 migration and published the Worker and container on 6 November
  2026. The live app is
  [bootstrap.sherman-tansx.workers.dev](https://bootstrap.sherman-tansx.workers.dev).
- Live verification confirmed HTTP 200 with `{"status":"ok"}` from `/api/health`,
  the owner setup screen, the dedicated D1 binding, and the private R2 binding.
  The database schema and initial revision are present in the production D1 database.
- The owner account has not been claimed. Production authenticated file operations
  and persistence across a production container restart are not claimed as verified;
  these remain the first owner acceptance checks.
- No live model is configured, and no paid model request was used for this work.

See [Cloudflare deployment](cloudflare-deployment.md) for resource setup, private
bindings, deployment commands, data limits, and the explicit legacy-data caveat.

## Remaining milestone work

This is not a completed B1/B2 or hosted-service release. The next work includes:

1. Claim the deployed owner workspace, then verify an authenticated R2 upload/download
   and persistence after a production container restart.
2. Saved named table views, import, a page history/restore UI, and lazy resource loading.
3. Expand the bounded agent path with granular grants, packaged skill versions,
   multi-turn chat, and a richer review/task workflow. These are not implied by this slice.
4. The first Composio connection with verified identity, scoped actions, approval,
   idempotent execution, and receipts.
5. Agent-to-agent communication, scheduled routines, and shared spending limits.
6. Managed instance provisioning, hosting subscriptions, and a separate AI-credit ledger.

The Muse landing-page specification remains unchanged and separate from these
authenticated application screens. The live deployment is a single owner's
instance; connected-service actions, subscriber provisioning, subscriptions, and
AI-credit billing remain later milestones.
