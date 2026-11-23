// Structured-data gate: every application/ld+json block in the build must parse,
// carry schema.org @context, use an allowlisted @type, and invent nothing —
// no aggregateRating, no review (S6: real facts only, no ratings).
//   bun scripts/structured-data.ts [--dist <folder>]
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const arg = process.argv.indexOf("--dist");
const dist = resolve(arg > 0 ? process.argv[arg + 1] : "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error(`SD NOT RUN: no build at ${dist}`);
  process.exit(97);
}

const TYPES = new Set([
  "SoftwareApplication", "Organization", "WebSite", "WebPage",
  "BreadcrumbList", "FAQPage", "TechArticle", "Article",
]);
const FORBIDDEN = ["aggregateRating", "review", "reviewCount", "ratingValue"];

function* htmlFiles(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name === "index.html") yield p;
  }
}

let fails = 0;
let blocks = 0;
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, "utf8");
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    blocks++;
    const where = file.replace(dist, "");
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(m[1]);
    } catch {
      console.error(`SD FAIL ${where}: ld+json does not parse`);
      fails++;
      continue;
    }
    const ctx = data["@context"];
    if (typeof ctx !== "string" || !ctx.startsWith("https://schema.org")) {
      console.error(`SD FAIL ${where}: @context is not https://schema.org`);
      fails++;
    }
    const type = data["@type"];
    if (typeof type !== "string" || !TYPES.has(type)) {
      console.error(`SD FAIL ${where}: @type ${JSON.stringify(type)} not in the allowlist`);
      fails++;
    }
    for (const key of FORBIDDEN) {
      if (key in data) {
        console.error(`SD FAIL ${where}: invented field ${key} (no ratings)`);
        fails++;
      }
    }
    if (type === "SoftwareApplication") {
      for (const req of ["name", "applicationCategory", "operatingSystem"]) {
        if (!(req in data)) {
          console.error(`SD FAIL ${where}: SoftwareApplication missing ${req}`);
          fails++;
        }
      }
    }
  }
}

const home = readFileSync(join(dist, "index.html"), "utf8");
if (!home.includes('type="application/ld+json"')) {
  console.error("SD FAIL index.html: no ld+json block (home must carry SoftwareApplication)");
  fails++;
}

console.log(`SD checked ${blocks} block(s), fails=${fails}`);
process.exit(fails ? 1 : 0);
