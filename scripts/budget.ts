// Size budget gate, per built page (gzip, the conservative compression):
//   HTML 50 KB, CSS 50 KB, script 50 KB (100 KB under /docs/), fonts 100 KB in at most 4 files,
//   and no third-party script, stylesheet, font or import.
//   bun scripts/budget.ts [--dist <folder>]
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const arg = process.argv.indexOf("--dist");
const dist = resolve(arg > 0 ? process.argv[arg + 1] : "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error(`BUDGET NOT RUN: no build at ${dist}`);
  process.exit(97);
}

const KB = 1024;
const LIMIT = { html: 50 * KB, css: 50 * KB, js: 50 * KB, jsDocs: 100 * KB, fonts: 100 * KB, fontFiles: 4 };
const gz = (s: string | Buffer) => gzipSync(s, { level: 9 }).length;
const kb = (n: number) => (n / KB).toFixed(1) + " KB";

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== "pagefind" && name !== "_astro") out.push(...htmlFiles(full)); }
    else if (name.endsWith(".html")) out.push(full);
  }
  return out.sort();
}

const external = (url: string) => /^(https?:)?\/\//i.test(url);
const local = (url: string, from: string) => (url.startsWith("/") ? join(dist, url) : join(from, "..", url));

let over = 0;
let thirdParty = 0;
const pages = htmlFiles(dist);
for (const file of pages) {
  const path = "/" + relative(dist, file);
  const html = readFileSync(file, "utf8");
  const problems: string[] = [];

  let css = "";
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) css += m[1];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    if (/stylesheet|preload|modulepreload|preconnect|dns-prefetch/i.test(rel) && external(href)) {
      problems.push(`third-party ${rel}: ${href}`); thirdParty++; continue;
    }
    if (/stylesheet/i.test(rel)) css += readFileSync(local(href, file), "utf8");
  }

  let js = "";
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = /src=["']([^"']+)["']/i.exec(m[1])?.[1];
    if (src) {
      if (external(src)) { problems.push(`third-party script: ${src}`); thirdParty++; continue; }
      js += readFileSync(local(src, file), "utf8");
    } else js += m[2];
  }
  for (const m of html.matchAll(/<link\b[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+)["']/gi)) {
    if (!external(m[1])) js += readFileSync(local(m[1], file), "utf8");
  }

  const fonts = new Set<string>();
  for (const m of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/gi)) {
    if (external(m[1])) { problems.push(`third-party @import: ${m[1]}`); thirdParty++; }
  }
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const url = m[1];
    if (url.startsWith("data:")) continue;
    if (external(url)) { problems.push(`third-party url(): ${url}`); thirdParty++; continue; }
    if (/\.(woff2?|ttf|otf)(\?|#|$)/i.test(url)) fonts.add(url.split(/[?#]/)[0]);
  }
  if (/fonts\.(googleapis|gstatic)\.com/i.test(html + css)) { problems.push("Google Fonts reference"); thirdParty++; }

  let fontBytes = 0;
  for (const f of fonts) fontBytes += statSync(join(dist, f)).size;

  const sizes = { html: gz(html), css: css ? gz(css) : 0, js: js ? gz(js) : 0 };
  const jsLimit = path.startsWith("/docs/") ? LIMIT.jsDocs : LIMIT.js;
  if (sizes.html > LIMIT.html) problems.push(`HTML ${kb(sizes.html)} > ${kb(LIMIT.html)}`);
  if (sizes.css > LIMIT.css) problems.push(`CSS ${kb(sizes.css)} > ${kb(LIMIT.css)}`);
  if (sizes.js > jsLimit) problems.push(`script ${kb(sizes.js)} > ${kb(jsLimit)}`);
  if (fontBytes > LIMIT.fonts) problems.push(`fonts ${kb(fontBytes)} > ${kb(LIMIT.fonts)}`);
  if (fonts.size > LIMIT.fontFiles) problems.push(`${fonts.size} font files > ${LIMIT.fontFiles}`);

  console.log(`${path}  html ${kb(sizes.html)}  css ${kb(sizes.css)}  script ${kb(sizes.js)}  fonts ${kb(fontBytes)} in ${fonts.size} file(s)`);
  for (const p of problems) console.log("  OVER " + p);
  if (problems.length) over++;
}
console.log(`BUDGET pages=${pages.length} over=${over} third_party=${thirdParty}`);
process.exit(over > 0 ? 1 : 0);
