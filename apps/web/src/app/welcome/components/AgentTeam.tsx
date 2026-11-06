"use client";

import { useState } from "react";
import { AGENT_PROPERTIES, CONTENT } from "../lib/content";
import { AGENT_PROPERTY_CONTENT } from "../lib/fixtures";
import { Tabs, type TabItem } from "./ui/Tabs";

/**
 * Agent team (§5): roster of Growth (selected example), Research and
 * Operations, plus the six exact agent-property tabs with fixture content.
 * Selecting a roster agent changes the example agent shown; the six tabs
 * always show the Growth fixture content, labelled as example configuration.
 */
const ROSTER = [
  { name: "Growth", role: "Customer launch · Selected example", initials: "Gr" },
  { name: "Research", role: "Segment checks · Supporting role", initials: "Re" },
  { name: "Operations", role: "Delivery follow-up · Supporting role", initials: "Op" },
] as const;

export function AgentTeam() {
  const [agent, setAgent] = useState("Growth");

  const items: TabItem[] = AGENT_PROPERTIES.map((prop) => {
    const fixture = AGENT_PROPERTY_CONTENT[prop.id];
    return {
      id: prop.id,
      label: prop.label,
      panel: (
        <div>
          <h3>
            {prop.label} — {agent}
          </h3>
          <p>{prop.copy}</p>
          <ul>
            {fixture.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p style={{ fontSize: 13, marginTop: 16 }}>
            Example configuration · Demo data. A coordinator is optional; work
            with any agent directly.
          </p>
        </div>
      ),
    };
  });

  return (
    <section className="section" id="agent-team" aria-labelledby="agent-team-heading">
      <div className="container">
        <p className="eyebrow">{CONTENT.agentTeam.eyebrow}</p>
        <h2 id="agent-team-heading">{CONTENT.agentTeam.heading}</h2>
        <p className="lead">{CONTENT.agentTeam.body}</p>
        <div className="agent-team" style={{ marginTop: 40 }}>
          <div className="agent-roster" role="group" aria-label="Example agents">
            {ROSTER.map((member) => (
              <button
                key={member.name}
                type="button"
                aria-pressed={agent === member.name}
                onClick={() => setAgent(member.name)}
              >
                <span className="agent-avatar" aria-hidden="true">{member.initials}</span>
                <span>
                  <span className="agent-roster__name">{member.name}</span>
                  <span className="agent-roster__role">{member.role}</span>
                </span>
              </button>
            ))}
          </div>
          <div>
            <Tabs items={items} label="Agent properties" />
            <p className="lead" style={{ marginTop: 8 }}>{CONTENT.agentTeam.closing}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
