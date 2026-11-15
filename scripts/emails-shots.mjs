#!/usr/bin/env node
/**
 * The browser half of the fast email check. For every .html file under a
 * folder, in ONE browser launch: loads it at 320, 390 and 600 wide (real
 * emulated viewports, not window sizes), fails on sideways scroll or any
 * visible text under 13px, and saves a phone shot (390, full length) beside it.
 *
 *   node scripts/emails-shots.mjs <folder> [--no-shots]
 *
 * It is the quick stand-in for the full 17-size page check, which loads each
 * render at every size and takes minutes. Run that once at the end of a change;
 * run this on every edit.
 */
import { readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "docs/design/email/final");
const shots = !process.argv.includes("--no-shots");

const require = createRequire(join(homedir(), "Claude/_tools/web-kit/package.json"));
const { chromium } = require("playwright");

function walk(d) {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });
}

const files = walk(dir);
const browser = await chromium.launch();
const failures = [];
const started = Date.now();

for (const file of files) {
  for (const width of [320, 390, 600]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width === 390 && shots ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto(`file://${file}`, { waitUntil: "load" });
    const r = await page.evaluate(() => {
      const small = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || el.closest("[style*='display:none']")) continue;
        const px = parseFloat(cs.fontSize);
        if (px < 13) small.push(`${px}px "${n.textContent.trim().slice(0, 30)}"`);
      }
      return { overflow: document.documentElement.scrollWidth - window.innerWidth, small };
    });
    const rel = file.slice(dir.length + 1);
    if (r.overflow > 0) failures.push(`${rel} @${width}: sideways scroll ${r.overflow}px`);
    if (r.small.length) failures.push(`${rel} @${width}: text under 13px: ${r.small.slice(0, 3).join("; ")}`);
    if (width === 390 && shots) await page.screenshot({ path: file.replace(/\.html$/, "-390.png"), fullPage: true });
    await ctx.close();
  }
}
await browser.close();

const secs = ((Date.now() - started) / 1000).toFixed(1);
if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`FAIL: ${failures.length} problem(s) in ${files.length} emails (${secs}s)`);
  process.exit(1);
}
console.log(`PASS: ${files.length} emails at 320, 390 and 600 wide: no sideways scroll, no text under 13px (${secs}s)`);
