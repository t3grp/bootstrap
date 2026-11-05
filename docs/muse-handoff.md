# Bootstrap — Muse implementation handoff

Date: 6 November 2026. Specification revision: 0.3. This is the ready-to-use assignment for Muse; no implementation or deployment has been performed by the specification author.

## Assignment

Build Bootstrap's responsive public landing page from [landing-page-spec.md](landing-page-spec.md), in the Bootstrap repository. Read the repository instructions and current draft specifications before editing.

Bootstrap is an open-source business workspace for founders. The workspace should feel like Notion: nested pages, content blocks, slash commands, inline tables, files, and tasks. Agents support the user's work in context. Every agent has Instructions, Skills, Routines, Memories, Files, and Tables. Users can work directly with a specialist; a coordinator is optional.

The marketing page should have a Linear-inspired feel: dark graphite surfaces, a large left-aligned headline, crisp sans-serif typography, generous spacing, thin borders, restrained motion, and detailed product compositions. Build original Bootstrap styling and assets. Use appropriate AffectUI/BeUI primitives from the approved source subset.

Inside the dark page, show a light, readable Bootstrap workspace. Use the Customer launch fixture specified in the full brief: nested pages, a launch brief, an inline customer shortlist, the founder's task, and Growth's draft beside the page. The user workspace should dominate the composition.

## Required starting copy

Hero eyebrow: **An open-source workspace, in development**

Hero headline:

> Your business,  
> with a team beside you.

Supporting copy:

> Organize your plans, knowledge, and day-to-day work in one flexible workspace. Build a team of agents that can use your context, work together, and help move things forward.

Primary CTA: **Explore the workspace** → the page's concept preview.

Secondary CTA: **View on GitHub** → https://github.com/t3grp/bootstrap.

Show **In development** and **Concept preview · Demo data** as specified. Follow the full brief's exact section copy, six-property fixture content, FAQ, and CTA map.

## Build scope

Implement the marketing route and isolated local preview interactions: anchored navigation, mobile menu, example draft review, six agent-property tabs, and FAQ. The preview can use DOM/CSS fixtures; it does not need a functioning block editor or agent backend.

Explain both planned deployment paths: self-hosting with the operator's credentials, and a subscription-provisioned application instance with separate AI-credit top-ups. No prices have been selected.

Default to concept mode. Offer only real destinations. Do not create nonfunctional signup/login/waitlist/checkout controls, simulate OAuth or payment, or call real model/integration APIs. Do not add fabricated customers, testimonials, metrics, star counts, service guarantees, or claims that the application is already available.

Keep marketing code, content/link configuration, theme tokens, and preview fixtures cleanly separated from application state. Static/server-rendered initial content and modest hydration are preferred. Include accessible keyboard behavior and reduced-motion support.

## Delivery

Provide the code in a reviewable PR, desktop/mobile screenshots from the implemented page, link and interaction verification, font/icon/component provenance, measured loading/overflow observations, and any remaining limitations. Follow LP01–LP18 in the full brief. Verify at 390, 768, 1280, and 1440 px, with a 320 px overflow check.

Use an authorized preview deployment if available. Production publishing, merging, or sending messages is not part of this handoff unless the owner separately authorizes it.

The repository's specification PR is [Bootstrap #1](https://github.com/t3grp/bootstrap/pull/1). Related product contracts: [product](product-spec.md), [workspace UX](ux-design.md), [technical design](technical-design.md), and [hosted service](hosted-service.md).
