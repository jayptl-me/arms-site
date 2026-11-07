/** Claims taken from the live page. No added numbers, quotes, or logos. */
export const claims = {
  headline: "A local-first agent gateway",
  lead: "Open-source tools for agents, on your machine.",
  opening:
    "A local-first, open-source gateway that gives your AI agents real tools, starting with a native Gmail connector: read, search, organize, draft, and send, all approval-gated and running on your own machine or your own cloud accounts.",
  points: [
    {
      title: "Bring your own Google OAuth.",
      body: "No shared app, no pooled quota, no third party in your mail path.",
    },
    {
      title: "Approval-gated by design.",
      body: "Reads run freely; every send, draft, label change, archive, and trash waits for your explicit yes.",
    },
    {
      title: "Your data stays yours.",
      body: "Encrypted local vault plus databases you own (MongoDB Atlas / Aiven). Nothing phones home.",
    },
  ],
  action: {
    label: "Contact",
    href: "mailto:jayptl0919@gmail.com",
  },
  operator: "Operated by Jay Patel",
} as const;
