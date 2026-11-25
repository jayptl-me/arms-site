import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.html");
const html = readFileSync(file, "utf8");

function need(phrase: string, label = phrase) {
  if (!html.includes(phrase)) {
    console.error("signal home missing: " + label);
    process.exit(1);
  }
}

function ban(phrase: string, label = phrase) {
  if (html.includes(phrase)) {
    console.error("signal home carries banned marker: " + label);
    process.exit(1);
  }
}

need('data-direction="signal-objects"');
need('class="signal-page"');
need("/console-proof/dark-overview-tabs.webp");
need("/console-proof/light-overview-tabs.webp");
need("Real ARMS console preview");
need('aria-label="policy filter"');
need('data-filter="DENIED_HARNESS_TOOL"');
need("Connection map.");
need("Encrypted vault.");
need("Gmail");
need("GitHub");
need("Docker");
need("Every call keeps its verdict.");
need("Named tools, no decoration.");
need("ss-button--primary");
need('href="https://github.com/Whyknot-live/ARMS"');

for (const marker of [
  "journey-run",
  "capsule__",
  "Compare with B",
  "Compare with C",
  "Why this direction exists",
  "/look/directions/signal-objects/",
  "Direction A · raw-and-bold",
]) {
  ban(marker);
}

const connectorCards = html.match(/class="signal-connector-card"/g) ?? [];
if (connectorCards.length !== 12) {
  console.error(`signal home connector cards: got ${connectorCards.length}, want 12`);
  process.exit(1);
}

const filterScript = html.includes('document.querySelectorAll("[data-filter]")') || html.includes("document.querySelectorAll('[data-filter]')");
if (!filterScript) {
  console.error("signal home filter script missing");
  process.exit(1);
}

console.log("signal home direction: present");
