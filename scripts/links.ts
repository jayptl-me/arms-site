// Link check gate: every href/src/action in the build resolves —
// internal paths must exist in dist, in-page anchors must exist on their page,
// external http(s) links must answer below 400 (HEAD, then GET if HEAD is refused).
//   bun scripts/links.ts [--dist <folder>] [--no-external]
import { readdirSync, existsSync, statSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argi = (n: string) => process.argv.indexOf(n);
const dist = resolve(argi("--dist") > 0 ? process.argv[argi("--dist") + 1] : "dist");
const noExternal = argi("--no-external") > 0;
// Same-origin-as-site URLs (canonical, sitemap, og) are checked against the
// build, not the live host — the deploy is what makes them resolve.
let siteOrigin = "";
try {
  const astroCfg = readFileSync(join(dist, "../astro.config.mjs"), "utf8");
  siteOrigin = astroCfg.match(/site:\s*"([^"]+)"/)?.[1]?.replace(/\/+$/, "") ?? "";
} catch { /* dist copies for negative controls have no config sibling */ }
if (!existsSync(join(dist, "index.html"))) {
  console.error(`LINKS NOT RUN: no build at ${dist}`);
  process.exit(97);
}

function* htmlFiles(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

const ATTR = /(?:href|src|action)="([^"]+)"/g;
const externals = new Set<string>();
const anchors: { file: string; id: string }[] = [];
let fails = 0;

function internalPathExists(url: string): boolean {
  const clean = url.split(/[?#]/)[0].replace(/^\/+/, "");
  if (!clean) return true; // "/"
  const p = join(dist, clean);
  return existsSync(p) || existsSync(join(p, "index.html")) || (statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false);
}

const pages = [...htmlFiles(dist)];
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  for (const idm of html.matchAll(/id="([^"]+)"/g)) anchors.push({ file, id: idm[1] });
  for (const m of html.matchAll(ATTR)) {
    const url = m[1].trim();
    const where = file.replace(dist, "");
    if (/^(mailto:|tel:|data:|javascript:)/.test(url)) continue;
    if (url.startsWith("#")) {
      if (!html.includes(`id="${url.slice(1)}"`)) {
        console.error(`LINK FAIL ${where}: missing anchor ${url}`);
        fails++;
      }
      continue;
    }
    if (/^https?:\/\//.test(url)) {
      if (siteOrigin && url.startsWith(siteOrigin + "/")) {
        if (!internalPathExists(url.slice(siteOrigin.length))) {
          console.error(`LINK FAIL ${where}: site URL ${url} has no file in the build`);
          fails++;
        }
        continue;
      }
      externals.add(url); continue;
    }
    if (url.startsWith("//")) { externals.add("https:" + url); continue; }
    if (url.startsWith("/")) {
      if (!internalPathExists(url)) {
        console.error(`LINK FAIL ${where}: internal ${url} has no file`);
        fails++;
      }
      continue;
    }
    // relative link — resolve against the page's directory
    const rel = join(file, "..", url).replace(dist, "/");
    if (!internalPathExists(rel)) {
      console.error(`LINK FAIL ${where}: relative ${url} has no file`);
      fails++;
    }
  }
}

// in-page anchors named by other pages' /path#id links
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(/(?:href|src)="(\/[^"?#]*)#([^"]+)"/g)) {
    const [_, path, id] = m;
    const target = join(dist, path, "index.html");
    const t = existsSync(target) ? target : join(dist, path);
    const thtml = existsSync(t) ? readFileSync(t, "utf8") : "";
    if (!thtml.includes(`id="${id}"`)) {
      console.error(`LINK FAIL ${file.replace(dist, "")}: ${path}#${id} anchor missing on target`);
      fails++;
    }
  }
}

if (!noExternal) {
  for (const url of externals) {
    let ok = false;
    try {
      let r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(10000) });
      if (r.status === 405 || r.status === 501) r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10000) });
      ok = r.status < 400;
      if (!ok) console.error(`LINK FAIL external ${url}: HTTP ${r.status}`);
    } catch (e) {
      console.error(`LINK FAIL external ${url}: ${e instanceof Error ? e.message : e}`);
    }
    if (!ok) fails++;
  }
}

console.log(`LINKS pages=${pages.length} externals=${externals.size} fails=${fails}`);
process.exit(fails ? 1 : 0);
