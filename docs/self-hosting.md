# Running Bootstrap

This guide covers the first workspace milestone. It does not configure agent
execution, Composio, managed provisioning, or billing.

## Local development

Install Node.js 22.16+ and pnpm 11.25.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm init:local
pnpm dev
```

Open `http://localhost:3000` and create the owner using the setup token printed by
the initializer. The token and a separate random session secret are saved in
`apps/web/.env.local`, which is ignored by git. `pnpm init:local` never overwrites
an existing file. Copy `.env.example` instead if you prefer manual configuration;
the placeholder secrets must be replaced before setup can succeed.

Use the exact configured origin. A `localhost` configuration and a browser opened
at `127.0.0.1` are different origins; write requests are rejected if they differ.

Local PGlite stores PostgreSQL data under `.bootstrap/postgres/`. Private uploads
live in `.bootstrap/files/`. Keep one application process per local data directory;
PGlite is not the production multi-process database. `BOOTSTRAP_DATA_DIR` can move
both to an absolute private path.

## Production configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string; required in production |
| `BETTER_AUTH_URL` | Exact externally visible HTTPS origin |
| `BETTER_AUTH_SECRET` | Random secret, at least 32 characters; keep stable across restarts |
| `BOOTSTRAP_SETUP_TOKEN` | Separate random secret protecting first-owner setup |
| `BOOTSTRAP_DATA_DIR` | Private writable storage, outside public/static assets |
| `BOOTSTRAP_MIGRATIONS_DIR` | Optional override if migrations are packaged elsewhere |

Generate each secret separately, for example:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a dedicated database/user. Migrations run during database initialization under
a PostgreSQL advisory lock. The application must have migration permissions at
startup in this milestone. Configure PostgreSQL TLS according to your database
provider; the application does not disable certificate verification.

The first owner is claimed atomically. Public signup remains disabled afterward.
This version has one human owner with multiple workspaces; invitations, email
verification delivery, and an email-based password-recovery flow are not present.

## Containers

`Dockerfile` builds a standalone Node application. `compose.yaml` supplies a
PostgreSQL service and separate persistent volumes for the database and uploads.
Create a private root `.env` containing actual values:

```dotenv
POSTGRES_PASSWORD=generated-hex-password
BETTER_AUTH_SECRET=generated-session-secret
BOOTSTRAP_SETUP_TOKEN=generated-setup-token
BETTER_AUTH_URL=http://localhost:3000
```

The names above illustrate required fields; use independently generated random
values, not these strings. Hexadecimal values keep the example database URL safe
from reserved URL characters.

```sh
docker compose up --build -d
```

The default port binds only `127.0.0.1:3000`. For a remote installation, place an
HTTPS reverse proxy in front of it and set `BETTER_AUTH_URL` to that HTTPS origin.
Uploads are served only through authenticated API requests as attachments. Never
publish the data volume through a static file server.

`GET /api/health` verifies database availability and returns a minimal status.
The Docker image runs as the `node` user. Build tracing excludes local data, test
output, and environment files. Runtime configuration is injected separately.

The container recipe is provided for the next deployment validation. A Docker
daemon and a separate PostgreSQL server were not available in the initial build
environment; the production standalone Node bundle and PGlite adapter are tested
separately. Consult current CI/build evidence before treating a deployment as ready.

## Data preservation

Back up PostgreSQL and the private file volume together, using a coordinated
snapshot or a paused writer. Restoring only one can leave missing file bytes or
orphaned blobs. Keep the authentication secret in your secret manager. Test a
restore into a separate instance before relying on a backup procedure.

Native JSON exports contain current pages, table rows, tasks, projects, agent
configuration, and file metadata. They exclude file bytes, historical page
versions, accounts, and sessions. They are not database backups. Import/restore
from this interchange format is a later workspace feature.

## Initial bounds

- 10 MB per uploaded file.
- 2 MB, 2,000 nodes, and 16 nesting levels per page document.
- 50 properties and 500 rows per table, with a 4 MB serialized table limit.
- 500 resources of each kind per workspace and 25 workspaces per instance.

These are validation bounds, not a benchmarked production capacity promise.
Workspace snapshots currently load current page bodies and table records together;
paginated/lazy resource loading must precede large deployments. Saved named table
views, per-field grants, multi-human editing, and object-storage adapters are not
implemented yet.

## Test environment

`pnpm test` uses isolated PGlite databases, including a disk close/reopen test.
`pnpm build` does not require credentials. `pnpm test:e2e` launches the standalone
bundle with an isolated temporary database, generated auth secret, and local-only
test setup token. Production-mode PGlite requires an explicit
`BOOTSTRAP_ALLOW_LOCAL_DATABASE=true`; the test harness sets this, normal hosting
should not.

If a supported local Chromium is already installed, the browser-test configuration
accepts `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. CI installs the Playwright browser.
Do not weaken a host's sandbox or network policy to make browser tests run.
