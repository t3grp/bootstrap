# Bootstrap source notes

Checked 6 November 2026, Singapore time. Repository observations establish the starting point. External documentation supports specific platform capabilities. Product scope, stack selection, numerical limits, metrics, and acceptance targets are proposals from this specification, not facts claimed by those sources.

## Repository baseline

- [Bootstrap](https://github.com/t3grp/bootstrap), initial commit [`b8fbdb7c6cffe316be56163fe858570ddd95be46`](https://github.com/t3grp/bootstrap/commit/b8fbdb7c6cffe316be56163fe858570ddd95be46): public repository, `main` branch, README only at inspection.
- [t3UI inspection commit](https://github.com/t3grp/t3UI/commit/66ff17008ebf30e73e7662234e3f14660f8a5c14): private source catalogue used read-only for component selection. Links require repository access; Bootstrap's eventual public build must not require it.
- [t3UI source licensing policy](https://github.com/t3grp/t3UI/blob/66ff17008ebf30e73e7662234e3f14660f8a5c14/docs/licensing-and-release.md): distinguishes contributor-owned code from upstream code and third-party assets.
- [AffectUI attribution](https://github.com/t3grp/t3UI/blob/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/affectui/ATTRIBUTION.md): records pinned MIT upstream files and independent recreations; distinguishes inventory from API/visual acceptance.
- [AffectUI run source](https://github.com/t3grp/t3UI/blob/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/affectui/recreated/agent-run.tsx) and [composer source](https://github.com/t3grp/t3UI/blob/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/affectui/recreated/chat-composer.tsx): contain demonstration state transitions requiring production adaptation.
- [AffectUI recreated components](https://github.com/t3grp/t3UI/tree/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/affectui/recreated), [BeUI agent components](https://github.com/t3grp/t3UI/tree/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/beui/vendor/components/agents), and [BeUI motion components](https://github.com/t3grp/t3UI/tree/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/beui/vendor/components/motion): inspected candidates mapped in the interface specification.
- [BeUI source snapshot](https://github.com/t3grp/t3UI/blob/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/beui/upstream.json) and [license](https://github.com/t3grp/t3UI/blob/66ff17008ebf30e73e7662234e3f14660f8a5c14/components/collections/libraries/beui/LICENSE): identify the upstream revision and MIT notice.

No UI code or assets are copied by this documentation change. Source inspection is not browser acceptance or a universal parity claim.

## Composio

| Official reference | Specific capability used in the design |
| --- | --- |
| [Authentication](https://docs.composio.dev/docs/authentication) | Stable user identities, managed connection flows, server-side credential handling |
| [Auth configurations](https://docs.composio.dev/reference/api-reference/auth-configs) | Authentication methods, scopes, and application-level configuration |
| [Connected accounts](https://docs.composio.dev/reference/api-reference/connected-accounts) | Per-user accounts, lifecycle/revocation, callback identity verification |
| [Tool Router Sessions](https://docs.composio.dev/kb/guide/mcp-tool-router-sessions) | Account pinning, toolkit allowlists, session/account lifecycle distinction |
| [Create session API v3.1](https://docs.composio.dev/reference/api-reference/tool-router/postToolRouterSession) | Current session configuration controls and execution surfaces |
| [Receiving events](https://docs.composio.dev/docs/setting-up-triggers/subscribing-to-events) | Signed webhook handling and production ingress |

The design deliberately adds Bootstrap-owned authorization, resource constraints, approvals, idempotency records, and recovery. Composio integration availability does not establish that every action is tested or that its effects are safe to retry. Capability slugs and schema versions must be resolved and pinned during implementation.

## Runtime and distribution

| Official reference | Use |
| --- | --- |
| [AI SDK loop control](https://ai-sdk.dev/docs/agents/loop-control) | Configurable model/tool loops; Bootstrap adds durable persistence and shared budgets |
| [pg-boss](https://github.com/timgit/pg-boss) | Postgres queue, scheduling, transactional job creation, and retry capabilities |
| [Better Auth installation](https://better-auth.com/docs/installation) | PostgreSQL/Drizzle setup and application authentication |
| [Apache License 2.0](https://apache.org/licenses/LICENSE-2.0.html) | Proposed license for new code, including its explicit patent provisions |

Check installed documentation and lock versions before writing SDK-specific implementation. No provider price, free-tier allowance, release date, performance benchmark, or deployment cost is asserted by this specification.
