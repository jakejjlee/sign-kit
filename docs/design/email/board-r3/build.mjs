// Round 3 email board: renders every option's four emails from code, lints each with the core's
// lintSignerEmail, shoots each at 390 (Gmail reading: no <style>, no <link>, no classes) and at
// 600 (Apple Mail reading, web fonts on), and writes the board page.
//   node build.mjs            render, lint, shoot, write index.html
//   node build.mjs --no-shots render and lint only
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BRANDS, complete, operator, receipt, waiting } from "./data.mjs";
import * as d0 from "./dirs/d0.mjs";
import * as d0p from "./dirs/d0p.mjs";
import * as d1 from "./dirs/d1.mjs";
import * as d2 from "./dirs/d2.mjs";
import * as d3 from "./dirs/d3.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const core = await import(pathToFileURL(path.resolve(HERE, "../../../../src/lib/signer-email-core.ts")).href);
const OUT = path.join(HERE, "renders");
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

export const OPTIONS = [
  { id: "d0", n: "0", name: "Live", mod: d0, live: true,
    premise: "What goes out today: the Specimen with the notify.ts model, a bare inline alert, and the web-kit guest receipt (built, switched off).",
    legit: "Reads as a tool notice: white logo box on gray, Georgia, a headline with no name, the alert is four loose lines." },
  { id: "d0p", n: "0+", name: "The Specimen, done properly", mod: d0p,
    premise: "The same skeleton (tinted ground, centered logo, one sentence, one button, the lease drawn as a sheet), with every floor item met.",
    legit: "The sheet now carries the term, the fingerprint and the signature lines in the lease's own order and roles." },
  { id: "d1", n: "1", name: "The Counterpart", mod: d1,
    premise: "A dated letter on the business's paper with a Re line, and the lease's signature page (section 24) reproduced as it reads on the PDF.",
    legit: "How a law firm sends an executed counterpart: dated, referenced, the signatures exactly as signed, the fingerprint in the footer." },
  { id: "d2", n: "2", name: "The Certificate", mod: d2,
    premise: "A white card with one status line, every signer with their status and time, the attachment as a file row, document details underneath.",
    legit: "How DocuSign and Dropbox Sign prove completion and Stripe proves a receipt: an audit list and a document ID." },
  { id: "d3", n: "3", name: "The Notice", mod: d3,
    premise: "A formal notice with the signing time set large, the particulars as a ruled ledger, and a box that tells the reader how to check it is genuine.",
    legit: "How a private bank writes a notice: one fact large, every particular ruled, and a way to verify the sender that asks nothing of you." },
];
export const SURFACES = [
  { id: "waiting", label: "1. Signer, waiting on another signer", who: "Michael Donovan's copy, 2:00 PM EST. Victoria has not signed.", run: (o) => (o.live ? o.mod.signer(waiting) : o.mod.signer(waiting, BRANDS.ohh)) },
  { id: "complete", label: "2. Fully signed, PDF attached", who: "Everyone's copy (Victoria's shown), 2:02 PM EST.", run: (o) => (o.live ? o.mod.signer({ ...complete, attached: true }) : o.mod.signer(complete, BRANDS.ohh)) },
  { id: "operator", label: "3. Alert to the business inbox", who: "hello@ownerhostedhomes.com: Victoria Donovan signed, everyone has signed.", run: (o) => (o.live ? o.mod.operator(operator) : o.mod.operator(operator, BRANDS.ohh)) },
  { id: "receipt", label: "4. Inquiry receipt", who: "A monthly-stay inquiry. SAMPLE answers (fictional, for the board only): Dana Whitfield, Feb 1 to Mar 3, 2027.", run: (o) => (o.live ? o.mod.receipt(receipt) : o.mod.receipt(receipt, BRANDS.ohh)) },
];

const LOGO_URL = BRANDS.ohh.logo.src;
const preview = (html) => html.split(LOGO_URL).join("../assets/ohh-lockup-ink@3x.png");
/** What Gmail (web and the iPhone app) does to the markup: the <style> and <link> go, classes go. */
// Web faces never reach Gmail; this Mac has some installed, so they are dropped from the stacks
// here too, or the phone shot would show faces an iPhone does not have.
const WEB_FACES = /(?:'Great Vibes'|Literata|Jost|Newsreader|'Instrument Sans'|'EB Garamond'|Sentient|Switzer|Cinzel),/g;
const gmail = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<link\b[^>]*>/gi, "").replace(/\sclass="[^"]*"/gi, "").replace(WEB_FACES, "");

const lint = {};
const meta = {};
for (const o of OPTIONS) {
  for (const s of SURFACES) {
    const e = s.run(o);
    const key = `${o.id}-${s.id}`;
    fs.writeFileSync(path.join(OUT, `${key}.html`), preview(e.html));
    fs.writeFileSync(path.join(OUT, `${key}.gmail.html`), preview(gmail(e.html)));
    fs.writeFileSync(path.join(OUT, `${key}.txt`), `Subject: ${e.subject}\n\n${e.text}\n`);
    lint[key] = core.lintSignerEmail(e);
    meta[key] = { subject: e.subject, bytes: Buffer.byteLength(e.html) };
  }
}
// One core serves five brands: every new option renders every brand (no logo: the live wordmark path).
const brandLint = {};
for (const o of OPTIONS.filter((x) => !x.live)) {
  for (const [k, b] of Object.entries(BRANDS)) {
    const bb = k === "ohh" ? b : { ...b, logo: undefined };
    for (const [sid, e] of [["waiting", o.mod.signer(waiting, bb)], ["complete", o.mod.signer(complete, bb)], ["operator", o.mod.operator(operator, bb)], ["receipt", o.mod.receipt(receipt, bb)]]) {
      const p = core.lintSignerEmail(e);
      if (p.length) brandLint[`${o.id}-${k}-${sid}`] = p;
    }
  }
}
fs.writeFileSync(path.join(HERE, "lint.json"), JSON.stringify({ board: lint, otherBrands: brandLint, meta }, null, 2));
const fails = Object.entries(lint).filter(([, v]) => v.length);
console.log(`lint: ${Object.keys(lint).length - fails.length} of ${Object.keys(lint).length} board renders clean; other-brand renders with problems: ${Object.keys(brandLint).length}`);
for (const [k, v] of fails) console.log(`  ${k}: ${v.join("; ")}`);
for (const [k, v] of Object.entries(brandLint)) console.log(`  ${k}: ${v.join("; ")}`);

/* ---------------------------------------------------------------- shots -- */
const CHROME = process.env.CHROME_PATH || path.join(process.env.HOME, ".claude/bin/chrome-headless");
function shoot(file, width, png) {
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", "--virtual-time-budget=8000", `--window-size=${width},3600`, `--screenshot=${png}`, pathToFileURL(file).href], { stdio: "ignore" });
}
if (!process.argv.includes("--no-shots")) {
  const jobs = [];
  for (const o of OPTIONS) for (const s of SURFACES) {
    const key = `${o.id}-${s.id}`;
    shoot(path.join(OUT, `${key}.gmail.html`), 390, path.join(SHOTS, `${key}-390.png`));
    shoot(path.join(OUT, `${key}.html`), 600, path.join(SHOTS, `${key}-600.png`));
    jobs.push(`${key}-390.png`, `${key}-600.png`);
  }
  // Trim the empty page under each email: rows that match the bottom row's color, then 24px back.
  execFileSync("python3", ["-c", `
import sys,os
from PIL import Image
d=sys.argv[1]
for f in sys.argv[2:]:
    p=os.path.join(d,f); im=Image.open(p).convert('RGB'); w,h=im.size; px=im.load()
    bg=px[w//2,h-1]; y=h-1
    while y>0 and all(px[x,y]==bg for x in range(0,w,3)): y-=1
    im.crop((0,0,w,min(h,y+48))).save(p, optimize=True)
`, SHOTS, ...jobs]);
  console.log(`shots: ${jobs.length}`);
}

/* ---------------------------------------------------------------- board -- */
const e = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);
const cell = (o, s, w) => {
  const key = `${o.id}-${s.id}`;
  const l = lint[key];
  return `<figure class="c w${w}"><a href="renders/${key}${w === 390 ? ".gmail" : ""}.html" target="_blank"><img src="shots/${key}-${w}.png" width="${w}" alt="${e(o.name)}, ${e(s.label)}, ${w} wide" loading="lazy"></a>
<figcaption><span class="subj">${e(meta[key].subject)}</span><span class="${l.length ? "bad" : "ok"}">${l.length ? `Lint: ${l.length} problem${l.length > 1 ? "s" : ""}: ${e(l.join("; "))}` : "Lint: clean"}</span> <a href="renders/${key}.txt" target="_blank">plain text</a></figcaption></figure>`;
};
const PREMISE = "Every option says what happened to which lease, when, and what is left in the first phone screen, and backs it with proof a careful reader could check against the signed PDF.";
const board = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signing and form emails, round 3</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light}
body{margin:0;background:#f4f2ee;color:#1d1c19;font:16px/1.5 'Instrument Sans',system-ui,sans-serif}
header{padding:40px 40px 8px;max-width:1180px}
h1{font:500 40px/1.1 Newsreader,Georgia,serif;margin:0 0 6px}
.meta{color:#5d5a52;font-size:15px;margin:0 0 18px}
.premise{font:400 21px/1.4 Newsreader,Georgia,serif;margin:0 0 22px;max-width:62ch}
.legend{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin:0 0 22px}
.legend div{background:#fff;border:1px solid #e2ded5;border-radius:10px;padding:14px 16px}
.legend b{display:block;font-size:17px;margin-bottom:4px}.legend p{margin:0 0 6px;font-size:15px}.legend .why{color:#5d5a52;font-size:14px}
.notes{font-size:14px;color:#4f4c45;max-width:110ch;margin:0 0 10px}.notes li{margin:0 0 4px}
.bar{position:sticky;top:0;z-index:5;background:#f4f2eeee;backdrop-filter:blur(6px);padding:12px 40px;border-bottom:1px solid #e2ded5;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.bar button{font:600 15px 'Instrument Sans',system-ui,sans-serif;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid #cfcabe;background:#fff;color:#1d1c19;cursor:pointer}
.bar button[aria-pressed=true]{background:#1d1c19;color:#fff;border-color:#1d1c19}
.bar button:focus-visible,a:focus-visible{outline:3px solid #2b5fd9;outline-offset:2px}
.bar span{color:#5d5a52;font-size:14px;margin-left:6px}
.grid{overflow-x:auto;padding:18px 40px 60px}
table.b{border-collapse:separate;border-spacing:22px 0}
th{position:sticky;top:69px;background:#f4f2ee;text-align:left;vertical-align:bottom;padding:8px 0 12px;font-size:15px;z-index:2}
th .n{font:500 26px/1 Newsreader,Georgia,serif;display:block}th .live{color:#8a3b12;font-size:13px;font-weight:600}
td.row{vertical-align:top;padding:30px 0 6px}
.rl{position:sticky;left:0;font-weight:600;font-size:17px;padding:30px 0 0;min-width:150px;max-width:170px;vertical-align:top}
.rl small{display:block;font-weight:400;color:#5d5a52;font-size:14px;margin-top:6px}
.c{margin:0}.c img{display:block;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12);border-radius:4px}
figcaption{font-size:13.5px;color:#4f4c45;padding-top:8px;max-width:390px}
.w600 figcaption{max-width:600px}.subj{display:block;color:#1d1c19}
.ok{color:#2d6a3e}.bad{color:#a3261b}
body[data-w="390"] .w600, body[data-w="600"] .w390{display:none}
body[data-fit="1"] .grid table{zoom:.62}
</style></head><body data-w="390">
<header>
<h1>Signing and form emails, round 3</h1>
<p class="meta">Owner Hosted Homes, the Donovan lease at 11 Bluebill Avenue, Unit 201. Five options, four emails each, every one rendered from code. November 23, 2026.</p>
<p class="premise">${e(PREMISE)}</p>
<div class="legend">${OPTIONS.map((o) => `<div><b>${e(o.n)} &nbsp;${e(o.name)}</b><p>${e(o.premise)}</p><p class="why">${o.live ? "" : "Why it reads as legitimate: "}${e(o.legit)}</p></div>`).join("")}</div>
<ul class="notes">
<li>Phone is the Gmail reading at 390 wide: the style block, the font links and classes stripped, so you see Georgia and Helvetica where Gmail shows them. Desktop is the Apple Mail reading at 600 wide with the brand faces (Literata, Jost, Great Vibes for signatures). Click any email to open the real render; "plain text" opens the text part.</li>
<li>Row 4 answers are SAMPLE data written for this board (the name, email, dates, guests, message, time and reference). Everything on the lease rows is real: parties, lease number, term, signature order, fingerprint a5c51f5d787a70d0.</li>
<li>Option 0 is the live code exactly: Owner Hosted Homes mail today uses white and #f7f7f7 with Georgia; options 0+ to 3 use the round 3 palette (paper #fdfaf4, ground #efe6d6, ink #15211d, green #21463d) with the brand's Literata and Jost.</li>
<li>The new options use the real lockup rasterized see-through (no redraw); it is not hosted yet. The live header file is opaque white, which is the white box you see on option 0.</li>
</ul>
</header>
<div class="bar" role="toolbar" aria-label="View">
<button type="button" data-set-w="390" aria-pressed="true">Phone 390, Gmail</button>
<button type="button" data-set-w="600" aria-pressed="false">Desktop 600</button>
<button type="button" data-fit aria-pressed="false">Fit more on screen</button>
<span>Columns are options, rows are the four emails. Scroll sideways for all five.</span>
</div>
<div class="grid"><table class="b"><thead><tr><th></th>${OPTIONS.map((o) => `<th><span class="n">${e(o.n)}</span>${e(o.name)}${o.live ? ' <span class="live">live today</span>' : ""}</th>`).join("")}</tr></thead><tbody>
${SURFACES.map((s) => `<tr><td class="rl">${e(s.label)}<small>${e(s.who)}</small></td>${OPTIONS.map((o) => `<td class="row">${cell(o, s, 390)}${cell(o, s, 600)}</td>`).join("")}</tr>`).join("\n")}
</tbody></table></div>
<script>
const B=document.body;
document.querySelectorAll('[data-set-w]').forEach(b=>b.addEventListener('click',()=>{B.dataset.w=b.dataset.setW;document.querySelectorAll('[data-set-w]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
const f=document.querySelector('[data-fit]');f.addEventListener('click',()=>{const on=B.dataset.fit!=='1';B.dataset.fit=on?'1':'0';f.setAttribute('aria-pressed',String(on))});
</script>
</body></html>`;
fs.writeFileSync(path.join(HERE, "index.html"), board);
console.log(path.join(HERE, "index.html"));
