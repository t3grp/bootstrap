# One useful agent: operation and acceptance

This slice adds one explicit, bounded assignment to a configured specialist. It
does not activate Composio, tools, delegation, schedules, billing, or provisioning.
The existing workspace, editor, tables, files, and six agent property areas remain
available without model credentials.

## Try it without AI requests

Use Node.js 24+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm init:local
```

Add these two lines to `apps/web/.env.local`:

```dotenv
BOOTSTRAP_MODEL_PROVIDER=deterministic
BOOTSTRAP_ENABLE_TEST_PROVIDER=true
```

Run `pnpm dev`, open the configured origin (normally `http://localhost:3000`), and
create/sign in as the owner. Local SQLite uses an embedded worker in the same Node process. No model API key is
needed. The UI and every result explicitly identify deterministic fixture output;
this provider does not reason about the task or call an AI service.

1. Create a page, table, or supported text upload in your workspace.
2. Open **Your team**, choose/create a specialist, and save its Instructions.
3. On **Files** and **Tables**, bind the resources the agent may read. Saving these
   owner-controlled bindings establishes its read ceiling; removing one blocks
   subsequent retrieval/dispatch, including queued work.
4. Open **Assignments**, enter the task and result-page title, optionally choose a
   project, and explicitly select up to eight bound resources. No resource is
   selected automatically. An assignment with no sources is also valid.
5. Select **Run assignment**. Watch durable progress and response text. Reloading
   the page or disconnecting the browser does not cancel admitted work.
6. Review **Sources and run history**, then choose **Save result to workspace**.
   This accepts the result into one new page. Input pages/tables are not edited.
7. Open that page and reload. Its provenance panel retains the source versions,
   original result/run, usage, and event history. Editing the page afterward does
   not rewrite the immutable run receipt.

Cancel stops accepting new output and asks the provider to abort. An already
dispatched request may have incurred usage; cancellation does not claim a refund.
Partial output remains in the run but cannot be accepted as a completed result.

## Live provider configuration

The optional server adapter uses pinned `ai@7.0.163` and
`@ai-sdk/openai-compatible@3.0.85`. Configure an operator-controlled endpoint and
model explicitly; there is no default paid model or implicit fallback:

```dotenv
BOOTSTRAP_MODEL_PROVIDER=openai-compatible
BOOTSTRAP_MODEL_BASE_URL=https://your-provider.example/v1
BOOTSTRAP_MODEL_ID=your-model-id
BOOTSTRAP_MODEL_API_KEY=your-server-only-provider-key
```

These names are examples, not working credentials. HTTPS is required except for
an HTTP provider on loopback. Endpoint credentials, query parameters, and fragments
are rejected, and redirects are not followed with the provider credential. The
base URL/model are operator settings, never browser-supplied request fields.

Restart web and worker after changing settings. They must use the same provider,
endpoint, model, and caps. A queued run pins a fingerprint of provider/endpoint/model;
changing it blocks dispatch instead of silently changing models. Rotating a key
for the same endpoint/model does not change that fingerprint.

Only sanitized readiness, provider kind, model name, limits, and a configuration
message reach the browser. Missing/invalid settings disable assignment submission
with `CONFIGURATION_REQUIRED`; manual work remains usable. Test mode requires both
explicit settings shown above. Live assignments may incur charges on the operator's
provider account. The adapter is transport-tested with a fake HTTP response;
no paid/live model request was made during development or verification.

### Bounds

| Bound              | Default             | Hard maximum / behavior                                                    |
| ------------------ | ------------------- | -------------------------------------------------------------------------- |
| Model steps        | 1                   | 1; no tool calls or SDK retries                                            |
| Input allowance    | 16,000              | 32,000 conservative token units                                            |
| Output tokens      | 2,048               | 4,096; also bounded to four UTF-8 bytes per allowed output token and 64 KB |
| Run deadline       | 120 seconds         | 300 seconds; starts at first claim and includes restart downtime           |
| Selected resources | 8                   | Whole selected pages/tables/files; no recursive resource expansion         |
| Assignment text    | 16 KB               | Rejected before admission when exceeded                                    |
| Concurrent work    | 1 run per workspace | Up to eight queued/running assignments per workspace                       |
| Recovery attempts  | 3                   | Same run, deadline, and logical step allowance                             |
| Worker lease       | 15 seconds          | Renewed every 500 ms while executing; every mutation checks its epoch      |

Set `BOOTSTRAP_AGENT_MAX_INPUT_TOKENS`, `BOOTSTRAP_AGENT_MAX_OUTPUT_TOKENS`, and
`BOOTSTRAP_AGENT_TIMEOUT_MS` to lower or raise the operator caps within the hard
maxima. Per-assignment limits can only reduce those configured caps. Invalid cap
settings produce a configuration state instead of unlimited execution.

Input admission conservatively counts UTF-8 bytes plus 256 envelope units because
an arbitrary compatible provider's tokenizer is unknown. This is an input-size
guard, not a precise provider token count or a monetary guarantee. Excess context
is rejected, not silently truncated. The adapter sends the output-token ceiling,
checks returned usage, and stops local acceptance if the provider reports an excess.
A provider that disregards its own cap may still charge for already dispatched
work. Unknown usage stays unknown. There is no credit ledger or currency budget yet.

## D1/SQLite and the separate worker

For self-hosted SQLite, set `BOOTSTRAP_DATA_DIR` to the shared persistent directory
and `BOOTSTRAP_AGENT_WORKER=external` in both process environments. Cloudflare sets
`BOOTSTRAP_DATABASE=cloudflare-d1` and uses the supervised external worker.

```sh
pnpm dev
# In a second terminal:
pnpm worker
```

`pnpm worker` loads `apps/web/.env.local` when present. Web and worker must share the same database and
`BOOTSTRAP_DATA_DIR` for private file reads. The `BOOTSTRAP_AGENT_WORKER` web setting
is `embedded` or `external`; the defaults select embedded for SQLite and external
for Cloudflare D1. A queued assignment remains durable if the external worker is
offline. Its UI says it is waiting for the worker; it does not invent progress.

`pnpm build` creates the web standalone bundle and a bundled `worker.mjs` in
`apps/web/.next/standalone/`. The worker uses the same migrations and database
dependencies as the web bundle. The Compose recipe runs web and worker as separate
services with a shared private-files volume. Start it with the environment in
[self-hosting](self-hosting.md), plus the chosen provider settings. The Cloudflare supervisor runs both processes in one container.

The bounded run table is this slice's transactional queue. Admission writes the
assignment, thread, user message, run, and first event together. Workers select
eligible rows and commit claims through the same revision-guarded atomic D1/SQLite
batch used by manual edits. No transaction stays open during a model request. A
separate queue/outbox dispatcher is deferred until the later scheduling/messaging slices; the business
records and fenced leases already own recovery and deduplication.

## Source access and preservation

The model receives its pinned agent instructions, owner-authored skill/memory
notes, the new assignment, and **only** selected snapshots. Prior conversation/run
text is not automatically injected. This is one assignment and result per thread,
not an open-ended conversation loop.

- Pages and tables pin their current revision at admission. Files pin their
  creation version plus a verified SHA-256 digest. Changed selections cause a
  visible conflict before a model call.
- Page references become non-disclosing placeholders; linked targets, descendants,
  task lists, and table file cells are not fetched. Selecting a resource never
  authorizes its links.
- Text, Markdown, CSV, and JSON uploads must be valid UTF-8 and at most 64 KB.
  The file is read by the server's stored ID, checked against its size/hash, and
  never executed. PDF/image extraction and arbitrary URLs are not supported.
- Before dispatch, during lease renewals, and before output checkpointing, the
  worker checks the initiating owner's membership, live agent, bindings, source
  availability, and whether included memories were forgotten. Revocation cannot
  withdraw content already delivered to a provider, but stops further acceptance.
- Selected generated pages retain dependencies on their original sources, so a
  saved summary cannot silently bypass revoked bindings. Recursive provenance is
  bounded; deep chains require selecting original sources.
- Source/configuration snapshots and progress remain in owner-scoped history.
  Removing a binding or deleting an agent does not erase business pages or receipts.
  History does not itself authorize a new model call.

All execution relationships include the workspace boundary in composite foreign
keys. Authenticated reads, event streams, cancel, and save operations check the
workspace owner. Writes retain the existing same-origin protection and bounded JSON
parsing. SSE rechecks session and membership while connected and replays only
events after its cursor. Raw provider errors/prompts are not written to logs;
progress events contain concise execution summaries, never model chain of thought.

## Restart behavior

| Interruption boundary                                          | Recovery                                                                                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Queued or claimed, before dispatch intention                   | Reclaim the existing run after lease expiry and execute its bounded step                                                     |
| During deterministic test dispatch                             | Replay the same pure fixture with the same request/context; clear incomplete output; retain original deadline and step count |
| During live dispatch without a completed checkpoint            | Mark `reconciling` / `PROVIDER_OUTCOME_UNKNOWN`; preserve partial text and do not send another model request                 |
| Completed output checkpoint, before terminal transcript commit | Finalize the same checkpoint without a model call                                                                            |
| Completed transcript or saved workspace page                   | Read the committed receipt; duplicate save returns the existing page, including if that page was later trashed               |
| Stale worker returns after a new claim or cancellation         | Its lease epoch fails; it cannot append, checkpoint, finalize, or save output                                                |

Result acceptance creates a new document, first document revision, assignment
acceptance state, run reference, and event in one transaction under the workspace
lock. The original result remains inspectable. There is no automatic live retry
after uncertain use; investigate provider usage and explicitly submit new work if
needed. Provider reconciliation UI/automated usage lookup are later work.

## Verification

The focused suite runs the real migrated SQLite schema and a deterministic or
explicitly mocked adapter:

```sh
pnpm exec vitest run tests/domain/agent-execution.test.ts tests/domain/agent-provider.test.ts
pnpm exec playwright test tests/e2e/agent-execution.spec.ts
```

CI starts an isolated local workerd D1 binding. Two independent clients race
admission, claims, and saves through the same private handler used in production.
The standalone bundle is copied outside the checkout so it cannot resolve missing
packages from development dependencies. A real built worker is killed during
streaming; its replacement recovers the same deterministic run and produces one
result. The tests create their own temporary database and do not accept production
connection settings. To run them locally:

```sh
pnpm build
BOOTSTRAP_TEST_BUILT_WORKER=true pnpm exec vitest run tests/domain/agent-d1.test.ts
```

These tests delete only workspace rows in their own temporary D1 binding. The browser harness explicitly clears all live model settings,
enables the deterministic provider, and creates isolated local data. Existing editor,
navigation, table revision, and manual workspace regressions remain in final CI.
See [build status](build-status.md) and the implementation PR for exact results.

## Remaining limitations

This is a bounded first B2 path, not the full B2 specification. Granular row/column/
block grants, a general grant-management UI, packaged/pinned skill versions,
multi-turn chat, named instruction activation, task reassignment, and automatic
memory proposals are not implemented. Source selection covers whole resources and
must fit the configured input allowance. History lists the most recent 50
assignments for an agent; archival/retention and export of full execution receipts
are future work. Database backups include execution history; current-resource JSON
exports are still not a backup.

Live provider compatibility, useful model output quality, long-duration capacity,
container deployment, and production backup/restore need their own operational
validation. The supplied adapter contract was checked without making a live AI call.
