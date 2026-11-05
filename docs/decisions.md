# Bootstrap decision register

Date: 6 November 2026. Status: proposed defaults for the first implementation. These entries make the design concrete without representing unmade owner decisions as final.

| Decision | Proposed default | Reason and consequence |
| --- | --- | --- |
| Initial customer | Solo founders and small knowledge businesses | Focuses on planning, customer communication, research, and operational work |
| Workspace model | One owner per workspace in v0.1; tenant-scoped schema | Simple first experience with room for separate businesses and later collaboration |
| Team model | Chief of Staff plus optional Growth/Research and Operations; custom agents | Useful responsibilities without requiring a large organization setup |
| Delegation | One level, three specialist assignments, shared limits | Prevents uncontrolled recursion and makes work inspectable |
| First connectors | Gmail, Calendar, Notion, GitHub | Covers the proposed reference workflows; certifies individual actions |
| First live vertical slice | Notion read and reviewed page creation | Exercises account binding, evidence, authorization, dispatch, and receipt handling |
| Runtime | TypeScript, Next.js, AI SDK, PostgreSQL, pg-boss, separate worker | One language and one core data service for portable self-hosting |
| UI language | AffectUI primary, BeUI selected supplements | Matches the requested component source while keeping a consistent product |
| Knowledge | Profile, selected documents, scoped connector sources; full-text first | Establishes provenance and access before adding retrieval complexity |
| External writes | Review unless narrowly pre-authorized | Founder controls actual effects without repeated approval of harmless steps |
| Arbitrary tools | Disabled in v0.1 | Typed, reviewed capabilities keep promises and recovery behavior understandable |
| Distribution | Useful self-hosted core, BYOK model and Composio setup, demo mode | Public contributors can run it without private organization infrastructure |
| Core license | Apache-2.0 for new Bootstrap code, retaining other notices | A permissive open-source proposal with explicit patent terms; owner adoption remains pending |
| Commercial path | Optional managed hosting later | Hosted convenience, backups, and operations can fund the project without removing core self-hosted workflows |

## Decisions to settle before their gate

**Before copying code into a public implementation:** select the project license and complete per-file provenance for the chosen UI subset. The documentation proposal can be reviewed independently of that adoption. The source inspection is not a blanket redistribution certification for the entire catalogue.

**Before live connector testing:** select the development Composio project, relevant managed/custom auth configurations, isolated accounts, and approved test actions. Discover actual tool slugs and input/output schemas instead of deriving them from friendly capability names.

**Before pilot launch:** confirm whether the first cohort is primarily SaaS founders or service businesses; choose the default model profile based on measured cost and task quality; validate the onboarding budget defaults and review policy with pilot users.

**Before hosted multi-user launch:** implement invitation/membership lifecycle, shared-account ownership and revocation, administrator boundaries, retention settings, and the relevant operational review. The one-owner release is not evidence that these are complete.

## Alternatives deliberately deferred

A visual workflow editor, agent marketplace, deep org chart, and arbitrary MCP/code tools can expand the product after the reference workflows demonstrate repeated use. They are not prerequisites to delivering a functioning agent team.

An enterprise workflow engine or separate queue/cache may become appropriate under higher throughput or complex long-lived workflows. The first release already requires durable checkpoints and action reconciliation; adopting a larger engine would not remove those external-effect requirements.

Bootstrap's open-source promise should cover agents, tasks, artifacts, permissions, schedules, and the integration adapter. A hosted edition can sell operation and convenience. The app should clearly disclose that model and connected-service providers have their own availability, policies, and potential charges.
