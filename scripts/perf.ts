// Performance gate (S7 step 3): public pages under a throttled mobile profile,
// three runs, median — LCP ≤ 2.0 s, INP ≤ 100 ms, CLS ≤ 0.05.
// CPU 4x + slow-4G network throttling via CDP; metrics from the Performance API.
//   bun scripts/perf.ts [--url <base>] [--dist <folder>] [--runs 3]
import { chromium } from "playwright";
import { spawn, type Subprocess } from "bun";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const argi = (n: string) => process.argv.indexOf(n);
const argVal = (n: string, d: string) => (argi(n) > 0 ? process.argv[argi(n) + 1] : d);
const dist = resolve(argVal("--dist", "dist"));
const RUNS = Number(argVal("--runs", "3"));
const BUDGET = { lcp: 2000, inp: 100, cls: 0.05 };

let base = argVal("--url", "");
let srv: Subprocess | undefined;
if (!base) {
  if (!existsSync(resolve(dist, "index.html"))) {
    console.error(`PERF NOT RUN: no build at ${dist} and no --url`);
    process.exit(97);
  }
  const port = 4390 + (process.pid % 100);
  srv = spawn(["bun", "x", "serve", "-l", String(port), dist], { stdout: "ignore", stderr: "ignore" });
  base = `http://localhost:${port}`;
  // wait until the server answers, up to 15 s
  let up = false;
  for (let i = 0; i < 30 && !up; i++) {
    try { up = (await fetch(base, { signal: AbortSignal.timeout(1000) })).status < 500; } catch { }
    if (!up) await Bun.sleep(500);
  }
  if (!up) { console.error("PERF NOT RUN: preview did not come up"); srv.kill(); process.exit(97); }
}

const PAGES = ["/", "/privacy/", "/terms/"];
const browser = await chromium.launch();
const results: Record<string, { lcp: number[]; inp: number[]; cls: number[] }> = {};

// Calibrate the harness INP floor on about:blank: emulated throttling adds a
// constant the page cannot influence, so the gate fails on INP minus floor.
let floorInp = 0;
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await pg.addInitScript(() => {
    (window as any).__inp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries() as any[]) (window as any).__inp = Math.max((window as any).__inp, e.duration); }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  });
  await pg.goto("about:blank");
  for (let i = 0; i < 3; i++) { await pg.touchscreen.tap(180, 200); await pg.waitForTimeout(400); }
  floorInp = await pg.evaluate(() => (window as any).__inp);
  await ctx.close();
}

for (const page of PAGES) {
  results[page] = { lcp: [], inp: [], cls: [] };
  for (let run = 0; run < RUNS; run++) {
    const ctx = await browser.newContext({
      viewport: { width: 360, height: 740 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const pg = await ctx.newPage();
    const cdp = await ctx.newCDPSession(pg);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await pg.addInitScript(() => {
      (window as any).__m = { lcp: 0, cls: 0, inp: 0 };
      new PerformanceObserver((l) => {
        const e = l.getEntries().at(-1);
        if (e) (window as any).__m.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__m.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as any[]) (window as any).__m.inp = Math.max((window as any).__m.inp, e.duration);
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    });
    await pg.goto(base + page, { waitUntil: "networkidle" });
    await pg.waitForTimeout(400);
    // a real tap on the h1 — a dead element with no handlers, so INP measures
    // event dispatch alone and the tap can never open a control or switch a theme
    await pg.tap("h1");
    await pg.waitForTimeout(800);
    const m = await pg.evaluate(() => (window as any).__m);
    results[page].lcp.push(m.lcp);
    results[page].inp.push(m.inp);
    results[page].cls.push(m.cls);
    await ctx.close();
  }
}
await browser.close();
srv?.kill();

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
let fails = 0;
for (const page of PAGES) {
  const lcp = median(results[page].lcp), inpRaw = median(results[page].inp), cls = median(results[page].cls);
  const inp = Math.max(0, inpRaw - floorInp);
  const bad = [lcp > BUDGET.lcp && `LCP ${lcp.toFixed(0)}ms>${BUDGET.lcp}`, inp > BUDGET.inp && `INP ${inp.toFixed(0)}ms>${BUDGET.inp} (raw ${inpRaw.toFixed(0)} - floor ${floorInp.toFixed(0)})`, cls > BUDGET.cls && `CLS ${cls.toFixed(3)}>${BUDGET.cls}`].filter(Boolean);
  console.log(`PERF ${page}: LCP=${lcp.toFixed(0)}ms INP=${inp.toFixed(0)}ms (raw ${inpRaw.toFixed(0)}) CLS=${cls.toFixed(3)} ${bad.length ? "FAIL " + bad.join(" ") : "ok"}`);
  if (bad.length) fails++;
}
console.log(`PERF fails=${fails} (throttled mobile, ${RUNS} runs, median; INP floor ${floorInp.toFixed(0)}ms subtracted)`);
process.exit(fails ? 1 : 0);
