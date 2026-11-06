import { LINKS } from "../lib/links";
import { CONTENT } from "../lib/content";

/** Workspace story (§5): three supporting items under "Start with your work." */
export function WorkspaceStory() {
  return (
    <section className="section" id="workspace" aria-labelledby="workspace-heading">
      <div className="container">
        <p className="eyebrow">{CONTENT.workspaceStory.eyebrow}</p>
        <h2 id="workspace-heading">{CONTENT.workspaceStory.heading}</h2>
        <p className="lead">{CONTENT.workspaceStory.body}</p>
        <div className="story-grid">
          {CONTENT.workspaceStory.items.map((item) => (
            <article className="story-card" key={item.label}>
              <h3>{item.label}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Workflow (§5): four steps, reusing the Customer launch example. */
export function Workflow() {
  return (
    <section className="section" id="workflow" aria-labelledby="workflow-heading">
      <div className="container">
        <p className="eyebrow">{CONTENT.workflow.eyebrow}</p>
        <h2 id="workflow-heading">{CONTENT.workflow.heading}</h2>
        <p className="lead">{CONTENT.workflow.body}</p>
        <ol className="steps" style={{ listStyle: "none", margin: "48px 0 0", padding: 0 }}>
          {CONTENT.workflow.steps.map((step, index) => (
            <li className="step" key={step.label}>
              <span className="step__num">Step {index + 1}</span>
              <h3>{step.label}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Connections (§5 + §6 exact-action detail). Planned integrations only; the
 * approval card has no Send control and is labelled as an example. */
export function Connections() {
  const services = [
    { name: "Gmail", state: "Planned" },
    { name: "Google Calendar", state: "Planned" },
    { name: "Notion", state: "Planned" },
    { name: "GitHub", state: "Planned" },
  ];
  return (
    <section className="section" id="connections" aria-labelledby="connections-heading">
      <div className="container">
        <p className="eyebrow">{CONTENT.connections.eyebrow}</p>
        <h2 id="connections-heading">{CONTENT.connections.heading}</h2>
        <p className="lead">{CONTENT.connections.body}</p>
        <p className="lead" style={{ marginTop: 16 }}>{CONTENT.connections.planned}</p>
        <div className="connection-list" role="list" aria-label="Planned starting integrations">
          {services.map((service) => (
            <div className="connection-row" role="listitem" key={service.name}>
              <span className="connection-row__name">{service.name}</span>
              <span className="connection-row__state">
                Planned integration · via Composio
              </span>
            </div>
          ))}
        </div>
        <div className="approval-card" aria-label="Example action review">
          <h3>Example action — review before sending</h3>
          <p className="approval-card__state">Review before sending</p>
          <dl>
            <dt>Account</dt>
            <dd>founder@bootstrap-demo.example</dd>
            <dt>Recipient</dt>
            <dd>hello@studio-a.example</dd>
            <dt>Subject</dt>
            <dd>Invitation to the customer pilot</dd>
          </dl>
          <p className="approval-card__body">
            A short draft inviting Studio A to the customer pilot, referring to
            the approved pilot brief and the first step for the studio.
          </p>
          <p className="approval-card__footnote">Example action; no message will be sent.</p>
        </div>
        <p className="lead" style={{ marginTop: 24 }}>{CONTENT.connections.secondary}</p>
      </div>
    </section>
  );
}

/** Hosting (§5): self-hosted and managed paths, separate AI top-ups, no prices. */
export function Hosting() {
  return (
    <section className="section" id="hosting" aria-labelledby="hosting-heading">
      <div className="container">
        <p className="eyebrow">{CONTENT.hosting.eyebrow}</p>
        <h2 id="hosting-heading">{CONTENT.hosting.heading}</h2>
        <p className="lead">{CONTENT.hosting.intro}</p>
        <div className="hosting-grid">
          <article className="hosting-card">
            <h3>{CONTENT.hosting.cards[0].title}</h3>
            <p>{CONTENT.hosting.cards[0].copy}</p>
            <p className="hosting-card__note">{CONTENT.hosting.cards[0].note}</p>
            <a href={LINKS.selfHostingPlan}>{CONTENT.hosting.cards[0].linkLabel} →</a>
          </article>
          <article className="hosting-card">
            <h3>{CONTENT.hosting.cards[1].title}</h3>
            <p>{CONTENT.hosting.cards[1].copy}</p>
            <p className="hosting-card__note">{CONTENT.hosting.cards[1].note}</p>
            <a href={LINKS.hostingPlan}>{CONTENT.hosting.cards[1].linkLabel} →</a>
          </article>
        </div>
        <p className="hosting-note">{CONTENT.hosting.sharedNote}</p>
      </div>
    </section>
  );
}

/** Final CTA + footer (§5). */
export function FinalCta() {
  return (
    <section className="section" id="follow-build" aria-labelledby="follow-build-heading">
      <div className="container">
        <div className="final-cta">
          <h2 id="follow-build-heading">{CONTENT.finalCta.heading}</h2>
          <p className="lead">{CONTENT.finalCta.body}</p>
          <div className="final-cta__actions">
            <a className="btn btn--primary" href={LINKS.github}>
              {CONTENT.finalCta.primary}
            </a>
            <a className="btn btn--secondary" href={LINKS.productSpec}>
              {CONTENT.finalCta.secondary}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__inner">
          <div>
            <p>
              <strong>{CONTENT.footer.text}</strong>
            </p>
            <p>{CONTENT.footer.sub}</p>
          </div>
          <nav aria-label="Resources">
            <a href={LINKS.github}>GitHub</a>
            <a href={LINKS.productSpec}>Product spec</a>
            <a href={LINKS.roadmap}>Roadmap</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
