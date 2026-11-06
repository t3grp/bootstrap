// Exact page copy from landing-page-spec §5. Keep product meaning and status
// intact; availability/pricing/permission wording changes need matching evidence.
export const CONTENT = {
  header: {
    wordmark: "Bootstrap",
    status: "In development",
    githubLabel: "View on GitHub",
  },
  hero: {
    eyebrow: "An open-source workspace, in development",
    headline: ["Your business,", "with a team beside you."],
    supporting:
      "Organize your plans, knowledge, and day-to-day work in one flexible workspace. Build a team of agents that can use your context, work together, and help move things forward.",
    primary: "Explore the workspace",
    secondary: "View on GitHub",
    statusNote: "Product preview. Self-hosted and managed access are planned.",
  },
  workspaceStory: {
    eyebrow: "Your workspace",
    heading: "Start with your work.",
    body: "Write a brief, collect research, track customers, or plan a launch. Keep pages, tables, files, and tasks together, with agents available wherever you need a hand.",
    items: [
      {
        label: "Pages that grow with your business",
        copy: "Build a clear home for ideas, decisions, and working documents with nested pages and flexible blocks.",
      },
      {
        label: "Tables for the details",
        copy: "Keep customers, experiments, and delivery work alongside the pages that explain them.",
      },
      {
        label: "Your work, always editable",
        copy: "Write, organize, and update the workspace yourself. Ask an agent when you want help.",
      },
    ],
  },
  agentTeam: {
    eyebrow: "Your agent team",
    heading: "Give each agent a clear role.",
    body: "Shape how your agents work, what they know, and the resources they can use. Start with one specialist and add teammates as your business needs them.",
    closing: "Work with any agent directly, or let a chosen teammate coordinate an assignment.",
    roles: ["Growth", "Research", "Operations"],
  },
  workflow: {
    eyebrow: "From context to progress",
    heading: "From a brief to work you can review.",
    body: "Give an agent a clear assignment. Let it gather context and ask a teammate for help. Review the result in the same project, with the next action in your hands.",
    steps: [
      { label: "Choose the work", copy: "Select a page, file, or the table rows that matter." },
      { label: "Assign an agent", copy: "Set the outcome and the context it can use." },
      { label: "Review the result", copy: "Inspect the draft or proposed changes alongside your work." },
      { label: "Take the next step", copy: "Apply changes or authorize a specific external action." },
    ],
  },
  connections: {
    eyebrow: "Connected to your business",
    heading: "Bring your existing tools into the workspace.",
    body: "Bootstrap is being built with Composio to connect agents to your business services. Choose the accounts, resources, and actions each agent can use.",
    planned: "Planned starting integrations: Gmail, Google Calendar, Notion, and GitHub.",
    secondary:
      "Keep the account and intended action visible. Review external actions, or allow narrowly defined work through explicit permissions.",
  },
  hosting: {
    eyebrow: "Run it your way",
    heading: "Choose how Bootstrap runs.",
    intro:
      "The plan is a complete self-hosted workspace, with managed hosting for founders who want us to operate their instance.",
    cards: [
      {
        title: "Self-hosted · Planned",
        copy: "Run the open-source workspace on your infrastructure with your own model and Composio credentials.",
        note: "Infrastructure and external provider charges are separate.",
        linkLabel: "Read the self-hosting plan",
      },
      {
        title: "Managed · Planned",
        copy: "Subscribe to a managed application instance for your workspaces. Add AI credits separately when you need them.",
        note: "Hosting prices, credit packs, and availability will be announced.",
        linkLabel: "Read the hosting plan",
      },
    ],
    sharedNote:
      "Hosting and AI usage are separate. Running out of AI credits pauses unfunded AI work while ordinary workspace use continues under an active hosting entitlement.",
  },
  faq: [
    {
      q: "What is Bootstrap?",
      a: "Bootstrap is a business workspace being built for founders and solo entrepreneurs. It brings pages, tables, files, and tasks together with configurable agents that can help with research, writing, and operational work.",
    },
    {
      q: "Can I use it without agents?",
      a: "Yes—that is part of the product design. Writing pages, organizing projects, editing tables, and managing your own tasks should work without invoking AI or spending AI credits.",
    },
    {
      q: "What can I configure for each agent?",
      a: "Instructions, skills, routines, memories, files, and tables. You choose the resources and permitted actions, and can work with a specialist directly.",
    },
    {
      q: "How will agents access my tools?",
      a: "Through Composio connections and explicit permissions. The planned experience identifies the account, resources, and actions available to each agent, with review for actions that need authorization.",
    },
    {
      q: "How will hosting and AI usage be charged?",
      a: "Managed hosting will use a subscription for your application instance. AI usage will use separate top-ups. Prices and any included allowance have not been announced. Self-hosting will use your own infrastructure and provider credentials.",
    },
    {
      q: "Is Bootstrap available today?",
      a: "Bootstrap is in development. These previews show the planned experience. The GitHub repository tracks specifications and implementation progress; hosted access and a self-hosted application release are not available yet.",
    },
  ],
  finalCta: {
    heading: "Make room for the work that matters.",
    body: "Follow Bootstrap as the workspace and agent team take shape.",
    primary: "Follow the build",
    secondary: "Read the product spec",
  },
  footer: {
    text: "Bootstrap · In development",
    sub: "A business workspace, supported by an agent team.",
    links: ["GitHub", "Product spec", "Roadmap"],
  },
} as const;

// Six agent properties — exact labels and copy (landing-page-spec §5).
export const AGENT_PROPERTIES = [
  { id: "instructions", label: "Instructions", copy: "Define responsibilities and expectations." },
  { id: "skills", label: "Skills", copy: "Give the agent repeatable ways to work." },
  { id: "routines", label: "Routines", copy: "Schedule useful work with clear limits." },
  { id: "memories", label: "Memories", copy: "Keep important context visible and editable." },
  { id: "files", label: "Files", copy: "Choose the pages and files it can use." },
  { id: "tables", label: "Tables", copy: "Connect the business data it can maintain." },
] as const;
