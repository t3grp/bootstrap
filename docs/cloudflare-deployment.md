# Deploying Bootstrap to Cloudflare

Bootstrap runs its existing Next.js web app and bounded agent worker in a
Cloudflare Container. **D1 stores application records; R2 stores private files.**
No external PostgreSQL service or database connection string is required.

## Deployment shape

| Component      | Configuration                                                                       |
| -------------- | ----------------------------------------------------------------------------------- |
| Endpoint       | Worker forwards to one fixed owner container                                        |
| Application    | Standalone Node 24 web process and separate agent worker                            |
| Capacity       | `basic`, maximum one instance, ten-minute idle timeout                              |
| Database       | Private D1 binding, accessed from the container through a Worker outbound handler   |
| Uploads        | Private R2 binding with authenticated downloads and create-only writes              |
| Authentication | Owner setup token, closed signup, sessions and origin checks                        |
| AI             | Unconfigured by default; tests use deterministic output without paid model requests |

The supervisor stops both processes if either exits unexpectedly. A later request
starts a new container. D1 run leases, checkpoints, and recovery rules survive the
restart. No application data relies on the container filesystem. Sleeping
containers do not run scheduled routines. Managed subscriber provisioning is a
later milestone; this deployment is one owner's instance.

The `bootstrap-db.internal` and `bootstrap-files.internal` handlers exist only
for container outbound traffic. They are never registered as public routes.
Node receives no Cloudflare account credential. File requests still pass the
application's workspace authorization checks. R2 uploads are limited to 10 MB,
use `files/<uuid>` keys, and cannot overwrite existing objects.

## D1 atomicity

D1 provides atomic batches rather than PostgreSQL's interactive transactions.
Bootstrap reads the data needed for a mutation and prepares a write batch. A
revision trigger on every application table invalidates stale reads. The first
statement in the batch checks that revision; a failed CHECK aborts the whole
batch before application writes. The plan is then rebuilt from fresh data.

Only a confirmed revision conflict is retried. An ambiguous network failure after
a possible commit is not replayed automatically. Assignment operation keys,
worker epochs, unique result links, and the existing uncertain-provider outcome
handling remain in place. Read-only transcript snapshots also verify the revision.

The counter is per owner database, so unrelated writes can make a plan retry.
This conservative choice fits the current single-owner instance. Atomic plans
must complete reads before enqueuing writes and must contain no external side
effects. New application tables must include all three revision triggers.

## Prerequisites

Use Node.js 24, pnpm 11.25.0, Docker, and a Cloudflare account with Containers.
Create a dedicated D1 database and private R2 bucket. Use a Bootstrap API token
with the permissions needed for Workers/Durable Objects, Container deployment and
image upload, D1 migrations/bindings, and R2 bindings. See
[Workers authorization](https://developers.cloudflare.com/workers/authorization/)
and [Containers deployment](https://developers.cloudflare.com/containers/guides/deploy/).

Set `BOOTSTRAP_PUBLIC_URL` to the deployment's HTTPS origin, then run:

```sh
pnpm cloudflare:secrets
```

The initializer creates `.data/cloudflare-secrets.json` with mode `0600`, refuses
to overwrite it, and does not print credentials. Keep it in your secret manager
and reuse it on redeployment. It contains `BETTER_AUTH_URL`, a generated
`BETTER_AUTH_SECRET`, and a separate generated `BOOTSTRAP_SETUP_TOKEN`.
The owner uses that setup token once to create their account. Never commit it.

## GitHub deployment

The manual **Deploy Bootstrap to Cloudflare** workflow uses these repository settings:

| Setting          | Name                        | Value                      |
| ---------------- | --------------------------- | -------------------------- |
| Actions variable | `CLOUDFLARE_ACCOUNT_ID`     | Target account ID          |
| Actions variable | `BOOTSTRAP_D1_DATABASE_ID`  | Dedicated D1 database UUID |
| Actions secret   | `CLOUDFLARE_API_TOKEN`      | Bootstrap deployment token |
| Actions secret   | `BOOTSTRAP_RUNTIME_SECRETS` | Generated runtime JSON     |

The workflow checks the build, applies pending D1 migrations, and deploys the
container and Worker. The hosted runner supplies Docker. Runtime secrets are
written to a private temporary file, then removed. Pull requests do not deploy.
The workflow must exist on the default branch before manual dispatch is available.

## CLI deployment

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and
`BOOTSTRAP_D1_DATABASE_ID` in your shell, then from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm cloudflare:check
pnpm exec cf d1 migrations apply "$BOOTSTRAP_D1_DATABASE_ID" --dir packages/db/migrations
pnpm cloudflare:deploy --secrets-file "$PWD/.data/cloudflare-secrets.json"
```

The check includes a deployment dry run and Docker build; it publishes nothing.
Configuration is in `apps/cloudflare/cloudflare.config.ts`. Set
`BOOTSTRAP_WORKER_NAME`, `BOOTSTRAP_D1_DATABASE`, and `BOOTSTRAP_R2_BUCKET` for
another installation. Database IDs and names are resource identifiers, not secrets.

## Acceptance and operations

Verify `/api/health` returns HTTP 200 and `{"status":"ok"}`. It checks that the
D1 revision table is available. Claim the owner, create a page, and upload/download
a file. Confirm closed signup and persistence after a container restart.

Assignments show a provider-configuration state until a model is configured.
The default workflow does not enable live AI. See [agent execution](agent-execution.md)
for optional provider settings and execution bounds.

Back up D1 and R2 together, retaining application secrets separately. D1 Time
Travel does not restore R2 objects. Workspace exports omit original file bytes,
accounts, and history. Do not delete a bucket, database, or Durable Object namespace
to restart the application. Code rollback does not reverse schema migrations.

The earlier PostgreSQL migrations are retained under `packages/db/legacy-postgres`
for reference. They are not applied to D1. No production PostgreSQL data was
migrated; existing PostgreSQL/PGlite installations require an explicit export and
conversion before upgrading. Bootstrap does not silently open them as empty SQLite.

Sources: [D1 batches](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/),
[private outbound bindings](https://developers.cloudflare.com/containers/configuration/workers-connections/),
[typed configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/).
