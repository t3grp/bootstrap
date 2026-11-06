import { Hero } from "./components/Hero";
import { WorkspacePreview } from "./components/WorkspacePreview";
import { AgentTeam } from "./components/AgentTeam";
import { Faq } from "./components/Faq";
import {
  Connections,
  FinalCta,
  Hosting,
  Workflow,
  WorkspaceStory,
} from "./components/Sections";

/**
 * Bootstrap public landing page (concept mode).
 * Section order and anchors follow landing-page-spec §4.
 * All copy renders server-side; only the preview, tabs, FAQ and mobile
 * menu hydrate for interaction.
 */
export default function WelcomePage() {
  return (
    <>
      <Hero />
      <div className="reveal">
        <WorkspacePreview />
      </div>
      <WorkspaceStory />
      <AgentTeam />
      <Workflow />
      <Connections />
      <Hosting />
      <Faq />
      <FinalCta />
    </>
  );
}
