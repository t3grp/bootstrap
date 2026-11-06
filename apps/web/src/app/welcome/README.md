# /welcome — public landing page (M0, concept mode)

Isolated marketing route for Bootstrap. It does not change the workspace app
at `/`: the workspace keeps its root layout, `globals.css` and gateway, and
this route adds only its own files under `apps/web/src/app/welcome/`.

## Files

- `layout.tsx` — route metadata (noindex, no canonical URL yet) and the
  Header / main / Footer shell. Imports `landing.module.css` for side
  effects; nothing else.
- `page.tsx` — the landing sections in landing-page-spec §4 order.
- `landing.module.css` — the marketing stylesheet, transformed from the
  standalone build: every selector is scoped under `.lp` (`:global`),
  so the dark marketing tokens never leak into the light workspace. The
  font token is `"Inter Variable"`, already loaded by the app root layout.
- `components/` — Header, Hero, Sections (incl. Footer), AgentTeam,
  WorkspacePreview, Faq, `ui/Tabs`, `ui/Dialog`. Original Bootstrap
  implementations; see PROVENANCE.md.
- `lib/` — page copy (`content.ts`), demo fixtures (`fixtures.ts`) and
  the destination map (`links.ts`). Fixtures are local preview state
  only; no workspace state is read or written.
- `scripts/verify.mjs` — LP09–LP18 evidence harness (see below).
- `evidence/verify-results.json` — latest harness results (text only;
  screenshots are taken locally during verification and are not committed).

## Verify

From the repo root, after `pnpm install`:

```sh
pnpm --filter @bootstrap/web build
node apps/web/src/app/welcome/scripts/verify.mjs
```

The harness starts the production standalone server on a fresh port,
checks overflow at 1440/1280/768/390/320 px, tabs/FAQ/dialog/row-select/
anchored nav/mobile menu, external links, and the absence of
signup/login/waitlist/checkout copy, and writes screenshots plus
`evidence/verify-results.json` under this folder.

## Limitations

- The social-preview image (`opengraph-image`) from the standalone build
  is **not** included: generating it needs the `wawoff2` dependency and
  the `@fontsource/inter` files, and manifests/lockfile belong to the
  integration writer. The route metadata has no og:image until that is
  added; this is the known LP16 gap.
- The page lives at `/welcome`, not `/`. Moving it to the root route is
  an integration-writer decision (root route and global styles are
  reserved); the workspace gateway currently owns `/`.
- Doc links in `lib/links.ts` point at `main`; they must be re-checked
  before any public launch.
