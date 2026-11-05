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

## Product reference: Bench

The user supplied [Kitze's Bench concept](https://x.com/thekitze/status/2118237135698632943). The post and its images were inspected in a connected browser. The visible workspace overview groups projects/benches, places personal to-dos, notes, and scratchpad alongside work, and keeps agent status compact. The related [Today view](https://x.com/thekitze/status/2118237154224767408) supports reviewing work by day. These observations inform Bootstrap's workspace hierarchy; they do not establish Bench's implementation or authorize copying its assets or branding.

## Openbot architectural reference

The inspected public source is `nightly-labs/openbot` at commit `4b39c9a497cfd4af7a718cfdeab52e2059ca6b91`. Bootstrap's design adapts architectural ideas through original implementation. The upstream [README identifies PolyForm Noncommercial 1.0.0](https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/README.md); this is not a permissively licensed code dependency for the proposed paid service. No upstream source is copied by these specs.

| Pinned source | Observation used |
| --- | --- |
| [Agent architecture](https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/docs/architecture/agents.md) | Persistent identity with separate task execution threads and queues |
| [Channels and messaging](https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/docs/architecture/channels-and-messaging.md) | One task owner, explicit delegation versus transfer, task-linked results |
| [Mailbox records](https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/src/backend/mailbox-store.ts) | Message content/provenance separate from per-recipient delivery state |
| [Skills and plugins](https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/docs/architecture/skills-and-plugins.md) | Skill entrypoints, versioned library material and agent installations |
| [Memory contract](https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/packages/contracts/src/ipc-agent-memories.ts) | Attributed memory with selected versus searchable inclusion |
| [Table implementation](https://github.com/nightly-labs/openbot/blob/4b39c9a497cfd4af7a718cfdeab52e2059ca6b91/src/backend/agent-data/agent-tables.ts) | Shared tables and creator schema ownership; Bootstrap instead requires explicit resource grants |

The requested six-resource model, action/notification admission, original server runtime, permissions, and hosted credit controls are Bootstrap design decisions. No compatibility or feature-parity claim is made.

## Composio

| Official reference | Specific capability used in the design |
| --- | --- |
| [Authentication](https://docs.composio.dev/docs/authentication) | Stable user identities, managed connection flows, server-side credential handling |
| [Auth configurations](https://docs.composio.dev/reference/api-reference/auth-configs) | Authentication methods, scopes, and application-level configuration |
| [Connected accounts](https://docs.composio.dev/reference/api-reference/connected-accounts) | Per-user accounts, lifecycle/revocation, callback identity verification |
| [Tool Router Sessions](https://docs.composio.dev/kb/guide/mcp-tool-router-sessions) | Account pinning, toolkit allowlists, session/account lifecycle distinction |
| [Create session API v3.1](https://docs.composio.dev/reference/api-reference/tool-router/postToolRouterSession) | Current session configuration controls and execution surfaces |
| [Receiving events](https://docs.composio.dev/docs/setting-up-triggers/subscribing-to-events) | Signed webhook handling and production ingress |
| [Sessions and direct execution](https://docs.composio.dev/docs/sessions-vs-direct-execution) | Fixed-tool sessions and session approvals, including underlying multi-execute actions |
| [Deleting connected accounts](https://docs.composio.dev/reference/api-reference/connected-accounts/deleteConnectedAccountsByNanoid) | Local disconnection versus optional asynchronous provider revocation |

The design deliberately adds Bootstrap-owned authorization, resource constraints, approvals, idempotency records, and recovery. Composio integration availability does not establish that every action is tested or that its effects are safe to retry. Capability slugs and schema versions must be resolved and pinned during implementation.

## Managed hosting and payment

| Official reference | Specific behavior relevant to the proposal |
| --- | --- |
| [Subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) | Asynchronous state; a paid invoice and current active subscription support provisioning |
| [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page) | Server-verified payment state and repeated/concurrent fulfillment; redirects alone are insufficient |
| [Webhook guidance](https://docs.stripe.com/webhooks) | Raw-body signatures, duplicate delivery, unordered events, and provider-object reconciliation |
| [Billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits) | Credits apply to eligible metered subscription items through Meters and invoice finalization |
| [Idempotent requests](https://docs.stripe.com/api/idempotent_requests) | Supported request retries and the need for longer-lived application intent records |
| [Subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview) | Distinct incomplete, past-due, unpaid, paused, and canceled states |
| [Cancellation](https://docs.stripe.com/billing/subscriptions/cancel) | Scheduled period-end cancellation versus ended subscription |
| [Refunds](https://docs.stripe.com/refunds) | Pending, successful, and failed refund states need reconciliation |

The per-user instance, control-plane gateways, prepaid runtime ledger, grace/retention proposals, and pricing structure are Bootstrap recommendations. They are not hosting guarantees, Stripe-mandated architecture, adopted commercial terms, or measured costs.

## Runtime and distribution

| Official reference | Use |
| --- | --- |
| [AI SDK loop control](https://ai-sdk.dev/docs/agents/loop-control) | Configurable model/tool loops; Bootstrap adds durable persistence and shared budgets |
| [pg-boss](https://github.com/timgit/pg-boss) | Postgres queue, scheduling, transactional job creation, and retry capabilities |
| [Better Auth installation](https://better-auth.com/docs/installation) | PostgreSQL/Drizzle setup and application authentication |
| [Apache License 2.0](https://apache.org/licenses/LICENSE-2.0.html) | Proposed license for new code, including its explicit patent provisions |

Check installed documentation and lock versions before writing SDK-specific implementation. No provider price, free-tier allowance, release date, performance benchmark, or deployment cost is asserted by this specification.
