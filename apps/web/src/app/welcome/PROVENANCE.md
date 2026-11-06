# Provenance — /welcome landing page

## Fonts

- Inter Variable, via `@fontsource-variable/inter` (SIL OFL 1.1), already
  loaded by the app root layout. The standalone build used static Inter
  weights from `@fontsource/inter`; this integration uses the variable
  font the workspace app already ships, so no new font dependency was
  added. The marketing `--font-sans` token lists `"Inter Variable"` first.

## Icons and components

- No icon library is used by the landing page.
- `components/ui/Tabs.tsx` and `components/ui/Dialog.tsx` are original
  Bootstrap implementations. The Tabs interaction contract follows the
  WAI-ARIA tabs pattern as implemented by the BeUI tabs reference (t3UI,
  pinned commit `66ff17008ebf30e73e7662234e3f14660f8a5c14`). No BeUI
  source code is copied: the reference uses motion/react springs and
  lucide-react icons; this implementation uses plain CSS transitions and
  no icon dependency, so the public build does not require private t3UI
  access. See the header comment in `components/ui/Tabs.tsx`.
- All other marketing styling and copy are original Bootstrap work for
  this page (landing-page-spec §§5–7). No Linear/Notion screenshot, copy,
  logo, or customer list is shipped.

## Social preview (known gap)

- The standalone build generated a 1200×630 social preview at build time
  from `app/opengraph-image.tsx`, decompressing Inter woff2 files with
  `wawoff2` (Satori cannot read woff2). That route is **not** included
  here: `wawoff2` is not in the workspace lockfile, and manifests /
  lockfile belong to the integration writer. Until the integration writer
  adds the dependency, the route metadata carries no og:image (LP16 gap,
  stated in the PR body). No binary image is committed.
