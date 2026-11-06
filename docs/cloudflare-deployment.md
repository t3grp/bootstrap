# Deploying Bootstrap to Cloudflare

This target packages the existing Next.js application and separate PostgreSQL
agent worker in one Cloudflare Container. PostgreSQL and private uploads remain
outside the container's ephemeral filesystem.

## Current status

The private `bootstrap-private-files` R2 bucket was created in APAC on 6 November
2026. The application is **not live yet**. A dedicated PostgreSQL connection and
a Bootstrap deployment token are still required. The intended initial origin is
`https://bootstrap.sherman-tansx.workers.dev`; this is a target, not a verified
live URL. The connected Cloudflare app cannot issue deployment API tokens because
its token-management permission is missing. An existing token for another app
was not reused.

## Deployment shape

| Component | Configuration |
| --- | --- |
| Endpoint | Worker forwards requests to one fixed owner container |
| Application | Standalone Node web process and separate Node agent worker |
| Capacity | `basic`, maximum one instance, ten-minute idle timeout |
| Database | Dedicated external PostgreSQL database/user |
| Uploads | Private R2 binding through a container outbound handler |
| Authentication | Existing owner setup token, sessions, closed signup and origin checks |
| AI | Disabled until explicitly configured; validation makes no live model calls |

The supervisor stops both processes if either exits unexpectedly. A later request
starts a new container, with interrupted assignments governed by the existing
PostgreSQL leases and recovery rules. The idle timeout exceeds the maximum
five-minute assignment deadline. Sleeping containers do not run scheduled routines.

Uploads use `files/<uuid>` keys, a 10 MB limit, and atomic create-only writes. The
R2 handler is registered only for container outbound traffic; public requests
cannot call it. Application authorization still checks workspace/file access.
Node receives no R2 API key. Local and Compose storage remain filesystem-backed.

This is one founder's instance; subscription-driven provisioning is not included.
Normal Container, R2, and database hosting charges apply.

## Prerequisites

Use Node.js 24, pnpm 11.25.0, a running Docker engine, and a Cloudflare account
with Containers enabled. Provision a dedicated PostgreSQL database/user with TLS
and the provider's certificate verification settings. Use a direct connection or
session-compatible pool: migrations hold a session advisory lock. Transaction-only
pooling is unsuitable for that connection. Startup needs migration permissions;
allow for two Node pools of up to ten connections each.

Create a deployment API token scoped to the intended Cloudflare account, with
access to deploy Workers/Durable Objects, push and deploy Container images, and
bind the private R2 bucket. See [Workers authorization](https://developers.cloudflare.com/workers/authorization/)
and [Containers deployment](https://developers.cloudflare.com/containers/guides/deploy/).

Load `DATABASE_URL` and `BOOTSTRAP_PUBLIC_URL` from your private configuration into
the shell environment, then generate the application secrets once:

```sh
pnpm cloudflare:secrets
```

This creates `.data/cloudflare-secrets.json` with mode `0600`, refuses to overwrite
an existing file, and does not print credentials. Store it in your secret manager
and reuse it on redeployment. The file contains:

| Key | Meaning |
| --- | --- |
| `DATABASE_URL` | Dedicated PostgreSQL connection string |
| `BETTER_AUTH_URL` | Exact public HTTPS origin |
| `BETTER_AUTH_SECRET` | Generated session secret |
| `BOOTSTRAP_SETUP_TOKEN` | Separate generated token for first-owner setup |

Read the owner setup token from that private file. Never commit it.

## Deploy

Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in your environment. From the
repository root on `deploy/cloudflare` (until the implementation is merged):

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm cloudflare:check
pnpm cloudflare:deploy --secrets-file "$PWD/.data/cloudflare-secrets.json"
```

`cloudflare:check` type-checks and runs the deployment dry run, including the Docker
image build. It publishes nothing. Configuration lives in
`apps/cloudflare/cloudflare.config.ts`. `BOOTSTRAP_WORKER_NAME` and
`BOOTSTRAP_R2_BUCKET` can select separate resources for another installation.

A manual **Deploy Bootstrap to Cloudflare** GitHub Actions workflow also exists.
Once that workflow is on the default branch, configure these repository settings
and run it with the intended implementation branch selected:

| Setting | Name | Value |
| --- | --- | --- |
| Actions variable | `CLOUDFLARE_ACCOUNT_ID` | Target Cloudflare account ID |
| Actions secret | `CLOUDFLARE_API_TOKEN` | Bootstrap deployment token |
| Actions secret | `BOOTSTRAP_RUNTIME_SECRETS` | Complete generated runtime JSON |

The hosted runner supplies Docker. Runtime secrets go into a private temporary
file and are removed after deployment. Pull requests never deploy automatically.
Until the workflow is on the default branch, use the CLI path above.

## Acceptance and operation

After deployment, verify `/api/health` returns HTTP 200 and `{"status":"ok"}`.
Claim the first owner, create a page, upload/download a file, and verify that
signup closes. Restart the container and confirm the same page and file remain.
These live checks are still outstanding.

Assignments show the provider-configuration state until a model is configured.
To enable the existing live adapter, set `BOOTSTRAP_MODEL_PROVIDER=openai-compatible`,
`BOOTSTRAP_MODEL_BASE_URL`, and `BOOTSTRAP_MODEL_ID` in the deployment environment;
add `BOOTSTRAP_MODEL_API_KEY` to the private runtime JSON. The default manual
workflow does not enable this. See [agent execution](agent-execution.md).

Back up PostgreSQL and R2 together, retaining the runtime secrets separately.
Workspace JSON exports omit original file bytes and do not replace backups.
Never delete the bucket, database, or Durable Object namespace to restart the app.
Redeploy a previously tested commit for application rollback, after checking its
compatibility with the current database schema. Code rollback does not reverse
migrations.

Implementation references: [container filesystem limits](https://developers.cloudflare.com/containers/platform/limits/),
[outbound bindings](https://developers.cloudflare.com/containers/configuration/workers-connections/),
and [typed Cloudflare configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/).
