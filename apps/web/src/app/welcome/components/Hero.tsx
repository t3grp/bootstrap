import { LINKS } from "../lib/links";
import { CONTENT } from "../lib/content";

/** Hero: eyebrow, two-line headline, supporting copy, two CTAs, status note. */
export function Hero() {
  return (
    <section className="hero" id="hero" aria-labelledby="hero-heading">
      <div className="container">
        <p className="hero__eyebrow">{CONTENT.hero.eyebrow}</p>
        <h1 id="hero-heading">
          {CONTENT.hero.headline[0]}
          <br />
          {CONTENT.hero.headline[1]}
        </h1>
        <p className="hero__support">{CONTENT.hero.supporting}</p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="#workspace-demo">
            {CONTENT.hero.primary}
          </a>
          <a className="btn btn--secondary" href={LINKS.github}>
            {CONTENT.hero.secondary}
          </a>
        </div>
        <p className="hero__note">{CONTENT.hero.statusNote}</p>
      </div>
    </section>
  );
}
