// Product-preview fixtures (landing-page-spec §6). Demo data only — every
// surface that shows fixture content is labelled "Concept preview · Demo data".
// No fixture is presented as live output, and none of this state touches
// application state: it is local preview state only.

export type CustomerRow = {
  id: string;
  company: string;
  segment: string;
  status: "Selected" | "Research";
  nextAction: string;
};

export const WORKSPACE_FIXTURE = {
  workspaceName: "Demo workspace",
  sidebar: {
    top: ["Everything", "Today", "Favorites"],
    launchPages: ["Launch brief", "Segment notes", "Outreach drafts"],
  },
  breadcrumb: ["Demo workspace", "Customer launch", "Launch brief"],
  pageTitle: "Launch the customer pilot",
  intro:
    "Prepare a small pilot for independent studios. Confirm the offer, choose the right customers, and review outreach before it is sent.",
  tasks: [
    { id: "task-offer", text: "Confirm the pilot offer", assignee: "Me", state: "To do" },
    { id: "task-drafts", text: "Prepare outreach drafts", assignee: "Growth", state: "Needs review" },
  ],
  fileRef: "Product overview.pdf · Demo file",
  customers: [
    { id: "studio-a", company: "Studio A (demo)", segment: "Design studio", status: "Selected", nextAction: "Review draft" },
    { id: "studio-b", company: "Studio B (demo)", segment: "Digital agency", status: "Selected", nextAction: "Review draft" },
    { id: "studio-c", company: "Studio C (demo)", segment: "Independent consultant", status: "Research", nextAction: "Check fit" },
  ] as CustomerRow[],
} as const;

export const AGENT_PANEL = {
  agent: "Growth",
  assignment:
    "Prepare outreach drafts for these selected customers using the launch brief. Ask Research for a segment check if useful.",
  status: "Draft ready · Awaiting your review",
  result:
    "Prepared outreach using the launch brief and selected customer rows. Review the drafts and proposed next actions.",
  activity: "Research shared segment notes. Growth prepared the drafts.",
  reviewLabel: "Review draft",
  reviewDialogLabel: "Example result · Demo data",
  reviewDocument: {
    title: "Outreach drafts — customer pilot (example)",
    paragraphs: [
      "Two drafts are prepared from the launch brief, one for Studio A and one for Studio B. Each draft names the pilot offer, the first step for the studio, and a reply route.",
      "Research shared segment notes for both studios. The notes flag a fit check for Studio C, which stays in research and is not included in this draft set.",
    ],
    sources: ["Launch brief", "Customer shortlist: 2 selected rows"],
    proposedUpdate:
      "Proposed table update: mark Studio A and Studio B as “Draft ready”, and leave Studio C as “Research”. No rows are changed by opening this example.",
  },
} as const;

// Six-property fixture content (landing-page-spec §6).
export const AGENT_PROPERTY_CONTENT: Record<string, { title: string; lines: string[] }> = {
  instructions: {
    title: "Instructions",
    lines: [
      "Support the founder's customer launch. Use the approved brief.",
      "Produce drafts and make missing information visible.",
    ],
  },
  skills: {
    title: "Skills",
    lines: [
      "Customer outreach · Version 1 — example procedure",
      "Segment research · Version 1 — example procedure",
    ],
  },
  routines: {
    title: "Routines",
    lines: ["Weekly launch review · Monday 09:00, workspace timezone", "Status: Paused"],
  },
  memories: {
    title: "Memories",
    lines: [
      "Preferred tone: clear and concise",
      "Owner-provided · Editable in the planned product",
    ],
  },
  files: {
    title: "Files",
    lines: ["Launch brief", "Product overview.pdf", "References to the same workspace resources"],
  },
  tables: {
    title: "Tables",
    lines: ["Customer shortlist · Selected rows", "Read and propose changes"],
  },
};

export const EXACT_ACTION = {
  account: "founder@bootstrap-demo.example",
  recipient: "hello@studio-a.example",
  subject: "Invitation to the customer pilot",
  body: "A short draft inviting Studio A to the customer pilot, referring to the approved pilot brief and the first step for the studio.",
  state: "Review before sending",
  footnote: "Example action; no message will be sent.",
} as const;
