"use client";

import { useState } from "react";
import { AGENT_PANEL, WORKSPACE_FIXTURE, type CustomerRow } from "../lib/fixtures";
import { Dialog } from "./ui/Dialog";

/**
 * Main product composition: light workspace canvas (sidebar, launch-brief
 * page, inline customer shortlist) beside the Growth agent panel.
 * All data is the §6 demo fixture. Selecting a customer row updates the
 * attached-row count in the agent panel (local preview state only); Reset
 * example restores the fixture.
 */
export function WorkspacePreview() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(
      WORKSPACE_FIXTURE.customers
        .filter((row) => row.status === "Selected")
        .map((row) => row.id),
    ),
  );
  const [reviewOpen, setReviewOpen] = useState(false);

  const toggleRow = (row: CustomerRow) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  };

  const resetExample = () => {
    setSelected(
      new Set(
        WORKSPACE_FIXTURE.customers
          .filter((row) => row.status === "Selected")
          .map((row) => row.id),
      ),
    );
  };

  const selectedCount = WORKSPACE_FIXTURE.customers.filter((row) => selected.has(row.id)).length;

  return (
    <section id="workspace-demo" aria-labelledby="workspace-demo-heading">
      <div className="container">
        <div className="preview-shell">
          <div className="preview-shell__bar">
            <h2 id="workspace-demo-heading" style={{ fontSize: 15, margin: 0 }}>
              {WORKSPACE_FIXTURE.workspaceName} — Customer launch
            </h2>
            <span className="concept-label">Concept preview · Demo data</span>
          </div>
          <div className="workspace">
            <aside className="workspace__sidebar" aria-label="Workspace navigation">
              <h3>Workspace</h3>
              <ul className="ws-nav">
                {WORKSPACE_FIXTURE.sidebar.top.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                <li aria-current="true">
                  Customer launch
                  <ul>
                    {WORKSPACE_FIXTURE.sidebar.launchPages.map((page) => (
                      <li key={page}>{page}</li>
                    ))}
                  </ul>
                </li>
                <li>Team</li>
                <li>Connections</li>
              </ul>
            </aside>

            <div className="ws-page">
              <div className="workspace__mobile-summary">
                <p>
                  <strong>{WORKSPACE_FIXTURE.pageTitle}</strong>
                </p>
                <p>{WORKSPACE_FIXTURE.intro}</p>
                <p>
                  {selectedCount} of {WORKSPACE_FIXTURE.customers.length} customers selected ·{" "}
                  {AGENT_PANEL.status}
                </p>
              </div>
              <p className="ws-breadcrumb">{WORKSPACE_FIXTURE.breadcrumb.join(" / ")}</p>
              <h3>{WORKSPACE_FIXTURE.pageTitle}</h3>
              <p>{WORKSPACE_FIXTURE.intro}</p>

              <div className="ws-block">
                <span className="ws-block__label">Objective</span>
                Confirm the pilot offer for independent studios, choose the right
                customers, and review outreach before it is sent.
              </div>

              {WORKSPACE_FIXTURE.tasks.map((task) => (
                <div className="ws-task" key={task.id}>
                  <span className="ws-task__box" aria-hidden="true" />
                  <span>{task.text}</span>
                  <span className="ws-task__meta">
                    {task.assignee} · {task.state}
                  </span>
                </div>
              ))}

              <div style={{ marginTop: 20 }}>
                <span className="ws-block__label">Customer shortlist</span>
                <div className="ws-table-wrap" role="region" aria-label="Customer shortlist table" tabIndex={0}>
                  <table className="ws-table">
                    <thead>
                      <tr>
                        <th scope="col">Company</th>
                        <th scope="col">Segment</th>
                        <th scope="col">Status</th>
                        <th scope="col">Next action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WORKSPACE_FIXTURE.customers.map((row) => (
                        <tr
                          key={row.id}
                          data-selected={selected.has(row.id)}
                          onClick={() => toggleRow(row)}
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleRow(row);
                            }
                          }}
                          aria-label={`${row.company}, ${row.segment}, ${row.status}. Activate to ${selected.has(row.id) ? "remove from" : "add to"} the selection.`}
                        >
                          <td>{row.company}</td>
                          <td>{row.segment}</td>
                          <td>{row.status}</td>
                          <td>{row.nextAction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 12, color: "var(--canvas-supporting)", margin: "8px 0 0" }}>
                  Select rows to change what the agent panel attaches. This is demo
                  data — nothing is saved or sent.{" "}
                  <button
                    type="button"
                    onClick={resetExample}
                    style={{
                      background: "none", border: "none", padding: 0,
                      color: "inherit", textDecoration: "underline", cursor: "pointer",
                      font: "inherit",
                    }}
                  >
                    Reset example
                  </button>
                </p>
              </div>

              <p className="ws-file">
                <span aria-hidden="true">▣</span>
                {WORKSPACE_FIXTURE.fileRef}
              </p>
            </div>

            <aside className="agent-panel" aria-label={`Agent panel — ${AGENT_PANEL.agent}`}>
              <h4>{AGENT_PANEL.agent}</h4>
              <p className="agent-panel__role">Agent · Customer launch</p>
              <p className="agent-panel__label">Attached context</p>
              <div className="chip-row">
                <span className="chip">Launch brief</span>
                <span className="chip">
                  Customer shortlist: {selectedCount} selected row{selectedCount === 1 ? "" : "s"}
                </span>
              </div>
              <p className="agent-panel__label">Example assignment</p>
              <p>{AGENT_PANEL.assignment}</p>
              <p className="agent-panel__status">{AGENT_PANEL.status}</p>
              <p>{AGENT_PANEL.result}</p>
              <p style={{ color: "var(--canvas-supporting)" }}>{AGENT_PANEL.activity}</p>
              <button type="button" className="btn btn--dark" onClick={() => setReviewOpen(true)}>
                {AGENT_PANEL.reviewLabel}
              </button>
            </aside>
          </div>
        </div>
      </div>

      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        label={`${AGENT_PANEL.reviewDialogLabel} — ${AGENT_PANEL.reviewDocument.title}`}
      >
        <p className="concept-label" style={{ marginBottom: 12 }}>
          {AGENT_PANEL.reviewDialogLabel}
        </p>
        <h2>{AGENT_PANEL.reviewDocument.title}</h2>
        {AGENT_PANEL.reviewDocument.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
        <p>
          <strong>Sources: </strong>
          {AGENT_PANEL.reviewDocument.sources.join(" · ")}
        </p>
        <p>
          <strong>Proposed update: </strong>
          {AGENT_PANEL.reviewDocument.proposedUpdate}
        </p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--dark" onClick={() => setReviewOpen(false)}>
            Close
          </button>
        </div>
      </Dialog>
    </section>
  );
}
