# Bootstrap landing-page specification

Version: 0.3 draft. Date: 6 November 2026. Implementation owner: Muse, when assigned by the product owner. Status: specification only.

## 1. Assignment and outcome

Create Bootstrap's public landing page. It should communicate a flexible business workspace supported by configurable agents, using a restrained, product-led visual direction inspired by Linear. Product previews should show the newly specified Notion-like workspace: nested pages, blocks, inline tables, and contextual agent help.

The visitor should understand three things within the first screen: this is their business workspace; agents support work inside it; the product is in development. The page should help founders explore the intended experience and follow the public build.

This handoff covers the marketing route, original product-preview fixtures, responsive behavior, copy, interactions, and review evidence. Application editor/runtime, authentication, real integrations, checkout, provisioning, and live model calls remain separate implementation work. The owner will hand this brief to Muse; no message to Muse or public deployment is performed by the specification change.

Read [product specification](product-spec.md), [interface specification](ux-design.md), and [hosted service](hosted-service.md) when resolving product behavior. The compact assignment is in [Muse handoff](muse-handoff.md).

## 2. Reference interpretation

[Linear](https://linear.app/) was inspected in the live browser and through its official public page on 6 November. Adopt its restrained hierarchy: dark surfaces, compact navigation, a large left-aligned headline, generous space, fine borders, controlled motion, and detailed product compositions. Bootstrap uses its own copy, assets, tokens, logo treatment, and section sequence.

Notion supplies the product interaction reference. Its [writing controls](https://www.notion.com/help/writing-and-editing-basics), [nested pages](https://www.notion.com/help/create-a-subpage), and [database presentation](https://www.notion.com/help/intro-to-databases) inform the workspace preview. Bootstrap's specified initial scope is narrower: supported blocks, a page tree, and linked grid views. Do not imply full Notion parity.

Use a dark marketing shell around a light, readable workspace canvas. The contrast makes the work itself prominent. AffectUI/BeUI remain the component sources where suitable, adapted through Bootstrap tokens; the website should not resemble a component catalogue.

## 3. Availability and conversion contract

Default release mode is **concept**. The app is not yet available for signup or paid use. Display **In development** in the header/hero and **Concept preview · Demo data** beside the main product composition. Repeat the development status in the availability FAQ and footer.

The primary concept CTA is **Explore the workspace**, scrolling to the product preview. The secondary is **View on GitHub**. No signup, login, checkout, installation command, working-agent claim, or waitlist collection appears before its destination/function is implemented and verified.

Later release modes can change content centrally:

| Mode | Required readiness | Primary CTA |
| --- | --- | --- |
| Concept — current | Responsive concept page and real repository/spec links | Explore the workspace → #workspace-demo |
| Beta — future | Working application URL, supported onboarding, disclosed limits, adopted license for a self-hosted release | Try the beta → verified beta URL |
| Live — future | Production onboarding, support, hosting/credit purchase paths, commercial settings and published terms | Create your workspace → verified signup URL |

A mode switch requires reviewing all availability, integration, pricing, and self-hosting copy together. Do not change a single button while leaving incompatible claims elsewhere. A proposed future waitlist requires a real handler, consent/privacy wording, validation, duplicate handling, and verified success/failure states; it is outside this landing's default scope.

No customer logos, testimonials, star counts, revenue/savings claims, uptime claims, user counts, awards, or pricing amounts are invented. Planned integrations are labelled as integrations, never as customers or endorsements. A runnable self-hosted release and managed hosting remain planned.

## 4. Information architecture

Use one coherent page with anchored sections:

| Order | Anchor | Purpose and visual |
| --- | --- | --- |
| Header | #top | Wordmark, compact section navigation, development status, GitHub action |
| 1. Hero | #hero | Main promise, short explanation, two actions |
| 2. Workspace preview | #workspace-demo | Large page-centered Customer launch composition with optional example review |
| 3. Workspace story | #workspace | Explain pages, structured data, and ordinary manual work |
| 4. Agent team | #agent-team | One agent-detail composition exposing the six exact properties |
| 5. Workflow | #workflow | Show one assignment reaching a reviewable result |
| 6. Connections | #connections | Planned Composio services and an exact-action review example |
| 7. Hosting | #hosting | Self-hosted and managed paths; separate AI top-ups |
| 8. FAQ | #faq | Availability, control, usage, and ownership questions |
| 9. Final CTA | #follow-build | Follow the project and read the specification |
| Footer | — | Wordmark, real resource links, development status |

Do not insert a logo wall or a generic statistics strip between hero and product. Alternate a few broad editorial sections with focused product details; avoid turning the page into repeated equal-sized feature-card grids.

## 5. Exact page copy

The following copy is the baseline. Preserve its product meaning and status. Minor line-break and rhythm edits are allowed; changes to availability, pricing, permissions, and capabilities require matching product evidence.

### Header

Wordmark: **Bootstrap**

Small status: **In development**

Navigation: **Product · Agents · Connections · Hosting**

Action: **View on GitHub**

### Hero

Eyebrow: **An open-source workspace, in development**

Headline:

> Your business,  
> with a team beside you.

Supporting copy:

> Organize your plans, knowledge, and day-to-day work in one flexible workspace. Build a team of agents that can use your context, work together, and help move things forward.

Primary action: **Explore the workspace**

Secondary action: **View on GitHub**

Status note:

> Product preview. Self-hosted and managed access are planned.

Keep the heading to two lines on a sufficiently wide screen; let it wrap naturally on narrow screens. The product preview starts within or immediately below the first desktop viewport.

### Workspace story

Eyebrow: **Your workspace**

Heading:

> Start with your work.

Body:

> Write a brief, collect research, track customers, or plan a launch. Keep pages, tables, files, and tasks together, with agents available wherever you need a hand.

Three short supporting items:

| Label | Copy |
| --- | --- |
| Pages that grow with your business | Build a clear home for ideas, decisions, and working documents with nested pages and flexible blocks. |
| Tables for the details | Keep customers, experiments, and delivery work alongside the pages that explain them. |
| Your work, always editable | Write, organize, and update the workspace yourself. Ask an agent when you want help. |

Illustrate one useful page containing text, a task reference, and an inline table. The product copy remains outcome-oriented; server/runtime details belong in documentation.

### Agent team

Eyebrow: **Your agent team**

Heading:

> Give each agent a clear role.

Body:

> Shape how your agents work, what they know, and the resources they can use. Start with one specialist and add teammates as your business needs them.

The exact six labels and supporting copy:

| Property | Copy |
| --- | --- |
| Instructions | Define responsibilities and expectations. |
| Skills | Give the agent repeatable ways to work. |
| Routines | Schedule useful work with clear limits. |
| Memories | Keep important context visible and editable. |
| Files | Choose the pages and files it can use. |
| Tables | Connect the business data it can maintain. |

Closing line:

> Work with any agent directly, or let a chosen teammate coordinate an assignment.

Show Growth as the selected example, with Research and Operations as supporting roles. A coordinator is optional. Agent activity does not imply that every saved agent continuously consumes model usage.

### Workflow

Eyebrow: **From context to progress**

Heading:

> From a brief to work you can review.

Body:

> Give an agent a clear assignment. Let it gather context and ask a teammate for help. Review the result in the same project, with the next action in your hands.

| Step | Label | Copy |
| --- | --- | --- |
| 1 | Choose the work | Select a page, file, or the table rows that matter. |
| 2 | Assign an agent | Set the outcome and the context it can use. |
| 3 | Review the result | Inspect the draft or proposed changes alongside your work. |
| 4 | Take the next step | Apply changes or authorize a specific external action. |

Reuse the Customer launch example. A concise visible sequence is enough; a decorative network diagram is unnecessary.

### Connections

Eyebrow: **Connected to your business**

Heading:

> Bring your existing tools into the workspace.

Body:

> Bootstrap is being built with Composio to connect agents to your business services. Choose the accounts, resources, and actions each agent can use.

Supporting line:

> Planned starting integrations: Gmail, Google Calendar, Notion, and GitHub.

Secondary copy:

> Keep the account and intended action visible. Review external actions, or allow narrowly defined work through explicit permissions.

Use restrained service-name chips or connection rows. Include Composio as the connection layer, with no unverified partner badge or integration-count claim. Prefer text labels until icon/logo provenance is established.

### Hosting

Eyebrow: **Run it your way**

Heading:

> Choose how Bootstrap runs.

Introduction:

> The plan is a complete self-hosted workspace, with managed hosting for founders who want us to operate their instance.

| Card | Main copy | Supporting note | Link |
| --- | --- | --- | --- |
| Self-hosted · Planned | Run the open-source workspace on your infrastructure with your own model and Composio credentials. | Infrastructure and external provider charges are separate. | Read the self-hosting plan |
| Managed · Planned | Subscribe to a managed application instance for your workspaces. Add AI credits separately when you need them. | Hosting prices, credit packs, and availability will be announced. | Read the hosting plan |

Shared note:

> Hosting and AI usage are separate. Running out of AI credits pauses unfunded AI work while ordinary workspace use continues under an active hosting entitlement.

No numeric pricing, “free forever,” unlimited usage, free trial, exclusive hardware claim, or instant-deployment guarantee appears in concept mode. One subscriber's instance may contain multiple workspaces.

### FAQ

Use these six questions with expandable answers:

**What is Bootstrap?**

> Bootstrap is a business workspace being built for founders and solo entrepreneurs. It brings pages, tables, files, and tasks together with configurable agents that can help with research, writing, and operational work.

**Can I use it without agents?**

> Yes—that is part of the product design. Writing pages, organizing projects, editing tables, and managing your own tasks should work without invoking AI or spending AI credits.

**What can I configure for each agent?**

> Instructions, skills, routines, memories, files, and tables. You choose the resources and permitted actions, and can work with a specialist directly.

**How will agents access my tools?**

> Through Composio connections and explicit permissions. The planned experience identifies the account, resources, and actions available to each agent, with review for actions that need authorization.

**How will hosting and AI usage be charged?**

> Managed hosting will use a subscription for your application instance. AI usage will use separate top-ups. Prices and any included allowance have not been announced. Self-hosting will use your own infrastructure and provider credentials.

**Is Bootstrap available today?**

> Bootstrap is in development. These previews show the planned experience. The GitHub repository tracks specifications and implementation progress; hosted access and a self-hosted application release are not available yet.

### Final CTA and footer

Heading:

> Make room for the work that matters.

Body:

> Follow Bootstrap as the workspace and agent team take shape.

Primary action: **Follow the build**

Secondary link: **Read the product spec**

Footer text:

> Bootstrap · In development  
> A business workspace, supported by an agent team.

Footer links: **GitHub · Product spec · Roadmap**

Only show Privacy, Terms, Contact, or social links once real approved destinations exist. Do not invent addresses or create nonfunctional anchors.

## 6. Product-preview art direction and fixtures

Build the main composition from real DOM/CSS and controlled fixture data. It is a product illustration, not a full editor implementation. Use Bootstrap components and original content rather than screenshots from Linear, Notion, or another app. If an image export is used for performance, retain an accessible text description and an equivalent interactive example.

### One coherent story: Customer launch

Workspace name: **Demo workspace**

Sidebar shows Everything, Today, Favorites, an expandable Customer launch page, Team, and Connections. Child pages are Launch brief, Segment notes, and Outreach drafts. All are demo records.

Breadcrumb: **Demo workspace / Customer launch / Launch brief**

Page title: **Launch the customer pilot**

Intro:

> Prepare a small pilot for independent studios. Confirm the offer, choose the right customers, and review outreach before it is sent.

Page content:

- A short Objective block.
- A task-list reference: **Confirm the pilot offer — Me — To do**.
- A task-list reference: **Prepare outreach drafts — Growth — Needs review**.
- An inline **Customer shortlist** table.
- A file reference: **Product overview.pdf · Demo file**.

The table has stable fixture IDs and these rows:

| Company | Segment | Status | Next action |
| --- | --- | --- | --- |
| Studio A (demo) | Design studio | Selected | Review draft |
| Studio B (demo) | Digital agency | Selected | Review draft |
| Studio C (demo) | Independent consultant | Research | Check fit |

The two selected rows are reflected in the agent panel's attached-context chips. They are product example data, not usage or conversion metrics.

### Agent panel

Selected agent: **Growth**

Context chips: **Launch brief · Customer shortlist: 2 selected rows**

Example assignment:

> Prepare outreach drafts for these selected customers using the launch brief. Ask Research for a segment check if useful.

Status: **Draft ready · Awaiting your review**

Result:

> Prepared outreach using the launch brief and selected customer rows. Review the drafts and proposed next actions.

Activity:

> Research shared segment notes. Growth prepared the drafts.

Action: **Review draft**

Review draft opens a fixture drawer/dialog containing a short example document, references to the two source items, and a proposed table update. It must remain labelled **Example result · Demo data**. Include a visible Close action and correct focus return. Do not show a false success toast for real sending or storage.

The preview does not require functional text editing, real file download, OAuth, model execution, backend persistence, or actual message delivery. Nonfunctional illustrative chrome is rendered as presentation, not as enabled buttons. The example assignment is labelled text, not an apparently live prompt input.

### Six-property fixture content

| Tab | Example content |
| --- | --- |
| Instructions | Support the founder's customer launch. Use the approved brief. Produce drafts and make missing information visible. |
| Skills | Customer outreach · Version 1; Segment research · Version 1; both labelled example procedures |
| Routines | Weekly launch review · Monday 09:00, workspace timezone · Paused |
| Memories | Preferred tone: clear and concise · Owner-provided · Editable in the planned product |
| Files | Launch brief; Product overview.pdf; references to the same workspace resources |
| Tables | Customer shortlist · Selected rows · Read and propose changes |

All six tabs are actual interactive preview tabs with distinct panels. They demonstrate configuration, not an already running agent. Do not imply installing a skill grants service permissions.

### Exact-action detail

The connections section can show an illustrative approval card:

- Account: founder@bootstrap-demo.example.
- Recipient: hello@studio-a.example.
- Subject: Invitation to the customer pilot.
- Content: a short draft referring to the approved pilot brief.
- State: **Review before sending**.
- Footnote: **Example action; no message will be sent.**

This is a static or inspectable preview; it has no enabled Send control. The real application will bind authorization to exact account, destination, content, and attachments.

## 7. Visual system

These are proposed Bootstrap tokens, not copied Linear measurements.

| Token/use | Value or rule |
| --- | --- |
| Marketing background | #090A0C |
| Secondary marketing surface | #111317 |
| Raised surface | #191C22 |
| Subtle border | #272A31; 1 px |
| Primary text | #F3F4F7 |
| Supporting text | #A4A9B3 |
| Accent | #9B92F8; limited to focus, selected details, and a few links |
| Focus ring | #B8AEFF; visible 2 px outline with offset |
| Primary CTA | Off-white background, near-black text; no gradient |
| Product canvas | #FAFAF8; main text #202124 |
| Product sidebar | #F0F0ED; separators #DEDFDB |
| Typography | Approved existing sans-serif; otherwise properly licensed self-hosted Inter with system fallback |
| Hero type | 72 px target on wide desktop; line-height 1.04; modest negative tracking |
| Section headings | 40–48 px desktop; 28–34 px mobile |
| Body | 18 px lead copy; 16 px normal copy; line-height around 1.55 |
| Labels | 12–13 px, readable contrast; restrained uppercase only for short eyebrows |
| Content width | 1200 px maximum; prose usually 600–680 px |
| Gutter | 24 px desktop/tablet; 20 px mobile; 16 px at the narrowest check |
| Section spacing | 112–144 px desktop; 64–80 px mobile |
| Radius | 8–12 px controls/cards; 16 px product composition |
| Shadow | Subtle separation around the product composition; avoid pervasive glow |

Use one typography system and one muted accent. A faint radial highlight behind the product is optional; it should never dominate the content or reduce contrast. Avoid oversized pill clouds, animated stars, abstract AI brains, stock people, floating agent mascots, and decorative charts. No animated gradient text.

The Bootstrap wordmark should be an original typographic treatment. Do not reuse the Bootstrap CSS framework's logo, Linear's mark, or Notion's branding. Retain font/icon/component notices and record asset provenance. This brief does not adopt the entire t3UI catalogue's styles or assets.

## 8. Responsive composition

| Viewport | Layout contract |
| --- | --- |
| 1280–1440 px and above | Left-aligned hero, large product composition; inside it a narrow sidebar, main page, and contextual agent panel. Preview begins within/just below the first viewport. |
| 768–1279 px | Reduced heading size and gaps; preview prioritizes page/table; agent panel may become an adjacent expandable detail. No compressed unreadable three-column miniature. |
| 390 px | 40–44 px hero heading, natural wrapping, stacked CTAs when needed, collapsed nav; mobile-specific page preview with a clear Review draft entry. |
| 320 px | 36–40 px heading as needed, 16 px outer gutter, wrapped labels, no page-level horizontal overflow; core content remains readable. |

At narrow widths, show the title, objective, selected rows, and result summary rather than scaling the full desktop screenshot. A table can scroll within its own labelled container; the page cannot. Keep the concept label visible at every size. The six-property tabs may wrap or use an accessible scrollable tab strip without hiding the selected panel.

Use natural document scrolling. Sticky header is approximately 64–72 px high; anchored sections account for its height. Do not lock scrolling to animated sections or pin a video over the reading surface.

## 9. Interaction and motion contract

Required interactions are modest and meaningful:

1. Navigation links scroll to actual sections.
2. Mobile menu opens/closes, supports Escape, and returns focus.
3. Review draft opens the local fixture result and closes cleanly.
4. Six agent-property tabs switch content with proper tab semantics and keyboard support.
5. FAQ answers expand/collapse through accessible controls.

Optional: selecting a demo customer row updates the displayed attached-row count, and a Reset example action restores the fixture. If implemented, it operates only on local preview state.

Do not make every illustration control interactive. Enabled controls must do the thing their label promises. Links and buttons use their proper semantics; no empty href, inert CTA, fake OAuth, fake billing, or simulated model success.

Motion uses short opacity/translation transitions: approximately 160–220 ms for controls and 280–400 ms for a first reveal, with translations no larger than 12 px. Content stays readable without animation. No auto-advancing carousel, typewriter headline, continuous particle loop, or autoplay video.

Under reduced motion, remove translation/reveal sequencing and smooth scrolling. No essential content waits for animation or JavaScript to become visible.

## 10. CTA and URL map

Centralize destinations in a small configuration/content module.

| Label | Destination in concept mode |
| --- | --- |
| Bootstrap wordmark | #top |
| Product / Explore the workspace | #workspace-demo |
| Agents | #agent-team |
| Connections | #connections |
| Hosting | #hosting |
| View on GitHub / Follow the build / footer GitHub | https://github.com/t3grp/bootstrap |
| Read the product spec / footer Product spec | https://github.com/t3grp/bootstrap/blob/docs/bootstrap-product-spec-20261106/docs/product-spec.md |
| Read the self-hosting plan | https://github.com/t3grp/bootstrap/blob/docs/bootstrap-product-spec-20261106/docs/hosted-service.md#1-product-and-ownership-contract |
| Read the hosting plan | https://github.com/t3grp/bootstrap/blob/docs/bootstrap-product-spec-20261106/docs/hosted-service.md |
| Roadmap | https://github.com/t3grp/bootstrap/blob/docs/bootstrap-product-spec-20261106/docs/implementation-plan.md |
| Review draft | Local example result dialog; no external request |

These branch links are review-time destinations. Before a public launch, update them to the approved stable documentation branch/path and verify each resolves. Do not assume the specification branch will remain after merge. External links may use the same tab; if opening a new tab, communicate that behavior and use appropriate rel attributes.

## 11. Implementation shape

Use the repository's supported React/Next.js stack when Muse implements the page. Keep marketing code and controlled fixture data separate from workspace application/runtime code. The conceptual component set is:

- MarketingHeader, Hero, WorkspacePreview.
- WorkspaceStory, AgentPropertiesPreview, WorkflowStory.
- ConnectionsSection, HostingOptions, FAQ, FinalCTA, MarketingFooter.
- A shared content/link configuration, theme tokens, and fixture module.

This is guidance for module boundaries, not a requirement to create twelve files before anything works. Reuse selected AffectUI/BeUI primitives where appropriate, removing demo timers and fixtures that contradict this brief. The product illustration's fixture state should be explicit and isolated from production app state.

Render meaningful copy and the initial preview on the server or statically. Hydrate only needed interactions. Reserve media dimensions, lazy-load below-fold media, and avoid introducing WebGL/canvas or large animation packages just for decoration.

The default page collects no email address and makes no model, Composio, payment, provisioning, or agent API calls. Analytics are off unless separately configured. If later approved, measure coarse CTA/preview events without prompt content, contact data, fingerprinting, or raw workspace information.

## 12. Metadata, accessibility, and performance

Proposed title: **Bootstrap — Your business workspace and agent team**

Proposed description:

> A business workspace for founders, with pages, tables, files, and a configurable agent team. Explore the Bootstrap concept and follow the open-source build.

Use one H1, meaningful heading order, a skip link, landmarks, visible focus, labelled controls, and useful accessible descriptions for preview visuals. Decorative icons are hidden from assistive technology; status must not rely on color alone.

Meet minimum text contrast of 4.5:1 for ordinary text and 3:1 for large text, following [W3C's contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Aim for touch controls at least 44 CSS px in the mobile layout. Verify 200% zoom and keyboard-only completion of required interactions.

Preview deployments should be noindex. Set the canonical URL and indexing only when the approved public domain is known; do not invent a Bootstrap domain. Produce an original social preview at 1200 × 630 with the wordmark, concise headline, and a crop of the labelled concept workspace. Do not add review/rating/price structured data for unlaunched features.

Proposed implementation performance targets are LCP at or below 2.5 seconds and CLS at or below 0.1 under a documented mobile test profile. Report measurements and conditions; these are targets, not results already achieved. Avoid delaying the main content behind decorative animation or client-only loading.

## 13. Muse deliverables and acceptance

Deliver the responsive page, reusable section primitives, editable copy/link configuration, original fixture compositions, source/provenance notes, and evidence. Provide a preview URL if an authorized preview facility is available. Public production deployment is a separate action.

Capture the final page at 390, 768, 1280, and 1440 CSS-pixel widths, plus a 320 px overflow check. Include the hero/product preview, agent-property detail, and hosting/FAQ at desktop and mobile. Show actual implemented states rather than a separate design mockup.

| ID | Acceptance requirement |
| --- | --- |
| LP01 | First screen communicates business workspace, agent support, and current development status. |
| LP02 | Main preview shows nested page navigation, blocks, inline customer data, and contextual agent help. |
| LP03 | Marketing typography, space, surfaces, borders, and motion follow the agreed restrained direction with original Bootstrap assets. |
| LP04 | Exact six agent-property labels appear and each has meaningful interactive fixture content. |
| LP05 | Every CTA/navigation destination resolves; no placeholder signup, waitlist, login, payment, or empty link remains. |
| LP06 | Concept/demo labels remain visible across preview states and viewport sizes; no fixture is presented as live output. |
| LP07 | Hosting subscription, per-user application instance, and separate AI top-ups are explained without invented prices or hardware promises. |
| LP08 | Connection names are labelled planned; no customer/partner claim, integration count, or fabricated social proof appears. |
| LP09 | 320/390/768/1280/1440 px checks show readable content and no page-level horizontal overflow. |
| LP10 | Mobile preview is deliberately composed and readable, with a usable review path rather than a shrunken desktop image. |
| LP11 | Keyboard, focus, Escape, tab controls, FAQ, mobile menu, and dialog focus return work. |
| LP12 | Text contrast, 200% zoom, touch sizing, and status labels remain usable. |
| LP13 | Reduced motion removes movement/smooth scrolling without hiding content or breaking controls. |
| LP14 | Initial copy and preview render without waiting for optional JavaScript; layout shifts and load metrics are measured. |
| LP15 | No landing interaction calls real model, connection, payment, provisioning, or workspace mutation services. |
| LP16 | Metadata, canonical/indexing mode, social-preview provenance, and external-link behavior are correct for the deployment. |
| LP17 | Fonts/icons/components have recorded provenance; no copied Linear/Notion screenshot, copy, logo, or customer list is shipped. |
| LP18 | Screenshot and interaction evidence matches the final reviewed commit; known gaps and deployment status are stated. |

Acceptance covers the landing page. Passing it does not certify the application, agent runtime, integrations, payment service, or full Notion feature parity.
