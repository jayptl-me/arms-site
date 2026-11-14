import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(dirname(fileURLToPath(import.meta.url)), "..", "dist/index.html");
const html = readFileSync(file, "utf8");

function text(pattern: RegExp, label: string): string {
  const match = pattern.exec(html);
  if (!match) {
    console.error("missing " + label);
    process.exit(1);
  }
  return match[1].replace(/\s+/g, " ").trim();
}

const headline = text(/<h1>([^<]+)<\/h1>/, "headline");
const sentence = text(/<p class="lead">([^<]+)<\/p>/, "sentence");
const action = text(
  /<a class="ss-button[^"]*ss-button--primary[^"]*" href="mailto:jayptl0919@gmail.com"[^>]*>\s*<span class="ss-button__label">([^<]*)<\/span>/,
  "action",
);

if (!html.includes("ss-button--primary")) {
  console.error("primary control is not the UIFoundry button");
  process.exit(1);
}
if (!html.includes("native Gmail connector: read, search, organize, draft, and send")) {
  console.error("gmail claim missing");
  process.exit(1);
}
if (!html.includes('href="/privacy"') || !html.includes('href="/terms"')) {
  console.error("legal links missing");
  process.exit(1);
}

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
for (const [page, heading] of [
  ["privacy", "ARMS Gmail — Privacy Policy"],
  ["terms", "ARMS — Terms of Service"],
] as const) {
  const legal = readFileSync(join(dist, page, "index.html"), "utf8");
  if (!legal.includes("<h1>" + heading + "</h1>") || !legal.includes('id="content"')) {
    console.error(page + " page missing its heading or the shell");
    process.exit(1);
  }
}

console.log("headline: " + headline);
console.log("sentence: " + sentence);
console.log("action: " + action);
