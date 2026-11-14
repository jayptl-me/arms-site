import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(dirname(fileURLToPath(import.meta.url)), "..", "public/index.html");
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

console.log("headline: " + headline);
console.log("sentence: " + sentence);
console.log("action: " + action);
