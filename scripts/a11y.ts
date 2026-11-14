// Accessibility gate: every built page, light and dark, desktop and 320 px wide (menu closed and open),
// checked with axe-core in headless Chromium. Fails on any violation of WCAG 2.0 to 2.2 A and AA rules.
// Also checks the shell: skip link first, aria-current on the page link, the theme switch, the menu disclosure.
//   bun scripts/a11y.ts [--dist <folder>]
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, relative, resolve, extname } from "node:path";
import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const arg = process.argv.indexOf("--dist");
const dist = resolve(arg > 0 ? process.argv[arg + 1] : "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error(`A11Y NOT RUN: no build at ${dist}`);
  process.exit(97);
}

function pages(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "pagefind" && name !== "_astro") out.push(...pages(full));
    } else if (name === "index.html") {
      const rel = relative(dist, dir);
      out.push(rel === "" ? "/" : "/" + rel.split("\\").join("/") + "/");
    }
  }
  return out.sort();
}

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain",
};
const server = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  fetch(req) {
    let path = decodeURIComponent(new URL(req.url).pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = resolve(join(dist, path));
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
      const alt = join(dist, path, "index.html");
      if (existsSync(alt)) return new Response(readFileSync(alt), { headers: { "content-type": types[".html"] } });
      return new Response("not found", { status: 404 });
    }
    return new Response(readFileSync(file), { headers: { "content-type": types[extname(file)] ?? "application/octet-stream" } });
  },
});
const base = `http://127.0.0.1:${server.port}`;

// Lightness 0..1 of a computed colour: oklch(L ...) as Chromium reports it, or rgb() as a fallback.
function lightness(color: string): number | null {
  const ok = /oklch\(\s*([\d.]+)(%?)/.exec(color);
  if (ok) return ok[2] ? Number(ok[1]) / 100 : Number(ok[1]);
  const rgb = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(color);
  if (rgb) return (0.2126 * Number(rgb[1]) + 0.7152 * Number(rgb[2]) + 0.0722 * Number(rgb[3])) / 255;
  return null;
}

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
let violations = 0;
let runs = 0;
let shellFails = 0;
const fail = (msg: string) => { shellFails++; console.log("SHELL FAIL " + msg); };

async function axe(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  runs++;
  for (const v of result.violations) {
    violations += v.nodes.length;
    console.log(`VIOLATION ${label} ${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) console.log("   at " + n.target.join(" "));
  }
}

const browser = await chromium.launch();
try {
  const list = pages(dist);
  for (const path of list) {
    for (const scheme of ["light", "dark"] as const) {
      for (const [vw, vh] of [[1280, 800], [320, 640]] as const) {
        const context = await browser.newContext({ colorScheme: scheme, viewport: { width: vw, height: vh } });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
        const res = await page.goto(base + path, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const label = `${path} ${scheme} ${vw}px`;
        if (!res || res.status() !== 200) fail(`${label}: status ${res?.status()}`);
        const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        if (lightness(bg) === null || (scheme === "dark") !== (lightness(bg)! < 0.5)) fail(`${label}: page background "${bg}" does not match the ${scheme} theme`);
        await axe(page, label);

        // Skip link is the first thing a keyboard reaches, and it moves focus to the main region.
        await page.keyboard.press("Tab");
        const first = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.className ?? "");
        if (!first.includes("skip-link")) fail(`${label}: first tab stop is "${first}", not the skip link`);
        await page.keyboard.press("Enter");
        const focused = await page.evaluate(() => document.activeElement?.id ?? "");
        if (focused !== "content") fail(`${label}: skip link did not move focus to #content (got "${focused}")`);

        if (vw === 320) {
          const toggle = page.locator(".site-nav__toggle");
          if (!(await toggle.isVisible())) fail(`${label}: menu button not shown on a narrow screen`);
          else {
            await toggle.click();
            if ((await toggle.getAttribute("aria-expanded")) !== "true") fail(`${label}: menu did not open`);
            if (!(await page.locator("#site-nav-list a").first().isVisible())) fail(`${label}: menu links hidden after opening`);
            await axe(page, label + " menu-open");
            await page.keyboard.press("Escape");
            if ((await toggle.getAttribute("aria-expanded")) !== "false") fail(`${label}: Escape did not close the menu`);
          }
        }
        if (errors.length) fail(`${label}: console or page errors: ${errors.join(" | ")}`);
        await context.close();
      }
    }

    // aria-current marks the current page in the header.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base + path);
    const current = await page.locator('.site-header [aria-current="page"]').count();
    if (current !== 1) fail(`${path}: ${current} header links carry aria-current="page"`);
    await context.close();
  }

  // Theme switch: a stored choice wins over the system and keeps color-scheme in step; System clears it.
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(base + "/");
  await page.selectOption("#theme-choice", "dark");
  await page.reload();
  const forced = await page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.documentElement).colorScheme]);
  if (forced[0] !== "dark" || forced[1] !== "dark") fail(`theme switch: stored dark gave ${JSON.stringify(forced)}`);
  if ((await page.inputValue("#theme-choice")) !== "dark") fail("theme switch: select does not show the stored choice");
  await axe(page, "/ forced-dark");
  await page.selectOption("#theme-choice", "system");
  await page.reload();
  const back = await page.evaluate(() => [document.documentElement.dataset.theme ?? "", getComputedStyle(document.documentElement).colorScheme]);
  if (back[0] !== "" || !back[1].includes("light")) fail(`theme switch: System gave ${JSON.stringify(back)}`);
  await context.close();

  console.log(`A11Y pages=${list.length} axe_runs=${runs} violations=${violations} shell_fails=${shellFails}`);
} finally {
  await browser.close();
  server.stop(true);
}
process.exit(violations + shellFails > 0 ? 1 : 0);
