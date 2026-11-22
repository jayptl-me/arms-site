/** Facts taken from the ARMS product. No added counts, prices, quotes, or logos. */
export const claims = {
  headline: "One gateway for your agents",
  lead: "A local control plane for the tools they call.",
  opening:
    "ARMS runs on your machine and routes coding agents to the services you already use, with a policy decision on the way out.",
  harnessLead: "Speaks to the agents you already run.",
  harnesses: ["Claude Code", "Cursor", "Windsurf", "OpenCode", "Claude Desktop"],
  does: [
    {
      title: "One router.",
      body: "Plane, GitHub, GitLab, Slack, Postgres, Gmail, S3, Docker, and community tool servers share this gateway.",
    },
    {
      title: "Policy per agent.",
      body: "Turn a connector, or one tool inside it, on or off for a single harness or for every harness.",
    },
    {
      title: "A map of the calls.",
      body: "See which harness may reach which tool, and read the verdict in the policy audit.",
    },
  ],
  plane: [
    {
      title: "Harnesses.",
      body: "Clients on stdio, HTTP, and SSE appear as they connect. You do not type a client id.",
    },
    {
      title: "Inventory.",
      body: "Native connectors and the community servers you register stay listed across restarts.",
    },
    {
      title: "Connection map.",
      body: "Each cell is a harness, a tool, the transport, and whether policy allows the call.",
    },
  ],
  decisions: [
    {
      title: "Approvals.",
      body: "A queued tool call or trust decision waits for a yes or a no, and the reviewer is recorded.",
    },
    {
      title: "Read-only mode.",
      body: "A harness can be barred from create, update, and delete calls. The block is written to the audit.",
    },
    {
      title: "From the chat.",
      body: "A connected agent can ask for status, switch a connector, or set a harness policy.",
    },
  ],
  connectors: [
    { name: "Gmail", body: "Search, read, labels, archive, drafts, and send, with your own Google client." },
    { name: "GitHub", body: "Repositories, pull requests, issues, and workflows." },
    { name: "GitLab", body: "Projects, issues, merge requests, and files." },
    { name: "Plane", body: "Project work the agent can open from Plane." },
    { name: "Jira", body: "Search, issues, transitions, and comments." },
    { name: "Linear", body: "Issues, projects, teams, and cycles." },
    { name: "Notion", body: "Pages, databases, and comments." },
    { name: "Slack", body: "Channels, messages, and threads." },
    { name: "Postgres", body: "Schema, SQL, and table inspection." },
    { name: "Redis", body: "Strings, hashes, keys, and cache stats." },
    { name: "S3", body: "Buckets, objects, and metadata." },
    { name: "Docker", body: "Containers, images, and logs." },
  ],
  local: [
    {
      title: "Community servers.",
      body: "Register an npx or uvx tool server and ARMS runs it under a namespace you name.",
    },
    {
      title: "Encrypted vault.",
      body: "API keys and tokens are stored with AES-GCM. The vault key stays with you.",
    },
    {
      title: "On this machine.",
      body: "Diagnostics, rate limits, cache, telemetry, and alerts live in the local control plane.",
    },
  ],
  action: {
    label: "Open an issue",
    href: "https://github.com/jayptl-me/arms-site/issues",
  },
  operator: "Operated by Jay Patel",
} as const;
