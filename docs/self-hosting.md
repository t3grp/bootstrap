# Running Bootstrap

Bootstrap's hosted target uses Cloudflare D1 and private R2. See
[Cloudflare deployment](cloudflare-deployment.md) for that setup. Local development
and self-hosted Docker use SQLite with the same schema and atomic write rules.
Composio, subscriptions, recurring work, and managed provisioning are later milestones.

## Local development

Use Node.js 24 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm init:local
pnpm dev
```

Open `http://localhost:3000` and create the owner with the setup token printed by
the initializer. The token and separate session secret are saved in the ignored
`apps/web/.env.local`. Initialization never overwrites an existing file. Use the
exact configured origin; `localhost` and `127.0.0.1` are different origins.

SQLite persists in `.bootstrap/workspace.sqlite`; uploads live in
`.bootstrap/files/`. `BOOTSTRAP_DATA_DIR` moves both to an absolute private path.
The local agent worker runs inside the web process by default. An external worker
can share the same SQLite directory on the same host; do not place SQLite on a
network filesystem. Model credentials are optional for manual workspace use.

## Production configuration

| Variable                         | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `BETTER_AUTH_URL`                | Exact externally visible HTTPS origin                   |
| `BETTER_AUTH_SECRET`             | Stable random session secret, at least 32 characters    |
| `BOOTSTRAP_SETUP_TOKEN`          | Separate random first-owner setup token                 |
| `BOOTSTRAP_DATA_DIR`             | Private persistent storage outside public/static assets |
| `BOOTSTRAP_ALLOW_LOCAL_DATABASE` | Set `true` only with a durable SQLite volume            |
| `BOOTSTRAP_AGENT_WORKER`         | `external` for a separate worker; otherwise `embedded`  |
| `BOOTSTRAP_MIGRATIONS_DIR`       | Optional packaged migration directory override          |

Generate independent secrets, for example with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
SQLite migrations run under a short exclusive database transaction at startup.
Cloudflare D1 migrations run separately at deployment, never on container startup.

The first owner is claimed atomically and public signup stays disabled. This
version supports one owner with multiple workspaces. Invitations, delivery of
email verification, and email password recovery are not implemented.

## Docker Compose

`compose.yaml` runs separate web and agent-worker services with one shared local
volume for SQLite and private files. Put real values in a private root `.env`:

```dotenv
BETTER_AUTH_SECRET=generated-session-secret
BOOTSTRAP_SETUP_TOKEN=generated-separate-setup-token
BETTER_AUTH_URL=http://localhost:3000
```

Replace the illustrative values, then run `docker compose up --build -d`.
The port binds to `127.0.0.1:3000`. Put an HTTPS reverse proxy in front of remote
installations and configure its exact origin. The image runs as the `node` user.
`GET /api/health` checks the database schema without exposing records or credentials.
Never serve the data volume as static files.

## Data preservation

Back up the SQLite database using SQLite's backup API, or stop both writers before
copying the complete data volume, including its WAL. Copy private uploads with the
same snapshot. Preserve authentication secrets separately and test restoration to
an isolated instance. Cloudflare deployments instead back up D1 and R2 together.

Workspace JSON exports include current pages, tables, tasks, projects, agent
configuration, and file metadata. They omit file bytes, historical versions,
accounts, and sessions. They do not replace database backups.

Earlier PostgreSQL/PGlite installations need an explicit data export and schema
conversion before upgrading. PostgreSQL migration files remain archived in
`packages/db/legacy-postgres`. No automatic destructive migration is performed.

## Initial bounds

- 10 MB per upload, stored outside SQL.
- 1 MB of page content, 2,000 nodes, and 16 nesting levels.
- 50 properties and 500 rows per table, within 1 MB of serialized columns/rows.
- 1 MB per agent configuration, including instructions and all saved notes.
- 4 MB of existing page content in a single subtree operation.
- 500 resources of each kind per workspace and 25 workspaces per instance.

Structured records leave headroom under D1's 2,000,000-byte row limit. These are
validation bounds, not benchmarked capacity promises. Workspace snapshots still
load current page bodies and table records together; pagination is needed before
large deployments. Named table views, per-field grants, and multi-human editing
are not included.

## Verification

`pnpm test` uses isolated SQLite databases and actual local workerd D1/R2 bindings.
D1 tests exercise competing clients, atomic rollback, a lost response after commit,
and killing/restarting a separate worker. `pnpm build` needs no credentials.
`pnpm test:e2e` launches the production standalone bundle with a fresh D1 binding,
private test transport, generated auth secret, and deterministic model fixture.
No inherited production database or paid model is used.

CI installs Chromium. A local installation can use
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. See [agent execution](agent-execution.md)
for provider settings, recovery, and the manual acceptance flow.
