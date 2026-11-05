# Bootstrap implementation plan

Version: 0.1 proposal. This is a build backlog with acceptance gates, not a claim that the work is complete. The repository currently has no implemented application.

## 1. Delivery strategy

Build complete paths through the product. Prove one agent can finish a task, save its output, survive interruption, and execute one reviewed external action before expanding the team. Use fake providers for deterministic failures and real isolated test accounts for connector acceptance.

Each slice ends with a runnable demonstration and evidence tied to the tested commit. Product completion requires actual behavior, not only a screen, a compiling component, or a successful model response. Keep runtime code, migrations, tests, and documentation for one slice together in a reviewable PR.

## 2. Ordered build slices

| Slice | Work | Acceptance gate | Depends on |
| --- | --- | --- | --- |
| B0 Foundation | Workspace, owner auth, database/migrations, web/worker separation, Compose, shared contracts, CI, approved UI tokens/provenance | Fresh setup opens a workspace; worker and web have independent health; isolation tests pass | License/provenance decision for copied code |
| B1 First useful agent | Business profile, one agent, chat, task/run records, bounded model loop, artifact/version, SSE, deterministic provider | A request produces a saved artifact; refresh and worker restart preserve progress; no simulated success | B0 |
| B2 One controlled connection | Notion read and reviewed page creation, explicit account, capability gateway, approval revision/hash, action ledger, receipts, reconciliation | Correct account is used; stale/double approvals cannot dispatch; crash after write does not blindly duplicate | B1 |
| B3 Agent team and knowledge | Templates/custom agents, role versions, selected uploads/sources, scoped retrieval, one-level delegation, shared budget/cancel | Coordinator and two specialists produce a sourced result; access and budget never widen through delegation | B2 |
| B4 Founder workflows | Gmail, Calendar, GitHub action manifests; three reference workflows; task/artifact/review interfaces | Each workflow passes its seeded cases and isolated live-account acceptance | B3 |
| B5 Recurring operation | Scheduler, timezone, deduplication, coverage checkpoints, carry-forward blockers, in-app notifications, connection recovery, usage | Missed/duplicate runs behave as specified; account revocation blocks future calls; accepted work remains recoverable | B4 |
| B6 Public beta | Standalone public build, notices, contribution docs, demo mode, mobile/accessibility, backup/restore, evaluations | Fresh outsider setup and release acceptance pass without private infrastructure | B5 |

Notion is the first integration because a sourced read followed by a reviewable page creation exercises the complete action path with an inspectable result. The same action protocol must work before adding customer email sends.

## 3. First implementation PR

The first code PR should implement B0 and the smallest B1 path that fits review, or split those along the database/runtime boundary. Its concrete deliverables are:

1. Pinned dependency lockfile and the web/worker/database development setup.
2. Owner setup with closed registration after bootstrap, and a workspace profile.
3. Minimal schema for agent versions, conversations, tasks, runs, events, and artifacts.
4. A controlled AffectUI shell/composer and task/output view using the approved component subset.
5. A deterministic model adapter that produces a labeled demo artifact, plus one configurable live model adapter.
6. Job persistence, event streaming/reconnect, bounded execution, cancellation, and a saved artifact.
7. A test that restarts a worker between steps and verifies one durable output with no duplicate task.

Do not expose a fake connection, approval, voice input, or run-completion control as if it were live. Hide unfinished features or label the entire workspace as Demo.

## 4. Backlog acceptance scenarios

| ID | Scenario | Required evidence | Slice / requirements |
| --- | --- | --- | --- |
| AC-01 | New owner creates business and obtains first result | Persisted profile, agent, task, run, and artifact; no developer intervention after setup | B1; FR-01–04 |
| AC-02 | Two workspaces use overlapping object IDs/resources | API, file, SSE, retrieval, and approval requests cannot cross the boundary | B0–B4; FR-01, FR-06 |
| AC-03 | Refresh/disconnect during a run | Event cursor resumes; no resubmitted message, task, or operation | B1; FR-03, FR-09 |
| AC-04 | Worker crash between model steps | Persisted checkpoint resumes; completed output remains available | B1; FR-09 |
| AC-05 | Two accounts for the same service | After authorizing A, connecting newer B/C does not redirect work; disabling A blocks it without fallback | B2; FR-05 |
| AC-06 | Edit reviewed action/account/attachment | Old approval is superseded and cannot authorize the changed payload | B2; FR-07 |
| AC-07 | Approve twice from two tabs | One atomic decision and one logical external operation | B2; FR-07, FR-09 |
| AC-08 | Provider commits a write then times out | Unknown-outcome state, no blind second write, usable reconciliation path | B2; FR-09 |
| AC-09 | Permission revoked after approval | Dispatch and resumed work are blocked despite the earlier approval; local disconnection is distinct from observed provider revocation | B2; FR-05–07 |
| AC-10 | Malicious source asks for more access or another recipient | Source text cannot change grants or authorized payload | B3; FR-06, FR-10 |
| AC-11 | Specialist tries to delegate or exceed parent grants | Rejected at server; bounded work and explicit blocked reason | B3; FR-08 |
| AC-12 | Cancel root while children run | No further queued child dispatch; in-flight/completed effects remain honestly recorded | B3; FR-08–09 |
| AC-13 | Concurrent work exhausts shared budget | Atomic reservations prevent new unauthorized spend; outputs survive budget stop | B3; FR-08, FR-12 |
| AC-14 | Weekly brief has old unresolved blocker and one failed source | Blocker carries forward; source gap is shown; failed checkpoint does not advance | B4–B5; FR-10–11 |
| AC-15 | Meeting brief and edited follow-up send | Correct account/event/thread, saved draft, exact approved payload, provider receipt | B4; FR-04–07 |
| AC-16 | Triage reruns same customer report | Successful issue creation is not repeated; failed remaining steps can resume | B4; FR-09 |
| AC-17 | Routine duplicated, missed, or affected by DST | One logical occurrence, specified catch-up/skip behavior, visible history | B5; FR-11 |
| AC-18 | Knowledge source removed or grant revoked | No retrieval or future dispatch uses removed access; retention behavior is visible | B3–B5; FR-06, FR-10 |
| AC-19 | Restore backup to isolated deployment | Dispatch disabled, data/artifacts restored, uncertain effects reconciled before writes | B6; FR-09, FR-13 |
| AC-20 | Fresh public clone and documented self-host setup | Build/run without private t3UI access, secret fixtures, or organization-specific endpoints | B6; FR-13 |
| AC-21 | Keyboard, screen reader, mobile approval | Complete primary flows; long payload readable; correct focus; no essential horizontal page scroll | B4–B6; FR-14 |
| AC-22 | Production UI without fixtures | Run, account, approval, and cost states all derive from server data | B1–B6; FR-04, FR-07, FR-12 |
| AC-23 | Approval expires or approver loses authority while queued | Resume performs no external call and requests valid authorization | B2; FR-06–07 |
| AC-24 | Lease lost after dispatch intention, before receipt | Replacement worker reconciles the same operation key and does not resend a non-idempotent action | B2; FR-09 |
| AC-25 | Reviewed update races a remote edit | Atomic provider precondition prevents stale overwrite, or the unsupported capability remains disabled | B2–B4; FR-07, FR-09 |
| AC-26 | Remote source access revoked while content is cached | New retrieval blocks unverifiable/revoked content and reports missing coverage | B3–B5; FR-06, FR-10 |

Where a provider cannot prove an uncertain outcome, acceptance requires honest unresolved status and no automatic duplication, not a fabricated success. Product review determines whether that action can be included in the supported catalogue.

## 5. Testing and evaluation

Use unit tests for state transitions, scope matching, budget arithmetic, payload hashes, and policy decisions. Integration tests use real PostgreSQL and workers to exercise concurrency, restart, cancellation, and transaction boundaries. Fault injection must cover a crash before dispatch, after remote effect, and before receipt persistence. If lifecycle or trigger webhooks are enabled, reject invalid signatures and stale/replayed payloads, prove duplicate valid delivery schedules one logical event, and validate tenant binding before ingestion.

Browser tests cover the real product actions, including reload, two-tab approval, reconnect, mobile layouts, and keyboard navigation. Screenshot comparisons check the adapted UI; they do not replace interaction tests. Test accounts must be isolated from customer production services. Store redacted traces and provider receipts with commit and configuration identifiers.

Evaluate the three workflows with a seeded set of at least ten cases each, including missing data, conflicting sources, stale knowledge, disconnected accounts, and hostile instructions in source text. Grade factual support, output usefulness, correct action/account, permission adherence, and cost. Human review samples live-model outputs; deterministic fixtures verify plumbing without stochastic failures.

## 6. Open-source release gate

Before calling the beta supported, complete:

- Adopt the project license; retain selected component and asset notices and a provenance manifest.
- Provide README setup, contribution guidance, security-reporting instructions, environment example, migrations, and versioned images.
- Verify demo mode works without production credentials and cannot accidentally reach live services.
- Verify each enabled capability's tool schema, auth scopes, error handling, receipt extraction, and recovery behavior.
- Complete AC-01 through AC-26 with evidence; classify any deferred capability as disabled/experimental.
- Document third-party service requirements, credential custody, usage charges, data retention, and telemetry controls.
- Complete isolated backup restoration and a tested upgrade/rollback procedure.

No merge, deployment, or public release is implied by this specification PR. The implementation slices define the work to perform next.

## 7. Access and decisions for implementation

The application skeleton, demo flow, database contracts, policy tests, and component preparation can begin from this specification. Live connector acceptance later needs a development Composio project, supported auth configurations, one model-provider key, isolated test accounts, and an HTTPS callback/verification endpoint. Production setup requires operator credentials and a deployment target.

The proposed core license, first pilot segment, and first supported provider model profile should be settled before the beta is published. The [decision register](decisions.md) gives workable defaults, so these are not open-ended blockers to building the foundation.
