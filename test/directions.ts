import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const round = join(dist, "look", "directions");

function read(path: string, label: string): string {
  const file = join(round, path);
  if (!existsSync(file)) {
    console.error("missing coded direction output: " + label);
    process.exit(1);
  }
  return readFileSync(file, "utf8");
}

const index = read("index.html", "round index");
for (const phrase of [
  "real running coded options",
  "Signal objects",
  "Clay observatory",
  "Spectrum console",
  "scored taste corpus",
]) {
  if (!index.includes(phrase)) {
    console.error("round index missing: " + phrase);
    process.exit(1);
  }
}
if (!index.includes('name="robots" content="noindex, nofollow"')) {
  console.error("round index is crawlable");
  process.exit(1);
}

const pages = [
  ["signal-objects", "data-direction=\"signal-objects\"", "policy filter"],
  ["clay-observatory", "data-direction=\"clay-observatory\"", "connector picker"],
  ["spectrum-console", "data-direction=\"spectrum-console\"", "console tabs"],
] as const;

for (const [slug, marker, interaction] of pages) {
  const html = read(`${slug}/index.html`, slug);
  for (const phrase of [
    marker,
    interaction,
    "/console-proof/dark-overview-tabs.webp",
    "/console-proof/light-overview-tabs.webp",
    "Real ARMS console preview",
    "prefers-reduced-motion",
  ]) {
    if (!html.includes(phrase)) {
      console.error(`${slug} missing: ${phrase}`);
      process.exit(1);
    }
  }
  for (const banned of ["journey-run", "capsule__", "lucide", "Product Hunt style", "Cloudflare style"]) {
    if (html.includes(banned)) {
      console.error(`${slug} carries banned/rejected marker: ${banned}`);
      process.exit(1);
    }
  }
}

console.log("direction round coded pages: 3/3");
