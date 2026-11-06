// Central destination map for the landing page (landing-page-spec §10).
// Concept mode: only real destinations. No signup/login/waitlist/checkout URLs exist.
// The docs links point at main now that the specification PR (#1) is merged.
export const LINKS = {
  github: "https://github.com/t3grp/bootstrap",
  productSpec:
    "https://github.com/t3grp/bootstrap/blob/main/docs/product-spec.md",
  selfHostingPlan:
    "https://github.com/t3grp/bootstrap/blob/main/docs/hosted-service.md#1-product-and-ownership-contract",
  hostingPlan:
    "https://github.com/t3grp/bootstrap/blob/main/docs/hosted-service.md",
  roadmap:
    "https://github.com/t3grp/bootstrap/blob/main/docs/implementation-plan.md",
} as const;

export const NAV = [
  { label: "Product", href: "#workspace-demo" },
  { label: "Agents", href: "#agent-team" },
  { label: "Connections", href: "#connections" },
  { label: "Hosting", href: "#hosting" },
] as const;
