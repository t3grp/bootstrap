# Bootstrap

Bootstrap is an open-source business workspace where founders and solo entrepreneurs organize projects, pages, tables, files, and tasks, with a configurable team of agents built around their work.

The user remains at the center. They can work manually, ask an agent for help on selected resources, or assign a bounded task to several specialists. Each agent has instructions, skills, routines, memories, and access to selected files and tables. Work and results stay in the user's workspace.

Bootstrap will support two deployment paths: a complete self-hosted open-source application using the operator's credentials, and a managed subscription that provisions one application instance per subscriber. Hosted AI usage is funded separately through prepaid top-ups.

## Project status

**First application milestone — 6 November 2026.** The repository now contains a runnable Next.js application, owner authentication, database migrations, and a persistent manual workspace. Agent profiles are configurable; live agent execution, Composio connections, subscriptions, and AI credits remain subsequent milestones. This is an early build, not the complete release described in the specifications.

## Run locally

Use Node.js 22.16 or later (tested with Node.js 24) and pnpm 11.25.0.

```sh
git clone https://github.com/t3grp/bootstrap.git
cd bootstrap
# Until the implementation PR is merged:
git switch feat/workspace-foundation
pnpm install --frozen-lockfile
pnpm init:local
pnpm dev
```

Open **http://localhost:3000**. The initialization command creates private local
settings and prints a setup token. Use that token to create the instance owner
and first workspace. Registration then closes. An existing `.env.local` is never
overwritten by the initializer.

Local development uses PGlite, a PostgreSQL engine persisted in the ignored
`.bootstrap/` directory. No external database, AI key, Composio account, or paid
subscription is needed for manual work. Production uses PostgreSQL.

## Available in this build

- Owner sign-in and multiple separate workspaces.
- Everything and Today views, personal tasks, notes, and scratchpad pages.
- Projects, nested pages, favorites, moves, and subtree Trash/restore.
- Structured block editor with slash insertion, inline formatting, lists,
  checklists, callouts, code, and keyboard block controls.
- Autosave, immutable page revisions, and recoverable version conflicts.
- Typed tables with row/property editing, search, sort, CSV export, and the same
  canonical records embedded inside pages.
- Private file upload/download and page/file/table references.
- Agent profiles with Instructions, Skills, Routines, Memories, Files, and Tables.
  Skills and routines are editable plans at this stage; they do not execute.
- Native JSON and Markdown page export. Workspace JSON exports current resource
  versions and file metadata; download original uploads separately.

The interface uses a Notion-like page canvas and an independently implemented
AffectUI-inspired shell. The table selection hook adapts the MIT-licensed BeUI
primitive. There is no build dependency on the private t3UI catalogue.

## Development and verification

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests start a production standalone build on `127.0.0.1:3100`, use a new
temporary database with test-only credentials, and clean up afterward. They do
not connect to an inherited `DATABASE_URL`. See [build status](docs/build-status.md)
for evidence and remaining gates, and [self-hosting](docs/self-hosting.md) for
PostgreSQL, private storage, and container setup.

## Product specifications

The documents below describe the intended release beyond this first working slice.

| Document | Purpose |
| --- | --- |
| [Product specification](docs/product-spec.md) | Audience, scope, workflows, functional requirements, success measures |
| [Technical design](docs/technical-design.md) | Runtime, Composio boundary, persistence, APIs, recovery, deployment |
| [Agent architecture](docs/agent-architecture.md) | Persistent agents, six resource areas, durable communication, task ownership, delegation |
| [Hosted service](docs/hosted-service.md) | Subscription, one instance per subscriber, provisioning, AI-credit ledger, recovery |
| [Interface and design system](docs/ux-design.md) | Page/block workspace, interaction states, AffectUI/BeUI adoption, accessibility |
| [Landing-page specification](docs/landing-page-spec.md) | Linear-inspired visual brief, complete copy, product-preview fixtures, CTA map, responsive acceptance |
| [Muse handoff](docs/muse-handoff.md) | Ready-to-use implementation brief for the landing page |
| [Implementation plan](docs/implementation-plan.md) | Ordered build slices, acceptance scenarios, release gates |
| [Decision register](docs/decisions.md) | Proposed defaults, trade-offs, decisions needed before release |
| [Source notes](docs/sources.md) | Documentation and repository observations behind this proposal |

## Proposed first release

- A Notion-like workspace with nested block pages, slash commands, linked table views, projects, manual tasks, and files, including when no AI credits are available.
- Growth/Research, Operations, and custom agents; an optional Chief of Staff template.
- Instructions, pinned skills, routines, editable memories, file bindings, and table bindings for every agent.
- Contextual chat, direct assignments, durable agent-to-agent messages, and visible execution history.
- Composio connections with explicit account selection and agent-specific permissions.
- A small tested action set for Gmail, Google Calendar, Notion, and GitHub.
- Reviewable external actions, bounded execution, and recovery after interruption.
- Simple recurring work and self-hosted deployment with bring-your-own credentials.
- Managed subscription checkout, idempotent per-user instance provisioning, separate AI-credit purchases, and measured usage.
- AffectUI as the primary interaction language, supplemented by selected BeUI components.

Self-hosted application code will still require configured model providers and Composio for live connected-service workflows. A clearly labeled demo mode is planned for contributors who have not configured external services.

## Open-source direction

This implementation includes the proposed Apache-2.0 license for newly authored
Bootstrap code. Reused components retain their own licenses and notices. Review
[LICENSE](LICENSE), [NOTICE](NOTICE), and [third-party provenance](THIRD_PARTY_NOTICES.md)
with the implementation PR before adopting this first release.

Openbot is an architectural reference for persistent agents and messaging. The inspected upstream uses PolyForm Noncommercial 1.0.0; Bootstrap's commercial-capable implementation will be original, without copying that source. See [source notes](docs/sources.md) for the pinned reference and the design-system provenance.

The first implementation milestone is a working workspace: create a project home page and subpage, write with blocks, maintain an inline table, attach a file, and manage personal tasks without AI. The next slice adds one configured agent that uses selected resources, produces a saved result, and recovers its run after a worker restart. Bounded teamwork, connected actions, routines, and hosted billing follow as explicit launch gates.
