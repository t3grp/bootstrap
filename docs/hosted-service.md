# Bootstrap hosted service

Version: 0.2 proposal. This document adds paid managed hosting and prepaid AI usage to the open-source Bootstrap application. It defines implementation contracts; no hosting provider, price, commercial policy, or live infrastructure has been selected or provisioned.

## 1. Product and ownership contract

Offer two ways to run the same founder workspace:

- **Self-hosted:** run the open-source application with the operator's infrastructure, model credentials, and Composio configuration. No Bootstrap subscription, license server, credit service, or hosted control plane is required. External infrastructure and provider charges remain the operator's responsibility.
- **Managed:** a hosting subscription provisions and operates one application instance for the subscribing user. Separately purchased AI credits fund managed model usage.

The ownership chain is User → HostedAccount → HostedInstance → Workspaces. One instance may contain several business workspaces. Billing belongs to the owner account; creating another workspace does not automatically create another subscription. Workspace and run budgets subdivide the owner's available usage.

Keep hosting subscription, instance lifecycle, and credit balance independent. Running out of AI credits does not remove the workspace. Canceling hosting does not erase credit accounting. A payment webhook never directly deletes business data.

The paid service supplies operations and managed usage; it does not gate the standalone open-source core. Hosted adapters may remain optional modules in the repository, with production credentials and operator configuration kept private.

## 2. Control plane and instance boundaries

The shared control plane owns account/customer mappings, hosting entitlements, provisioning operations, instance health, credit accounting, rate cards, and reconciliation. Its worker may use the existing PostgreSQL job infrastructure; these are logical modules, not a requirement for separate microservices.

Each user instance contains application and worker processes, a separate database and database credentials, private artifact storage, and an instance-specific runtime identity. Databases may share a database server and containers may share a host. Describe this as a separate application instance, without promising dedicated hardware. Existing workspace authorization remains necessary inside each instance.

Managed inference passes through a control-plane model gateway. It holds platform model credentials, authorizes reservations, performs provider calls, and settles usage from provider evidence. An instance cannot mint credits, select another account, self-report authoritative charges, or bypass prepaid limits.

Managed Composio calls pass through a connection/tool broker, which may share the gateway deployment. Instances use scoped authenticated RPC. The broker resolves the permitted principal/account and capability route server-side, checks hosting entitlement and operation identity, and rejects unauthorized routes. Normal capability policy and exact-action approvals remain enforced in the application; the broker also verifies its allowed operation and account boundary. Do not assume unverified per-instance Composio project-key scopes.

Platform-wide Stripe, deployment, administration, model, and Composio credentials never enter user instances. Per-instance application encryption keys are separate. Rotate runtime credentials and bind them to account, instance, audience, and deployment generation. Self-host adapters call the operator's providers directly.

Billing logs contain identifiers, usage, and amounts rather than document contents. The model gateway handles prompts in transit but does not persist them in billing logs. Operational access to customer content is restricted and audited.

## 3. Additional records and states

| Record | Required contract |
| --- | --- |
| HostedAccount | Stable owner user ID; Stripe customer mapping; environment; one active instance binding |
| HostingSubscription | Provider subscription and price references; reconciled status; paid entitlement; cancellation/grace timestamps |
| HostedEntitlement | Execution eligibility, limits, effective period, version, and suspension reason |
| HostedInstance | Resource handles, deployment generation, application version, health, database/storage references |
| ProvisioningOperation | Stable idempotency key, desired state, checkpoint, attempts, observed resources, failure |
| CreditPurchase / CreditLot | Verified payment, pack version, units, currency, purchased/promotional classification |
| CreditLedgerEntry | Immutable grant, charge, release, refund/reversal, or explicit correction |
| UsageReservation / Settlement | Account, run/request IDs, rate-card version, reserved units, usage evidence, settled amount |
| RefundRequest | Source purchase, held units, requested monetary amount, provider reference, status |
| BillingEvent / OutboxEvent | Verified incoming event, processing outcome, transactional follow-up work |

Instance states include requested, provisioning, ready, updating, recovering, suspended, archived, deleting, and deleted. Failed provisioning remains a recoverable operation, not proof that the user's data no longer exists.

Credit reservations distinguish held, dispatched, settled, released, and outcome_unknown. A hold is not a charge; a missing receipt is not proof that a call was free.

Enforce database uniqueness for the active instance binding, provisioning operation, purchase fulfillment, provider payment reference, model request reservation, usage settlement, refund operation, and incoming event ID.

## 4. Subscription purchase and payment processing

Create Checkout server-side for an authenticated owner using allowlisted prices and a stored purchase intent. Validate the customer/account binding; do not accept a browser-supplied owner, amount, credit quantity, or arbitrary price as authority. Use stable request keys to recover uncertain Checkout creation.

Stripe documents asynchronous subscription activity and provisioning after a paid invoice with an active subscription. Subscription creation alone may represent an incomplete payment. Therefore, reconcile the first invoice and current subscription before granting paid hosting. [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)

A success redirect shows payment/provisioning progress. It cannot grant access or create resources by itself. Stripe requires webhook-backed fulfillment and checking the retrieved Checkout Session's payment state, including delayed payment outcomes. [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page)

Webhook ingress must:

1. Verify the signature against the raw request body, expected endpoint secret, and environment.
2. Persist the verified event before acknowledging durable acceptance.
3. Process asynchronously, serializing relevant updates per hosted account/payment.
4. Retrieve current provider objects and reconcile the stored purchase/subscription contract.
5. Commit entitlement/ledger changes and follow-up outbox jobs atomically.

Stripe deliveries can be duplicated and unordered; timestamps do not establish reliable event order. Use event IDs for delivery deduplication and current-object retrieval for reconciliation. [Stripe webhook guidance](https://docs.stripe.com/webhooks)

Business uniqueness is separate: repeated notifications for the same paid purchase cannot provision twice or mint again. Do not globally discard every later subscription update sharing an object ID and event type. An old paid-invoice event cannot reactivate a currently ended subscription; an old purchase-success event cannot recreate reversed credits.

Pin the API and SDK versions. Reconcile missing events and stuck operations periodically. Stripe API idempotency is useful for retries but does not replace durable local intent records; API v1 keys can be pruned after at least 24 hours. [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## 5. Provisioning interface and readiness

The exact infrastructure provider is an operational decision. Implement a provider-neutral Provisioner adapter with these operations:

| Operation | Contract |
| --- | --- |
| ensureInstance | Reconcile the desired instance using a stable operation key; return existing or newly created resource handles |
| observe | Report actual resources, version, health, and drift |
| suspend / resume | Change execution eligibility and resource state without deleting persistent data |
| update | Apply an explicitly selected application version through a checkpointed operation |
| snapshot / restore | Produce or recover an account-bound backup with dispatch initially disabled |
| archive | Preserve an exportable recovery package and stop paid execution |
| delete | Separate authorized retention/deletion operation, never a direct billing-event handler |

Every mutation includes account/instance identity, desired generation, and operation key. Persist resource handles before advancing. A retry inspects labelled resources before creating anything. Partial cleanup removes only resources owned by that failed operation and must preserve pre-existing data.

After verified entitlement: reserve capacity, create/reconcile resources, install instance credentials, migrate the database, attach private storage, configure routing, and run readiness checks. Mark ready only after application readiness, database compatibility, worker heartbeat, private storage access, and owner-to-instance routing pass.

Expose actual provisioning progress and a recoverable failure state. A failed attempt does not create another subscription or duplicate credits. Define an operational recovery and non-delivery remedy before accepting live subscriptions.

Use admission limits for available capacity, provisioning concurrency, database connections, storage, and per-instance CPU/memory. Reject or queue unavailable capacity honestly; do not label an unstarted deployment ready. No Kubernetes or new infrastructure purchase is required by this interface.

## 6. AI credits and managed usage

Use a hosting subscription plus separately purchased AI-credit packs for launch. Stripe's documented Billing credits apply to eligible metered subscription items through Meters and apply at invoice finalization; they are not the synchronous reservation mechanism for Bootstrap. The application ledger therefore governs immediate consumption. [Stripe Billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits)

Call the balance AI credits and show raw token categories in usage detail. Input, output, cached, reasoning, audio, or other billable usage can have different rates; credits must not imply all model tokens are interchangeable.

Use integer ledger units and versioned rate cards. A purchase records its pack version and credit entitlement independently of tax and processing fees. Model requests pin their applicable rate version so a later price change cannot alter an already authorized charge.

### Purchase fulfillment

For a top-up, validate the server-created purchase, allowed line items, quantity, currency, and configured tax/discount contract against verified payment state. Mint the defined units once per paid purchase/PaymentIntent. Checkout and payment notifications for the same transaction share that fulfillment record.

Pending delayed payments remain visible but unspendable. Unexpected duplicate payments enter reconciliation rather than being silently discarded. A later successful payment still receives correct accounting if hosting has meanwhile ended. Manual top-ups are the launch scope; automatic replenishment requires a future explicit opt-in and spending limits.

### Reservation and dispatch

Before each paid call, the gateway atomically checks hosting eligibility, instance identity, available credits, and root-run/workspace budgets, then reserves a conservative upper bound. Available credit excludes active usage holds, refund holds, and reversals. Concurrent calls use the same authoritative ledger.

The upper bound includes billable input and bounded maximum output at the pinned rate. Reject unsupported or unbounded price categories until their charge contract is defined. Count retries and delegated work against the same root limits. Expose estimates separately from settled charges.

Composio/provider tool charges require explicit treatment: either included within disclosed hosting/tool-use limits or charged as a named, priced usage category with reservation. They are never silently zero, silently converted into model tokens, or deducted twice. Platform subscription overhead and end-user business transactions are separate from AI usage.

### Settlement and uncertain usage

Persist dispatch intention and request identity before calling the provider. Settle measured billable usage once, release the unused reservation, and retain the receipt. Canceled or failed application requests may still have billable provider usage.

After a crash, timeout, or incomplete usage response, mark the reservation outcome_unknown and retain its hold for reconciliation. Neither worker-lease expiry nor a timer authorizes releasing potentially spent credits. A replacement worker must not replay a potentially completed non-idempotent request merely to recover its usage.

Use provider-supported deduplication and receipt lookup where available. Otherwise apply a documented bounded uncertainty-resolution policy with an auditable adjustment; do not silently debit an invented measurement or release the hold. Missing-provider-usage exposure must have an operator limit.

The instance may cache balance for display only. Gateway or ledger unavailability blocks new paid calls while existing workspace access remains available. Already reserved calls may complete and settle. Browser reconnect must not repeat the model request or charge.

## 7. Service interruption and preserved work

| Condition | Required behavior |
| --- | --- |
| Active hosting, zero available AI credits | Pause before the next unfunded paid step; already reserved requests may finish. Manual reading/editing/export, existing outputs, and account management remain usable. |
| Initial payment incomplete | Preserve signup/purchase state; do not provision paid capacity. |
| Renewal past due | Show the remedy and apply the configured bounded grace entitlement. Preserve data and prepaid balances. |
| Grace exhausted or service suspended | Deny new managed AI calls and external-action dispatch, even when the action needs no model call. Pause routines and preserve read/export or recovery access. |
| Cancellation scheduled | Continue within the paid period, credit balance, and limits; show effective end and retention dates. |
| Subscription ended | Suspend execution and archive under the disclosed policy. Never immediately delete the workspace from a payment webhook. |
| Payment restored | Reconcile entitlement and resume the retained instance where possible; revalidate authority, approvals, and uncertain operations. |

Stripe distinguishes past-due, unpaid, paused, and canceled subscriptions; recovery configuration affects their transitions. Map these to explicit Bootstrap entitlements rather than treating every failure identically. [Stripe subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview)

End-of-period cancellation allows the paid period to complete; a scheduled cancellation differs from an ended subscription. [Stripe cancellation](https://docs.stripe.com/billing/subscriptions/cancel)

Suggested configurable defaults are a seven-day payment-recovery grace and a thirty-day retained archive after service ends. These are proposals, not adopted commercial promises. Display the actual configured dates before cancellation. Deletion requires a separate user-request or disclosed retention-policy operation.

Suspension is enforced at the instance worker and managed gateways. Drain or record already dispatched requests; do not claim that stopping compute reverses an email or provider charge. Receipt verification and reconciliation must remain possible without reopening general execution.

Top-ups do not extend hosting entitlement. Restored subscriptions do not automatically replay missed outbound routines. Resume only after current authority and action state are checked; coalesce appropriate read-only briefings and expose unreconciled work.

## 8. Refunds, reversals, and disputes

Implement the selected refund policy without rewriting ledger history. For an approved unused-credit refund, atomically hold eligible units from the source purchase, excluding consumed units, active reservations, and prior refunds. Create the payment refund with a stable request key.

Pending refunds retain their holds. Confirmed success appends a reversal; confirmed failure releases the hold. An ambiguous result is reconciled before another request. Stripe refunds can remain pending or fail, so creation is not proof of completion. [Stripe refunds](https://docs.stripe.com/refunds)

Dashboard refunds and disputes can occur after credits were consumed. Record the reversal and any resulting deficit explicitly; block new managed spending pending resolution while retaining data access. Never repair a deficit by silently charging the card again. Reinstated funds reverse the corresponding adjustment once.

Subscription cancellation, service-fee refunds, and AI-credit refunds are separate operations. Promotional credits, purchased credits, and consumed usage remain distinguishable. Refund arithmetic must follow the configured pack, discount, currency, and tax policy.

## 9. Operations, backup, and recovery

Rate-limit account creation, Checkout creation, top-ups, model requests, tool calls, and provisioning separately. Set per-account and provider concurrency limits, payload limits, request deadlines, storage quotas, and bounded reconciliation backlogs. Provider throttling parks work without duplicating reservations or external actions.

Record provisioning age, instance health, queue delay, credit holds, settlement lag, discrepancies, and payment-reconciliation failures. Operator corrections require actor, reason, and append-only evidence. The user sees charges and holds by workspace, agent, run, and model/category.

Keep instance backups separate from authoritative control-plane credit accounting. Restoring an instance cannot restore an old wallet balance or grant a purchase again. Rotate the restored runtime generation, disable dispatch, reconcile outstanding operations, and reject superseded runtime credentials before enabling work.

Back up both planes and test isolated restoration. Preserve artifacts, database relationships, encryption material, and exportability. A billing outage or expired subscription must not silently corrupt backups. Production restores and application updates require reconciliation of previously dispatching actions; neither may replay old sends.

## 10. Hosted launch acceptance

These requirements extend the core policy and runtime suite:

| ID | Acceptance requirement |
| --- | --- |
| HC01 | Verified paid signup provisions exactly one instance under concurrent/repeated fulfillment. |
| HC02 | Incomplete, failed, and delayed payments grant neither capacity nor spendable credits prematurely. |
| HC03 | Unordered subscription/refund events cannot restore ended entitlement or reversed credit. |
| HC04 | Provisioner crash/retry reuses owned resources; partial failure preserves existing data. |
| HC05 | Owner A cannot route to, bill, inspect, or provision resources for owner B. |
| HC06 | Concurrent reservations cannot exceed available balance or root/workspace budgets. |
| HC07 | Repeated usage receipts settle once; uncertain provider usage retains a reconcilable hold. |
| HC08 | Zero credits preserves manual workspace use and pauses only unfunded paid execution. |
| HC09 | Suspension blocks external actions without model calls as well as managed inference. |
| HC10 | Refund holds race safely with usage; pending, failed, partial, and reversed payments reconcile. |
| HC11 | Cancellation, archive, and restore preserve data/ledger identity and never replay old sends. |
| HC12 | Gateway/control-plane outage fails closed for new spend while preserving completed work. |
| HC13 | Ready status requires real health/routing checks; capacity exhaustion produces honest status. |
| HC14 | Standalone self-host runs with hosted billing/gateway services absent and operator credentials. |

Before live launch, select the deployment provider/region, actual plan and credit prices, rate-card economics, tool-cost treatment, supported currencies/payment methods, tax handling, jurisdiction-specific terms, refund rules, grace/retention periods, and operational recovery targets. These are launch configuration decisions; they do not block implementing the contracts and tests above.

