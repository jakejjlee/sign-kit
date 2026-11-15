// Builds every render of the round 2 email board into this directory.
//   node build.mjs
// Option 0 is the live design rendered by the live code: the Track from signer-email-core.ts, the
// legacy operator shell from notify.ts, and the paper letterhead for the form receipt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BRANDS, SURFACES, SURFACE_ORDER, esc, inline } from "./lib.mjs";
import { d0p, d1, d2, d3 } from "./dirs.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = path.resolve(HERE, "../../../..");
const core = await import(pathToFileURL(path.join(WT, "src/lib/signer-email-core.ts")).href);
const LH = path.join(process.env.HOME, "Claude/_tools/web-kit/.claude-worktrees/letterheads/src/brand-pack/letterheads.mjs");
const lh = await import(pathToFileURL(LH).href);

const asEmail = (html) =>
  html.replace('<html lang="en"', '<html lang="en" data-medium="email" data-no-hero="email, not a page"').replace("<body ", '<body data-medium="email" ');

/* ----------------------------------------------- option 0: the live Track -- */
const LIVE_FACES = { serif: "Georgia,'Times New Roman',serif", sans: "'Helvetica Neue',Helvetica,Arial,sans-serif", wordmark: "Georgia,'Times New Roman',serif" };
function live(m) {
  const b = BRANDS[m.brand];
  const palette = core.makePalette({ paper: b.paper, ground: b.ground, ink: b.ink, muted: b.muted, rule: b.rule, band: b.deep, accent: b.gold });
  const signed = m.parties.find((p) => p.state === "signed");
  const waiting = m.parties.filter((p) => p.state !== "signed").map((p) => ({ name: p.name, role: p.role.toLowerCase() }));
  const complete = waiting.length === 0;
  const model = {
    palette,
    faces: LIVE_FACES,
    brandName: b.name,
    docTitle: m.doc.title,
    subjectPlace: m.subject.split(" | ")[0],
    place: m.doc.place,
    mark: b.key === "sms" ? { src: "assets/sms-mark.png", ground: "#1f4a30" } : undefined,
    signedBy: signed.name,
    signedWhen: signed.when,
    waiting,
    completeDetail: complete ? (m.attach ? "Every party has signed. The signed PDF is attached." : "Every party has signed.") : "",
    completion: { title: "We email you when it is complete", detail: "You get the completed agreement as a PDF, from this address." },
    button: m.button ? { url: m.button.url } : undefined,
    note: m.attach ? [m.attach] : [],
    terms: m.doc.rows.map(([label, value]) => ({ label, value })),
    fineprint: m.fine ? [m.fine.replace(" Keep this email for your records.", "")].filter(Boolean) : [],
    bookUrl: "https://jakejjlee.com/meet",
    legalLine: b.legal,
  };
  const out = core.renderSignerEmail(model);
  return asEmail(out.html);
}

/* ------------------------------------ option 0: the live operator notice -- */
function liveAlert(m) {
  const b = BRANDS[m.brand];
  const accent = b.gold, ground = b.ground, paper = b.paper;
  const rows = [["Signed by", "Zachary Lindquist"], ["Typed", "Zachary Lindquist"], ["When", "November 14, 2026, 8:40 PM EST"], ["Version", "November 14, 2026"], ["Reference", "rn-zach-c08wy4mr9n1w"]];
  const trs = rows
    .map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e5dac4;font-family:system-ui,sans-serif;font-size:14px;color:#6b6455">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #e5dac4;text-align:right;font-family:ui-monospace,SFMono-Regular,monospace;font-size:14px;color:#1b1a16">${esc(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="en" data-medium="email" data-no-hero="email, not a page"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.subject)}</title></head><body data-medium="email" style="margin:0">
  <div style="margin:0;padding:28px 18px;background:${ground};font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:560px;margin:0 auto;background:${paper};border:1px solid #ddd2bb;padding:32px 30px">
      <p style="margin:0 0 22px;font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${accent}">Direct-Booking Website Agreement</p>
      <h1 style="margin:0 0 6px;font-size:23px;line-height:1.15;font-weight:400;color:#1b1a16">Fully executed</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b6455">Roam North Stays, Euclid Grand, Cleveland</p>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#3d382e">Every party has signed. The executed agreement is attached.</p>
      <table style="border-collapse:collapse;width:100%;margin:0 0 20px">${trs}</table>
      <p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;line-height:1.6;color:#6b6455">The signature record is filed in the agreements folder on the shared drive. This email is the notification, not the record.</p>
      <p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e5dac4;font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;color:#6b6455">Xenia LLC, the company that builds and runs the Roam North direct-booking site.</p>
    </div>
  </div></body></html>`;
  return html;
}

/* ------------------------------- option 0: the live paper letterhead receipt -- */
function liveForm(m) {
  const slug = "palisade";
  const dir = path.join(process.env.HOME, "Claude/_tools/letterhead/brands", slug);
  const brand = JSON.parse(fs.readFileSync(path.join(dir, "brand.json"), "utf8"));
  const l = brand.config.letterhead;
  fs.copyFileSync(path.join(dir, "header@3x.png"), path.join(HERE, "assets/ps-letterhead-header.png"));
  const cfg = { ...brand.config, letterhead: { ...l, headerUrl: "assets/ps-letterhead-header.png", headerLeftUrl: undefined } };
  const email = {
    subject: m.subject,
    blocks: [
      { type: "p", text: "Hello," },
      { type: "p", text: m.lead[0] },
      { type: "p", text: m.lead[1] },
      { type: "p", text: m.doc.place },
      { type: "figures", rows: m.doc.rows.map(([k, v]) => [k, v]), emphasizeLast: false },
      { type: "link", label: "To choose a time to talk, book a call with me here:", href: "https://jakejjlee.com/meet" },
    ],
  };
  const sig = lh.letterheadSignature("", { logo: false, name: "Jake Lee" });
  const body = lh.renderLetterhead("paper", cfg, { name: "Jake Lee", title: "Founder, Palisade Stays", email: "hello@palisadestays.com" }, email, sig);
  return asEmail(lh.letterheadDocument(body, { subject: m.subject, fontsHref: brand.fontsHref }));
}

/* -------------------------------------------------------------- write -- */
const DIRS = [
  { id: "d0", fn: null },
  { id: "d0p", fn: d0p },
  { id: "d1", fn: d1 },
  { id: "d2", fn: d2 },
  { id: "d3", fn: d3 },
];
const sizes = {};
for (const d of DIRS) {
  for (const k of SURFACE_ORDER) {
    const m = SURFACES[k];
    const b = BRANDS[m.brand];
    let html;
    if (d.id === "d0") html = k === "alert" ? liveAlert(m) : k === "form" ? liveForm(m) : live(m);
    else html = d.fn(m, b);
    const name = k === "waiting" ? d.id : `${d.id}-${k}`;
    fs.writeFileSync(path.join(HERE, name), html);
    fs.writeFileSync(path.join(HERE, name + ".html"), html);
    sizes[name] = Buffer.byteLength(html);
  }
}
console.log(Object.entries(sizes).map(([k, v]) => `${k} ${(v / 1024).toFixed(1)}KB`).join("  "));

/* ------------------------------------------------------------- catalog -- */
const sources = {
  waiting: "palisade 36 River Road management agreement (palisade repo, sign-kit render 2026-11-14); wording from sign-kit signer email",
  complete: "sun-mountain-stays Cranbrook agreement record, Michael Williams signed Nov 11 2026 6:59 PM MST (sign-kit BRIEF.md); live render 2026-11-14",
  alert: "roam-north-agreement content/agreements/direct-site.ts; sign-kit operator notice (notify.ts)",
  form: "palisade src/messages/en.json content.ui.confirmationEmail and content.ui.inquiry; src/lib/contact/reasons.ts",
  plfa: "plfa-submissions forms/spec/consignment-agreement.json (gallery: Perry Lawson Fine Art LLC)",
};
const entityIds = { waiting: "palisade-36-river-road-management-agreement", complete: "sun-mountain-309-cranbrook-management-agreement", alert: "xenia-roam-north-direct-booking-website-agreement", form: "palisade-inquiry-receipt", plfa: "perry-lawson-consignment-agreement" };
const catalog = { _note: "Short facts only (names, terms, figures), each with its source. Signing dates and times in the samples are stand-ins for a real send; terms, parties, wording and logos are real.", sources, entities: [], unknowns: ["signing times of the sample sends", "fingerprint", "signer IP", "signer email"] };
for (const k of SURFACE_ORDER) {
  const m = SURFACES[k];
  const facts = { document: { value: m.doc.title, source: sources[k] }, place: { value: m.doc.place.length < 60 ? m.doc.place : m.doc.place.slice(0, 59), source: sources[k] } };
  for (const [label, value] of m.doc.rows) facts[label] = { value, source: sources[k] };
  m.parties.forEach((p, i) => { facts[`${p.role} ${i + 1}`] = { value: p.name, source: sources[k] }; });
  facts.business = { value: BRANDS[m.brand].name, source: sources[k] };
  catalog.entities.push({ id: entityIds[k], facts });
}
fs.writeFileSync(path.join(HERE, "catalog.json"), JSON.stringify(catalog, null, 2));
