// 3 The Notice. A formal notice, the way a private bank writes one: a square paper panel under an
// ink rule, a masthead line naming the kind of notice and its number, the news, then ONE fact set
// large (the signing time with its zone and weekday), what is left, one button, the particulars
// as a ruled two-column ledger, and a box telling the reader how to check the notice is genuine.
import { T, button, esc, gap, inline, keep, logoImg, paint, parties, shell, side, splitWhen, stack, textOf } from "../r3lib.mjs";
import { neutral, operatorWords, receiptWords, signerWords } from "../copy.mjs";

const WEEKDAY = (day) => {
  const d = new Date(`${day} 12:00 UTC`);
  return Number.isNaN(d.getTime()) ? day : `${d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}, ${day}`;
};
const ZONE = { EST: "Eastern Time", EDT: "Eastern Time", CST: "Central Time", CDT: "Central Time", MST: "Mountain Time", MDT: "Mountain Time", PST: "Pacific Time", PDT: "Pacific Time" };

function notice(b, o) {
  const serif = stack(b.faces.serif, "serif");
  const sans = stack(b.faces.sans, "sans-serif");
  const P = (t, x = {}) => `<p style="margin:${x.mt ?? 0}px 0 0;font-family:${x.font ?? sans};font-size:${x.size ?? 16}px;line-height:${x.lh ?? 25}px;color:${x.color ?? b.ink};word-wrap:break-word">${neutral(inline(keep(t), b.link))}</p>`;
  const head = b.logo ? logoImg(b.logo, 230, b.paper, serif, b.ink) : `<p style="margin:0;font-family:${serif};font-size:20px;line-height:26px;color:${b.ink}">${esc(b.name)}</p>`;
  const w = splitWhen(o.when);
  const big = `${gap(24)}${T(`<tr><td style="border-left:3px solid ${b.gold};padding:2px 0 4px 16px">
<p style="margin:0;font-family:${sans};font-size:14px;line-height:20px;color:${b.muted}">${esc(o.whenLabel)}</p>
<p style="margin:2px 0 0;font-family:${serif};font-size:46px;line-height:52px;font-weight:400;color:${b.ink};white-space:nowrap">${esc(keep(w.time))}<span style="font-family:${sans};font-size:20px;line-height:20px;color:${b.muted}">&nbsp;${esc(w.zone)}</span></p>
<p style="margin:2px 0 0;font-family:${sans};font-size:15px;line-height:22px;color:${b.ink}">${esc(WEEKDAY(w.day))}${ZONE[w.zone] ? `, ${ZONE[w.zone]}` : ""}</p></td></tr>`)}`;
  const ledger = (title, rows) =>
    `${gap(32)}<p style="margin:0 0 8px;font-family:${serif};font-size:20px;line-height:26px;color:${b.ink}">${esc(title)}</p>${T(
      rows
        .map(
          (r) => `<tr><td valign="top" width="40%" style="padding:10px 12px 10px 0;border-top:1px solid ${b.rule};font-family:${sans};font-size:14px;line-height:22px;color:${b.muted};word-wrap:break-word">${esc(r.label)}${r.sub ? `<br>${esc(r.sub)}` : ""}</td><td valign="top" style="padding:10px 0;border-top:1px solid ${b.rule};font-family:${r.mono ? b.faces.mono : sans};font-size:${r.mono ? 15 : 16}px;line-height:22px;color:${r.dim ? b.muted : b.ink};word-wrap:break-word;overflow-wrap:anywhere">${neutral(esc(keep(r.value)))}</td></tr>`
        )
        .join("") + `<tr><td colspan="2" height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${b.rule}">&nbsp;</td></tr>`,
      'style="border-collapse:collapse"'
    )}`;
  const check = o.check
    ? `${gap(30)}${T(`<tr><td ${paint(b.tint)}padding:18px ${side(20, 500)} 18px;border:1px solid ${b.rule}"><p style="margin:0;font-family:${sans};font-size:15px;line-height:21px;font-weight:600;color:${b.ink}">${esc(o.check.title)}</p>${o.check.lines.map((t) => `<p style="margin:6px 0 0;font-family:${sans};font-size:15px;line-height:23px;color:${b.mutedOnTint};word-wrap:break-word">${neutral(inline(keep(t), readable2(b)))}</p>`).join("")}</td></tr>`)}`
    : "";

  const panel = `<tr><td ${paint(b.paper)}border-top:3px solid ${b.ink};padding:28px ${side(28, 568)} 34px">
${head}
${gap(20)}${T(`<tr><td valign="bottom" style="padding:0 8px 8px 0;border-bottom:1px solid ${b.ink};font-family:${sans};font-size:14px;line-height:20px;font-weight:600;color:${b.ink}">${esc(o.kind)}</td><td valign="bottom" align="right" style="padding:0 0 8px;border-bottom:1px solid ${b.ink};font-family:${sans};font-size:14px;line-height:20px;color:${b.muted};text-align:right;white-space:nowrap">${esc(o.number)}</td></tr>`, 'style="border-collapse:collapse"')}
<h1 style="margin:24px 0 0;font-family:${serif};font-size:28px;line-height:35px;font-weight:400;color:${b.ink}">${esc(o.headline)}</h1>
${big}
${o.lead.map((t, i) => P(t, { mt: i ? 8 : 20, size: 17, lh: 26 })).join("")}
${o.button ? `${gap(24)}${button(o.button.url, o.button.label, { bg: b.deep, fg: b.onDeep, font: sans, radius: 2 })}` : ""}
${(o.attach ?? []).map((t) => P(t, { size: 14, lh: 21, color: b.muted, mt: 10 })).join("")}
${(o.ledgers ?? []).map((l) => ledger(l.title, l.rows)).join("")}
${check}
</td></tr>`;
  const body = T(`<tr><td ${paint(b.ground)}padding:24px ${side(16)} 32px">
${T(panel)}
${gap(18)}
${T(`<tr><td style="padding:0 ${side(4, 568)}">${o.footer.map((t, i) => P(t, { size: 14, lh: 21, color: b.mutedOnGround, mt: i ? 6 : 0 })).join("")}</td></tr>`)}
</td></tr>`);
  return shell({ subject: o.subject, preheader: o.preheader, fontsHref: b.fontsHref, ground: b.ground, body });
}
const readable2 = (b) => b.mutedOnTint;

const siteMd = (b) => (b.site ? ` [${b.siteLabel}](${b.site})` : "");
const siteTx = (b) => (b.site ? ` ${b.site}` : "");
const from = (b) => (b.site ? `It comes from ${b.siteLabel}, and a reply reaches the same desk.` : `It comes from ${b.name}, and a reply reaches the same desk.`);
const sigRows = (m) =>
  parties(m).map((p) => ({ label: p.name, sub: m.pdfRole?.[p.role] ?? p.role, value: p.signed ? `Signed ${p.when}` : "Not signed yet", dim: !p.signed }));
const leaseRows = (m) => [
  { label: "Property", value: m.terms[0].value },
  { label: "Check-in", value: m.checkIn.when },
  { label: "Checkout", value: m.checkout },
];

export function signer(m, b) {
  const w = signerWords(m);
  const first = m.recipient ?? m.signedBy;
  const headline = w.complete ? "The lease is fully signed." : `${first}, your signature is recorded.`;
  const lead = w.complete
    ? [`Every signer is done. The fully signed lease is attached as a PDF.`, ...(m.nextStep ? [`${m.nextStep.what} is ${m.nextStep.when}.`] : [])]
    : [`${w.total - w.signedCount} signature left: ${w.left}. ${w.promise}`];
  const o = {
    subject: w.subject, preheader: w.preheader, kind: "Signing notice", number: m.leaseNo,
    headline, when: m.signedWhen, whenLabel: w.complete ? "Last signature" : "You signed at",
    lead,
    button: { url: m.button.url, label: w.complete ? "Open the signed lease" : "Open your copy" },
    attach: m.attached ? [`Attached: ${m.attachmentName}`] : [],
    ledgers: [{ title: "Signatures", rows: sigRows(m) }, { title: m.docTitle, rows: leaseRows(m) }],
    check: { title: "How to check this notice", lines: [from(b), `The lease's document fingerprint is ${m.fingerprint}. The fully signed PDF prints the same number at the foot of every page.`] },
    footer: [`${b.legal}.${siteMd(b)}`],
  };
  const text = textOf([
    `${o.kind}, ${o.number}`, "", headline, "", `${o.whenLabel}: ${m.signedWhen}`, "", ...lead, "", `${o.button.label}: ${o.button.url}`, ...o.attach, "",
    "Signatures", ...o.ledgers[0].rows.map((r) => `${r.label}, ${r.sub}: ${r.value}`), "", m.docTitle, ...o.ledgers[1].rows.map((r) => `${r.label}: ${r.value}`), "",
    o.check.title, ...o.check.lines, "", `${b.legal}.${siteTx(b)}`,
  ]);
  return { subject: w.subject, html: notice(b, o), text };
}

export function operator(m, b) {
  const w = operatorWords(m);
  const n = parties(m).length;
  const o = {
    subject: w.subject, preheader: w.preheader, kind: "Signing alert", number: m.leaseNo,
    headline: w.complete ? `${m.signedBy} signed. The lease is fully signed.` : `${m.signedBy} signed.`,
    when: m.signedWhen, whenLabel: "Signed at",
    lead: [w.complete ? `${n} of ${n} signed. Nothing waits on you. The signed PDF went to every signer and is attached here.` : `${w.left} has not signed yet.`],
    button: { url: m.button.url, label: m.button.label },
    ledgers: [{ title: "Signatures", rows: sigRows(m) }, { title: "Record", rows: [{ label: "Agreement", value: m.agreementId, mono: true }, { label: "Fingerprint", value: m.fingerprint, mono: true }] }],
    footer: [`Sent to the ${b.name} inbox each time someone signs.`],
  };
  const text = textOf([`${o.kind}, ${o.number}`, "", o.headline, "", `Signed at: ${m.signedWhen}`, "", ...o.lead, "", `${o.button.label}: ${o.button.url}`, "", "Signatures", ...o.ledgers[0].rows.map((r) => `${r.label}, ${r.sub}: ${r.value}`), "", "Record", ...o.ledgers[1].rows.map((r) => `${r.label}: ${r.value}`), "", o.footer[0]]);
  return { subject: w.subject, html: notice(b, o), text };
}

export function receipt(r, b) {
  const w = receiptWords(r, b);
  const o = {
    subject: w.subject, preheader: w.preheader, kind: "Inquiry received", number: r.reference.value,
    headline: `${r.recipient.split(" ")[0]}, your inquiry is in.`,
    when: r.sentWhen, whenLabel: "Received at",
    lead: [r.next.join(" ")],
    ledgers: [{ title: "Your answers", rows: r.received }],
    footer: [`Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteMd(b)}`],
  };
  const text = textOf([`${o.kind}, ${o.number}`, "", o.headline, "", `Received at: ${r.sentWhen}`, "", ...o.lead, "", "Your answers", ...r.received.map((x) => `${x.label}: ${x.value}`), "", `Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteTx(b)}`]);
  return { subject: w.subject, html: notice(b, o), text };
}
