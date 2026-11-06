import type { Metadata } from "next";
import "./landing.module.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Sections";

// Public landing page (M0, concept mode). This route is isolated marketing:
// it does not touch the workspace app at `/`, which keeps its own root
// layout, globals and gateway. Styles come only from ./landing.module.css,
// scoped under .lp, so the dark marketing tokens never leak into the
// workspace. Concept preview: noindex until the approved public domain is
// known. Do not set a canonical URL — no Bootstrap domain has been approved.
// No social-preview image yet: generating one needs the wawoff2 dependency
// (integration writer owns manifests/lockfile); see PROVENANCE.md.
export const metadata: Metadata = {
  title: "Bootstrap — Your business workspace and agent team",
  description:
    "A business workspace for founders, with pages, tables, files, and a configurable agent team. Explore the Bootstrap concept and follow the open-source build.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Bootstrap — Your business workspace and agent team",
    description:
      "A business workspace for founders, with pages, tables, files, and a configurable agent team. Explore the Bootstrap concept and follow the open-source build.",
    type: "website",
  },
};

export default function WelcomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="lp">
      <a className="skip-link" href="#hero">
        Skip to content
      </a>
      <div id="top">
        <Header />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
