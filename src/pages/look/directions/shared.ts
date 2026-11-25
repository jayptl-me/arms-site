export const trace = [
  { harness: "demo-agent", call: "gmail.list_threads", verdict: "ALLOWED", ms: "84" },
  { harness: "demo-agent", call: "github.create_pull_request", verdict: "DENIED_HARNESS_TOOL", ms: "—" },
  { harness: "demo-agent", call: "plane.create_work_item", verdict: "ALLOWED", ms: "121" },
  { harness: "demo-agent", call: "slack.post_message", verdict: "RATE_LIMITED_RPS", ms: "—" },
  { harness: "demo-agent", call: "arms.get_status", verdict: "ALLOWED", ms: "3" },
  { harness: "demo-agent", call: "github.list_workflow_runs", verdict: "ALLOWED", ms: "97" },
] as const;

export const connectors = [
  { name: "Gmail", body: "Search, read, labels, archive, drafts, and send, with your own Google client.", scope: "mail" },
  { name: "GitHub", body: "Repositories, pull requests, issues, and workflows.", scope: "code" },
  { name: "Plane", body: "Project work the agent can open from Plane.", scope: "work" },
  { name: "Slack", body: "Channels, messages, and threads.", scope: "chat" },
  { name: "Postgres", body: "Schema, SQL, and table inspection.", scope: "data" },
  { name: "Docker", body: "Containers, images, and logs.", scope: "runtime" },
] as const;

export const metrics = [
  { label: "native connectors", value: "12", note: "product inventory" },
  { label: "named harnesses", value: "5", note: "clients ARMS speaks to" },
  { label: "policy decision", value: "per call", note: "on the way out" },
] as const;

export const verdictClass = (verdict: string) =>
  verdict === "ALLOWED" ? "ok" : verdict === "RATE_LIMITED_RPS" ? "warn" : "no";

export const formatMs = (ms: string) => (ms === "—" ? "—" : `${ms} ms`);
