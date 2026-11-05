# Bootstrap

Bootstrap is a planned open-source workspace for founders and solo entrepreneurs to organize an agent team, give it business context, and put it to work through connected services.

The product centers on a practical loop: describe an outcome, assign work, produce a reviewable deliverable, authorize any external action, and verify what happened. Agents have persistent responsibilities; tasks, outputs, permissions, and execution history remain visible to the founder.

## Project status

**Specification stage — 6 November 2026.** The documents below describe the proposed first release. Application code, integrations, deployment, and product acceptance are not implemented by this documentation change.

| Document | Purpose |
| --- | --- |
| [Product specification](docs/product-spec.md) | Audience, scope, workflows, functional requirements, success measures |
| [Technical design](docs/technical-design.md) | Runtime, Composio boundary, persistence, APIs, recovery, deployment |
| [Interface and design system](docs/ux-design.md) | Screens, interaction states, AffectUI/BeUI adoption, accessibility |
| [Implementation plan](docs/implementation-plan.md) | Ordered build slices, acceptance scenarios, release gates |
| [Decision register](docs/decisions.md) | Proposed defaults, trade-offs, decisions needed before release |
| [Source notes](docs/sources.md) | Documentation and repository observations behind this proposal |

## Proposed first release

- One founder operating a business workspace, with explicit workspace isolation.
- A Chief of Staff coordinator, optional Growth/Research and Operations agents, and custom roles.
- Business chat linked to tracked tasks, versioned artifacts, and visible execution history.
- Composio connections with explicit account selection and agent-specific permissions.
- A small tested action set for Gmail, Google Calendar, Notion, and GitHub.
- Reviewable external actions, bounded execution, and recovery after interruption.
- Simple recurring work and self-hosted deployment with bring-your-own credentials.
- AffectUI as the primary interaction language, supplemented by selected BeUI components.

Self-hosted application code will still require configured model providers and Composio for live connected-service workflows. A clearly labeled demo mode is planned for contributors who have not configured external services.

## Open-source direction

Apache-2.0 is proposed for newly authored Bootstrap code; the project license has not yet been adopted. Reused components retain their applicable licenses and notices. Public release requires component-level provenance, a standalone build, and no dependency on access to a private UI catalogue.

The first implementation milestone is a working vertical slice: create a business profile, configure one agent, submit a task, produce a saved artifact, and recover its run after a worker restart.
