# Named table views — C01 contract v1

C01 supplies the persisted model, scoped API, typed client and shared presentation
semantics for M01. **The view picker and settings controls are Muse Bot's work.**
The existing manual table/editor interface is unchanged by this backend slice.
The [coordination record](coordination/chatgpt.md) identifies the contract commit;
the implementation PR records exact final CI and merge evidence.

## What is persisted

`table_views` holds a workspace ID, stable view ID, canonical table ID, name,
settings, referenced-column type bindings, optimistic revision, the table revision
against which settings were validated, and timestamps. It never copies table rows.
The composite foreign key prevents a view from targeting another workspace's
table. Deleting a view deletes only its settings. Deleting its workspace/canonical
table cascades to its views.

The server captures types for explicitly referenced columns. If a column is
removed, changes type, or loses a select option used by a filter, reads retain the
saved settings and return `status: "needs_attention"` with structured `issues`.
Renaming that view does not silently repair it. Saving complete, valid replacement
settings against the current table revision explicitly revalidates it.

Canonical row edits and compatible schema changes do not invalidate a view.
`validatedTableRevision` records the last settings validation, not a frozen copy
of the table. Every read returns current canonical rows. A view is presentation;
it grants no access and does not narrow or expand an agent's resource selection.

## API and typed client

All operations require the existing owner session and owner membership in the
requested workspace. Resource lookups include that workspace. Missing or
inaccessible resources return the same `404 NOT_FOUND`. Writes also require the
application Origin and JSON content type. Responses use `Cache-Control: no-store,
private`. No new environment variable or AI provider is needed.

Types/helpers are exported by `@bootstrap/core`; browser functions are in
`apps/web/src/lib/api.ts`.

| Operation | HTTP | Typed client | Response |
| --- | --- | --- | --- |
| List a table's views | `GET /api/table-views?workspaceId=W&tableId=T` | `getTableViews(W, T)` | `TableViewCollection`: `{ table, views }` |
| Read one view | `GET /api/table-views/V?workspaceId=W` | `getTableView(W, V)` | `TableViewDetail`: `{ table, view }` |
| Create | `POST /api/table-views?workspaceId=W` | `createTableView(W, input)` | `201 TableViewDetail` |
| Rename/change settings | `PATCH /api/table-views/V?workspaceId=W` | `updateTableView(W, V, input)` | `200 TableViewDetail` |
| Delete settings | `DELETE /api/table-views/V?workspaceId=W` | `deleteTableView(W, V, { revision })` | `200 { id, deleted: true }` |

`table` is the existing `WorkspaceTable` shape. The list is ordered by creation
time then ID, and includes zero or more `NamedTableView` objects. Reads run in a
guarded atomic snapshot so the returned table and view validation agree.

Create body:

```json
{
  "id": "client-generated-stable-id",
  "tableId": "canonical-table-id",
  "tableRevision": 3,
  "name": "Qualified leads",
  "settings": {
    "layout": "table",
    "density": "comfortable",
    "wrapCells": false,
    "visibleColumnIds": ["name", "amount"],
    "sorts": [{ "columnId": "amount", "direction": "desc" }],
    "filters": [{ "columnId": "amount", "operator": "gt", "value": 0 }]
  }
}
```

Update body:

```json
{
  "revision": 1,
  "tableRevision": 3,
  "patch": { "name": "Priority leads" }
}
```

`patch` accepts a name, complete settings, or both. Unknown keys and empty patches
are rejected. `tableId`, workspace, creation time and bindings cannot be patched.
Successful changes increment the **view** revision. The table revision is never
changed by a view operation. Names are trimmed; duplicate names are allowed, so
use IDs for selection and identity.

### Conflict and retry handling

`revision` is the latest acknowledged view revision. `tableRevision` is the latest
canonical table revision, required for creates and updates, including renames.
Use both from the returned detail/list, after confirming outstanding table edits.
Keep draft settings separate from acknowledged settings and never replace a newer
acknowledged revision with an older render or response.

| Error | Meaning and UI action |
| --- | --- |
| `401 UNAUTHENTICATED` | Request sign-in; retain the local draft |
| `403 ORIGIN_MISMATCH` | Request did not originate from this app |
| `404 NOT_FOUND` | View/table/workspace unavailable; show a neutral unavailable state |
| `400 VALIDATION_ERROR` | Malformed shape, identifier or field size; fix the draft |
| `400 INVALID_VIEW_SETTINGS` | Missing/incompatible columns, duplicate columns/sorts or invalid typed filter; fix settings |
| `400 VIEW_LIMIT_REACHED` | This table already has 50 views |
| `409 REVISION_CONFLICT` | View changed; `currentRevision` identifies its current revision; retain draft and load latest before user-reviewed retry |
| `409 TABLE_REVISION_CONFLICT` | Table changed; `currentRevision` is the **table** revision; reload table and review settings |
| `409 VIEW_ID_EXISTS` | Creation ID already exists; read that ID to reconcile, never silently overwrite it |
| `413 PAYLOAD_TOO_LARGE` / `415 UNSUPPORTED_MEDIA_TYPE` | Reduce body or use JSON |
| `500 INTERNAL_ERROR` | Outcome may be uncertain; keep draft and read latest saved state before retrying |

Generate the creation ID once (for example, `crypto.randomUUID()`). Reuse it until
the outcome is confirmed. A retry with that same ID cannot create a second view.
A `409 VIEW_ID_EXISTS` is not an automatic claim that the earlier payload won:
GET the ID and compare the saved state. Updates/deletes also reconcile by reading
after an uncertain response; never blindly substitute a newer revision. A delete
retry may return 404 after the original delete committed.

All decisions and writes use the existing D1 guarded-batch adapter. Insert,
update and delete revision triggers cover the new table. Concurrent writes retry
only a confirmed database revision conflict, then recheck owner membership, both
revisions, settings and capacity. An uncertain transport result is not replayed.

## Settings semantics and bounds

`defaultTableViewSettings()` returns fresh defaults. `layout` currently accepts
only `table`; density is `comfortable` or `compact`, and `wrapCells` is boolean.
These are persisted display preferences; applying their visual styles is M01.

`visibleColumnIds: null` follows all current columns and includes newly added
columns. An explicit list contains at least one distinct current column ID and
sets display order. Hidden columns remain in canonical rows: this is **not data
redaction**. Use the returned `columns` when rendering.

Filters use AND. The following combinations are accepted:

| Column type | Operators with a value | Value |
| --- | --- | --- |
| Text, URL | `eq`, `neq`, `contains`, `not_contains` | String |
| Number | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` | Finite JSON number |
| Date | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` | Real calendar date, `YYYY-MM-DD` |
| Checkbox | `eq`, `neq` | Boolean |
| Select | `eq`, `neq` | One current option, matched exactly |
| File reference | None | Use emptiness checks only |

Every type supports `is_empty` and `is_not_empty`, without a `value` property.
Empty means an absent cell, `null`, or `""`; `0` and `false` are present values.
Other comparisons exclude empty cells, including `neq` and `not_contains`.
Equality is exact and case-sensitive. Contains operations use case-insensitive
substring matching. These are literal comparisons, never SQL or regular expressions.

Sorts are applied in declared priority order, without duplicate columns. File
references cannot be sorted. Numbers/booleans use typed ordering; dates use their
canonical ISO string order; other strings use deterministic code-unit ordering,
not the machine's locale. Empty cells are last in both directions. Ties retain
canonical row order.

`resolveTableView(table, view)` returns either `{ status: "ready", columns, rows }`
or `{ status: "needs_attention", issues }`. It returns **no rows** for invalidated
settings. It creates an ordered row array without mutating canonical rows; the row
objects/cells still refer to canonical data. Never use that projection as a complete
table-save payload: apply edits by stable row/column ID to the full canonical table.

| Bound | Value |
| --- | --- |
| Views per canonical table | 50 |
| View name | 1–100 characters after trimming |
| Visible columns | 1–50 unique IDs, or `null` |
| Sort priorities | 0–3 |
| AND filters | 0–20 |
| String filter value | Up to 1,000 characters |
| Create/update request | 32,768 bytes of UTF-8 JSON |
| Delete request | 1,024 bytes |

Existing table limits still apply (50 columns, 500 rows, 1 MB encoded table data).
This contract has no pagination, grouping, OR expressions, formulas or row-level
permissions.

## M01 integration and deterministic state fixtures

Use the typed client and shared resolver in both inline and full-page presentation.
The canonical table-save and navigation guards remain the source of truth for row
edits. Avoid editing `table-utils.ts`, editor synchronization or acknowledged
revision protections as part of initial view controls.

Selection is separate from saved view settings. The planned full-page integration
target is `/w/W/tables/T?view=V`; absence means the existing unsaved default view.
There is no global last-selected-view database field. **The current route does not
yet consume that query parameter.** M01 must request that shared routing change
through ChatGPT, retain it on navigation/reload and validate that V belongs to T.
Inline selection will need an optional `viewId` on the existing table block and
the corresponding validator/export changes, also through the integration writer.
This PR does not add that block attribute or claim inline selection persists yet.

The following fixture uses the real shared types. It is test/demo data, not a
live service response; `phase` below is a proposed local UI fixture envelope.

```ts
import {
  defaultTableViewSettings,
  type NamedTableView,
  type WorkspaceTable,
} from "@bootstrap/core";

const table: WorkspaceTable = {
  id: "leads", name: "Leads", description: "", revision: 3,
  columns: [
    { id: "name", name: "Name", type: "text" },
    { id: "amount", name: "Amount", type: "number" },
  ],
  rows: [
    { id: "alpha", cells: { name: "Alpha", amount: 10 } },
    { id: "beta", cells: { name: "Beta", amount: 0 } },
  ],
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:00:00.000Z",
};
const view: NamedTableView = {
  id: "qualified", workspaceId: "studio", tableId: "leads",
  name: "Qualified leads", revision: 1, validatedTableRevision: 3,
  settings: {
    ...defaultTableViewSettings(),
    filters: [{ columnId: "amount", operator: "gt", value: 0 }],
  },
  columnBindings: [{ columnId: "amount", type: "number" }],
  createdAt: table.createdAt, updatedAt: table.updatedAt,
  status: "ready", issues: [],
};
const draft = { ...view.settings, wrapCells: true };
const fixtures = {
  loading: { phase: "loading" },
  empty: { phase: "ready", data: { table, views: [] } },
  ready: { phase: "ready", data: { table, views: [view] } },
  denied: {
    phase: "error", status: 404,
    body: { code: "NOT_FOUND", error: "This item is not available in this workspace." },
  },
  staleRevision: {
    phase: "error", status: 409, draft,
    body: { code: "REVISION_CONFLICT", currentRevision: 2, error: "This item changed in another session. Keep your draft and load the latest version before saving again." },
  },
  failure: {
    phase: "error", status: 500, draft,
    body: { code: "INTERNAL_ERROR", error: "The request could not be confirmed. Keep your draft and reload to check the latest saved state before retrying." },
  },
};
```

Ready resolves to row `alpha`. To exercise the valid-empty-results state, set its
numeric filter to `gt 100`. To exercise schema attention, change `amount` to text
with corresponding string cell values while retaining the saved view binding;
the resolver returns `changed_column_type` and no rows. Keep the same draft through
loading/retry/conflict renders. The new domain/API tests contain runnable fixtures
for these semantics, independent views, database restart and concurrent clients.

## Local startup, migrations and verification

Use Node 24+ and the pinned pnpm version from the root manifest:

```sh
pnpm install --frozen-lockfile
pnpm init:local
pnpm dev
```

Open `http://localhost:3000` and use the initializer's private setup token to create
the owner, or sign in to the existing local workspace. Initialization preserves
an existing `.env.local`. Local SQLite applies `0002_table_views.sql` on open.
The current UI continues to offer ordinary table editing; M01 adds view controls.
For API integration, call the typed client from an authenticated application UI
with the current workspace/table IDs and revisions. Do not expose session cookies
or provider credentials in fixtures.

Cloudflare D1 requires the new migration before serving the new endpoints. The
existing manual deployment workflow already applies every ordered migration before
deploying. **Merging this slice does not run that deployment workflow.** D01 retains
deployment ownership; do not run production migration/deployment for C01 acceptance.
The test D1 helper now applies the same ordered SQL files.

Focused commands:

```sh
pnpm exec vitest run tests/domain/table-views.test.ts tests/domain/table-views-d1.test.ts
pnpm build
pnpm exec playwright test tests/e2e/table-views.spec.ts --retries=0
```

The two new Playwright scenarios use HTTP request contexts, a production standalone
build and a disposable real D1 binding. They do not require launching a browser.
Final CI also runs frozen install, application/Cloudflare type checks, the deployment
dry run, production build, the complete domain suite and all existing browser
scenarios. Agent verification uses only the deterministic provider; C01 itself has
no model calls.

## Remaining work

- M01 picker/dialogs, display preferences, URL and inline-block selection, and
  keyboard/mobile interaction acceptance remain separate work owned by Muse Bot.
- Named-view settings are not yet included in the existing native workspace JSON
  export or CSV. Database persistence/backup retains them; portability is a later
  integration gate. CSV continues to export canonical table data.
- No global selection preference, grouped views, pagination, per-row grants, live
  integrations, agent delegation, schedules or commercial hosting work is included.
- This is a backend contribution to AC45, not a claim that the full named-view
  user interface or the broader B1 module is complete.
