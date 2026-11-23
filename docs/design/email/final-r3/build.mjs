// The Certificate, final proofs (round 3 pick, 2026-11-23). Renders the four jobs for five businesses
// from the kit's real code (tests/certificate.test.ts with RENDER_PROOFS set, which also checks
// every fact appears in the html and the plain text), then shoots each at 390 with Gmail's
// stripping applied (no <style>, no <link>, no classes, no web fonts) and at 600 with the brand
// faces, and writes index.html with them side by side.
//   node docs/design/email/final-r3/build.mjs            render, check, shoot, write the page
//   node docs/design/email/final-r3/build.mjs --no-shots render, check and write the page only
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, "../../../..");
const RAW = path.join(HERE, "renders");
const SHOTS = path.join(HERE, "shots");
fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

execFileSync("pnpm", ["-s", "vitest", "run", "tests/certificate.test.ts", "--reporter=dot"], {
  cwd: KIT,
  stdio: "inherit",
  env: { ...process.env, RENDER_PROOFS: RAW },
});

const BRANDS = [
  ["ohh", "Owner Hosted Homes"],
  ["palisade", "Palisade Stays"],
  ["sun-mountain", "Sun Mountain Stays"],
  ["streamlined", "Streamlined Stays"],
  ["xenia", "Xenia"],
];
const JOBS = [
  ["waiting", "1. Signer, waiting on another signer"],
  ["complete", "2. Fully signed, PDF attached"],
  ["operator", "3. Alert to the business inbox"],
  ["receipt", "4. Form receipt"],
];

// The Owner Hosted Homes logo goes live with the site branch; until then the proof reads the same file here.
const LOCAL = { "https://ownerhostedhomes.com/brand/email/ohh-lockup-ink@3x.png": "../assets/ohh-lockup-ink@3x.png" };
const preview = (html) => Object.entries(LOCAL).reduce((h, [u, f]) => h.split(u).join(f), html);
// What Gmail (web and the iPhone app) does: the <style> and <link> go, classes go, and web faces never
// load. This Mac has some of them installed, so they are dropped from the stacks too.
const WEB_FACES = /(?:Literata|Jost|Newsreader|'Instrument Sans'|'EB Garamond'|Sentient|Switzer),/g;
const gmail = (html) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<link\b[^>]*>/gi, "").replace(/\sclass="[^"]*"/gi, "").replace(WEB_FACES, "");

const facts = {};
for (const [b] of BRANDS)
  for (const [j] of JOBS) {
    const key = `${b}-${j}`;
    const html = fs.readFileSync(path.join(RAW, `${key}.html`), "utf8");
    fs.writeFileSync(path.join(RAW, `${key}.preview.html`), preview(html));
    fs.writeFileSync(path.join(RAW, `${key}.gmail.html`), preview(gmail(html)));
    facts[key] = JSON.parse(fs.readFileSync(path.join(RAW, `${key}.facts.json`), "utf8"));
  }

const CHROME = process.env.CHROME_PATH || path.join(process.env.HOME, ".claude/bin/chrome-headless");
const shoot = (file, width, png) =>
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", "--virtual-time-budget=8000", `--window-size=${width},3400`, `--screenshot=${png}`, pathToFileURL(file).href], { stdio: "ignore" });

let shots = 0;
if (!process.argv.includes("--no-shots")) {
  const made = [];
  for (const [b] of BRANDS)
    for (const [j] of JOBS) {
      const key = `${b}-${j}`;
      shoot(path.join(RAW, `${key}.gmail.html`), 390, path.join(SHOTS, `${key}-390.png`));
      shoot(path.join(RAW, `${key}.preview.html`), 600, path.join(SHOTS, `${key}-600.png`));
      made.push(`${key}-390.png`, `${key}-600.png`);
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
`, SHOTS, ...made]);
  shots = made.length;
}

const e = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);
const cell = (b, j, w) => {
  const key = `${b}-${j}`;
  const f = facts[key];
  const miss = f.missingHtml.length + f.missingText.length;
  return `<figure class="c w${w}"><a href="renders/${key}${w === 390 ? ".gmail" : ".preview"}.html" target="_blank"><img src="shots/${key}-${w}.png" width="${w}" alt="${e(f.brand)}, ${e(f.job)}, ${w} wide" loading="lazy"></a>
<figcaption><span class="subj">${e(f.subject)}</span><span class="${miss ? "bad" : "ok"}">${miss ? `${miss} facts missing` : `${f.facts.length} of ${f.facts.length} facts in both the html and the plain text`}</span> <a href="renders/${key}.txt" target="_blank">plain text</a></figcaption></figure>`;
};
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Certificate, final proofs</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light}
body{margin:0;background:#f4f2ee;color:#1d1c19;font:16px/1.5 'Instrument Sans',system-ui,sans-serif}
header{padding:40px 40px 8px;max-width:1180px}
h1{font:500 40px/1.1 Newsreader,Georgia,serif;margin:0 0 6px}
.meta{color:#5d5a52;font-size:15px;margin:0 0 14px}
.notes{font-size:14px;color:#4f4c45;max-width:110ch;margin:0 0 10px;padding-left:20px}.notes li{margin:0 0 4px}
.bar{position:sticky;top:0;z-index:5;background:#f4f2eeee;padding:12px 40px;border-bottom:1px solid #e2ded5;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.bar button{font:600 15px 'Instrument Sans',system-ui,sans-serif;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid #cfcabe;background:#fff;color:#1d1c19;cursor:pointer}
.bar button[aria-pressed=true]{background:#1d1c19;color:#fff;border-color:#1d1c19}
.bar button:focus-visible,a:focus-visible{outline:3px solid #2b5fd9;outline-offset:2px}
.bar span{color:#5d5a52;font-size:14px;margin-left:6px}
.grid{overflow-x:auto;padding:18px 40px 60px}
table.b{border-collapse:separate;border-spacing:22px 0}
th{position:sticky;top:69px;background:#f4f2ee;text-align:left;vertical-align:bottom;padding:8px 0 12px;font:500 22px/1.1 Newsreader,Georgia,serif;z-index:2}
td.row{vertical-align:top;padding:30px 0 6px}
.rl{font-weight:600;font-size:17px;padding:30px 0 0;min-width:140px;max-width:160px;vertical-align:top}
.c{margin:0}.c img{display:block;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12);border-radius:4px}
figcaption{font-size:13.5px;color:#4f4c45;padding-top:8px;max-width:390px}
.w600 figcaption{max-width:600px}.subj{display:block;color:#1d1c19}
.ok{color:#2d6a3e}.bad{color:#a3261b}
body[data-w="390"] .w600, body[data-w="600"] .w390{display:none}
</style></head><body data-w="390">
<header>
<h1>The Certificate, final proofs</h1>
<p class="meta">Round 3 pick (November 23, 2026), built into the sign-kit's shared email core. Four emails for each of five businesses, every one rendered from the real code. ${shots} screenshots.</p>
<ul class="notes">
<li>Phone is the Gmail reading at 390 wide: the style block, font links and classes stripped and no web fonts, so you see the system faces Gmail shows. Desktop is the Apple Mail reading at 600 wide with each brand's own faces.</li>
<li>Click any email to open the real render; "plain text" opens the text part. The green line under each says every fact in that email was found in both the html and the plain text.</li>
<li>Real: the Owner Hosted Homes Donovan lease (parties, order, lease number, term, signing times, document ID) and the Sun Mountain Cranbrook agreement (Michael Williams, November 11, 2026, 6:59 PM MST). SAMPLE: the Palisade tenant, the Streamlined and Xenia documents, Jake's Cranbrook signing time, signing-link tokens, and every inquiry receipt (Dana Whitfield is fictional).</li>
<li>Every logo is the business's own see-through file already on its site, except Owner Hosted Homes, which goes live when the site branch merges (shown here from the same file).</li>
</ul>
</header>
<div class="bar" role="toolbar" aria-label="View">
<button type="button" data-set-w="390" aria-pressed="true">Phone 390, Gmail</button>
<button type="button" data-set-w="600" aria-pressed="false">Desktop 600</button>
<span>Columns are businesses, rows are the four emails. Scroll sideways for all five.</span>
</div>
<div class="grid"><table class="b"><thead><tr><th></th>${BRANDS.map(([, n]) => `<th>${e(n)}</th>`).join("")}</tr></thead><tbody>
${JOBS.map(([j, l]) => `<tr><td class="rl">${e(l)}</td>${BRANDS.map(([b]) => `<td class="row">${cell(b, j, 390)}${cell(b, j, 600)}</td>`).join("")}</tr>`).join("\n")}
</tbody></table></div>
<script>
const B=document.body;
document.querySelectorAll('[data-set-w]').forEach(b=>b.addEventListener('click',()=>{B.dataset.w=b.dataset.setW;document.querySelectorAll('[data-set-w]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
</script>
</body></html>`;
fs.writeFileSync(path.join(HERE, "index.html"), page);
const missing = Object.values(facts).reduce((n, f) => n + f.missingHtml.length + f.missingText.length, 0);
console.log(`emails: ${Object.keys(facts).length}, shots: ${shots}, facts missing: ${missing}`);
console.log(path.join(HERE, "index.html"));
