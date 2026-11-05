# Bootstrap

Bootstrap is a planned open-source business workspace where founders and solo entrepreneurs organize projects, documents, tables, files, and tasks, supported by a configurable team of agents.

The user remains at the center. They can work manually, ask an agent for help on selected resources, or assign a bounded task to several specialists. Each agent has instructions, skills, routines, memories, and access to selected files and tables. Work and results stay in the user's workspace.

Bootstrap will support two deployment paths: a complete self-hosted open-source application using the operator's credentials, and a managed subscription that provisions one application instance per subscriber. Hosted AI usage is funded separately through prepaid top-ups.

## Project status

**Specification stage — version 0.2, 6 November 2026.** The documents below describe the proposed first release, incorporating the Bench workspace reference, Openbot communication patterns, and paid instance deployment. Application code, integrations, deployment, and product acceptance are not implemented by this documentation change.

| Document | Purpose |
| --- | --- |
| [Product specification](docs/product-spec.md) | Audience, scope, workflows, functional requirements, success measures |
| [Technical design](docs/technical-design.md) | Runtime, Composio boundary, persistence, APIs, recovery, deployment |
| [Agent architecture](docs/agent-architecture.md) | Persistent agents, six resource areas, durable communication, task ownership, delegation |
| [Hosted service](docs/hosted-service.md) | Subscription, one instance per subscriber, provisioning, AI-credit ledger, recovery |
| [Interface and design system](docs/ux-design.md) | Screens, interaction states, AffectUI/BeUI adoption, accessibility |
| [Implementation plan](docs/implementation-plan.md) | Ordered build slices, acceptance scenarios, release gates |
| [Decision register](docs/decisions.md) | Proposed defaults, trade-offs, decisions needed before release |
| [Source notes](docs/sources.md) | Documentation and repository observations behind this proposal |

## Proposed first release

- A useful workspace with projects, manual tasks, documents, bounded tables, and files, including when no AI credits are available.
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

Apache-2.0 is proposed for newly authored Bootstrap code; the project license has not yet been adopted. Reused components retain their applicable licenses and notices. Public release requires component-level provenance, a standalone build, and no dependency on access to a private UI catalogue.

Openbot is an architectural reference for persistent agents and messaging. The inspected upstream uses PolyForm Noncommercial 1.0.0; Bootstrap's commercial-capable implementation will be original, without copying that source. See [source notes](docs/sources.md) for the pinned reference and the design-system provenance.

The first implementation milestone is a working workspace: create a project, write a document, maintain a small table, upload a file, and manage personal tasks without AI. The next slice adds one configured agent that uses selected resources, produces a saved result, and recovers its run after a worker restart. Bounded teamwork, connected actions, routines, and hosted billing follow as explicit launch gates.
