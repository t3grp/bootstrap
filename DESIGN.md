# Bootstrap design baseline

Recorded from `main@868f636800d19a420a4721d898a32826bb0d8924` on 6 November 2026.
This is a source-grounded baseline and review guide, not a completed visual audit.

## Product direction

The founder's workspace is the main surface. Agents support the user's pages,
tables, files, and tasks. Keep manual work usable without an AI provider.

The authenticated workspace retains its AffectUI/BeUI reference and Notion-like
organization. Linear informs clarity, restraint, and the separate marketing page;
it does not require replacing the workspace's established visual language.

Make the next action clear through layout, hierarchy, and concise labels. Keep
explanation where it helps a person make a decision: errors, resource access,
costs, configuration requirements, destructive effects, and unknown outcomes.
Prefer an existing component over a second version of the same control.

## Source of truth

- [Workspace tokens and component CSS](apps/web/src/app/globals.css).
- [Root font and metadata](apps/web/src/app/layout.tsx).
- [Interaction specification](docs/ux-design.md).
- [Marketing specification](docs/landing-page-spec.md), owned by Muse Bot.
- [Ownership board](docs/coordination/README.md).

The existing stylesheet contains component-specific values as well as root tokens.
The inventory below does not assert that every component already follows one
complete spacing, typography, or radius scale. Record inconsistencies during the
owned feature's review; coordinate shared CSS changes with its single writer.

## Current workspace color tokens

| Token              | Value     | Role                    |
| ------------------ | --------- | ----------------------- |
| `--background`     | `#f7f7f5` | Outer canvas            |
| `--surface`        | `#ffffff` | Primary surfaces        |
| `--surface-soft`   | `#f8f8f6` | Quiet surfaces          |
| `--text`           | `#262625` | Primary text            |
| `--text-secondary` | `#595956` | Secondary text          |
| `--muted`          | `#6e6e68` | Supporting text         |
| `--faint`          | `#76766f` | Placeholder/subtle text |
| `--border`         | `#e7e7e3` | Default borders         |
| `--border-soft`    | `#efefeb` | Quiet separators        |
| `--accent`         | `#6c5fb5` | Accent                  |
| `--accent-soft`    | `#f0edf8` | Accent surface          |
| `--danger`         | `#ae4343` | Destructive/error text  |
| `--focus`          | `#7768c5` | Keyboard focus          |

The current workspace declares a light color scheme. Check actual foreground and
background pairs; the token inventory alone does not establish contrast compliance.
If a new theme is introduced, define its semantic tokens and verify it separately.

## Typography, dimensions, and behavior

| Area          | Existing implementation / review rule                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Font          | Locally bundled Inter Variable via `@fontsource-variable/inter`; system fallbacks; controls inherit the font           |
| Body          | 13px with 1.5 line height in the existing compact workspace                                                            |
| Buttons       | 13px, weight 500, 1.4 line height; reuse the established hierarchy                                                     |
| Radius        | Root `--radius: 9px`; `.button` currently uses 7px; component exceptions remain to be reviewed                         |
| Spacing       | Reuse the owned component's padding/gaps; there is no complete shared spacing-token scale yet                          |
| Page canvas   | 820px outer maximum with 30px horizontal padding, yielding about 760px of reading width; full-width pages are explicit |
| Focus         | Visible 2px focus outline with 3px offset                                                                              |
| Motion        | Existing button transitions are 120ms; the reduced-motion media query disables transitions/animations                  |
| Small layouts | Existing CSS adapts at 760px and 370px; acceptance also checks 320, 390, 768, 1280, and 1440 CSS pixels                |

Current coarse-pointer CSS gives icon buttons 34px dimensions and regular buttons
a 38px minimum height. These are review findings, not proof of sufficient touch
targets. Check the actual hit area and use a practical 44px target where appropriate
when that UI is next owned for implementation.

## Acceptance expectations

Preserve keyboard access, visible focus, dialog focus/return, enlarged-text
readability, reduced motion, and drafts through navigation and failures. Keep
horizontal scrolling within dense table/code containers. Review actual loading,
empty, error, conflict, denied, cancelled, and unknown-outcome states.

The six agent properties remain Instructions, Skills, Routines, Memories, Files,
and Tables. Keep selected context and actual execution state visible. Concept
fixtures must remain distinguishable from working integrations or live success.

Use the [release and performance procedures](docs/engineering-rules.md) for the
owned change. Record screenshots and behavior evidence for that exact build;
baseline documentation is not a substitute for either.
