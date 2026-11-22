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
for (const phrase of ["Claude Code", "Connection map.", "GitHub", "Gmail", "Encrypted vault."]) {
  if (!html.includes(phrase)) {
    console.error("product claim missing: " + phrase);
    process.exit(1);
  }
}
if (!html.includes('href="/privacy"') || !html.includes('href="/terms"')) {
  console.error("legal links missing");
  process.exit(1);
}

if (!html.includes('rel="canonical" href="https://arms.whyknot.live/"')) {
  console.error("canonical link missing on home");
  process.exit(1);
}

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const robots = readFileSync(join(dist, "robots.txt"), "utf8");
if (!robots.includes("User-agent: *") || !robots.includes("Disallow: /look/")) {
  console.error("robots.txt missing or preview routes crawlable");
  process.exit(1);
}

const sitemap = readFileSync(join(dist, "sitemap-0.xml"), "utf8");
if (!sitemap.includes("<loc>https://arms.whyknot.live/</loc>") || sitemap.includes("/look/") || sitemap.includes("/parts")) {
  console.error("sitemap missing home or leaks preview routes");
  process.exit(1);
}

const securityTxt = readFileSync(join(dist, ".well-known/security.txt"), "utf8");
if (!securityTxt.includes("Contact:") || !securityTxt.includes("Expires:")) {
  console.error("security.txt missing or lacks Contact/Expires");
  process.exit(1);
}

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
