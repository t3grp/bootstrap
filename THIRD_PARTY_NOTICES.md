# Third-party notices and UI provenance

New Bootstrap code in this implementation is proposed for release under the
Apache License 2.0 included in `LICENSE`. Dependencies retain their own licenses;
this file does not replace the notices shipped in their packages.

## Workspace interface

The workspace shell and styles are independently authored for Bootstrap, informed
by the AffectUI shell inspected in the user's t3UI catalogue:

- Repository: https://github.com/t3grp/t3UI
- Inspected revision: `66ff17008ebf30e73e7662234e3f14660f8a5c14`
- Reference: `components/collections/libraries/affectui/recreated/app-shell-frame.css`
- Reference: `components/collections/libraries/affectui/recreated/app-shell-frame.tsx`
- Adopted design concepts: compact sidebar navigation, inset neutral surfaces,
  contextual panels, restrained borders, and keyboard-accessible controls.

The public build has no dependency on that private repository. Catalogue demo
state, fictitious connection states, media, and Openbot code are not included.
The table editor and document model are owned by Bootstrap; the editor is built
on the MIT-licensed Tiptap packages listed in the lockfile. The table row-selection
hook in `apps/web/src/components/tables/use-row-selection.ts` adapts BeUI's
MIT-licensed hook, inspected through t3UI at the revision above. The file retains
the full MIT notice for Copyright (c) 2026 Saurabh Chauhan. The pinned BeUI upstream
reference is https://github.com/starc007/ui-components/tree/fa3279fd8ae52b78b7bef089dab5a703003a5ed9.

## Distributed assets and libraries

| Package or asset | License | Source |
| --- | --- | --- |
| Tiptap community editor packages | MIT | https://github.com/ueberdosis/tiptap |
| Lucide icons | ISC (Lucide), MIT (Feather-derived icons) | https://github.com/lucide-icons/lucide |
| Inter variable font | SIL Open Font License 1.1 | https://github.com/rsms/inter |
| React | MIT | https://github.com/facebook/react |
| Next.js | MIT | https://github.com/vercel/next.js |
| Better Auth | MIT | https://github.com/better-auth/better-auth |
| Drizzle ORM | Apache-2.0 | https://github.com/drizzle-team/drizzle-orm |
| PGlite | Apache-2.0; bundled PostgreSQL retains its license | https://github.com/electric-sql/pglite |

The exact direct and transitive versions are recorded in `pnpm-lock.yaml`.
Locally distributed font and icon notices are retained in `licenses/`.

## Architectural references

Openbot informed the planned agent identity and messaging model only. Its
noncommercial source is not copied into this commercial-capable application.
Agent execution has not been implemented in this milestone.
