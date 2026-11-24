// 0+ The Specimen, done properly. Same skeleton as the live core (tinted ground, logo centered, one
// large sentence, one button, the document drawn as a sheet with its signature lines, a quiet
// footer). What changes is only what the floor asks for:
// - the headline names the news and the person; the first screen gives the time with its zone
// - the see-through logo replaces the white box; the brand's own faces and palette
// - the sheet carries the term and the document fingerprint; signature lines in the PDF's order
//   with the PDF's role names
// - the stamp is 14px, sentence-case words instead of tracked capitals
// - the footer says who sends it and links the site we name; no filler lines
import { T, button, esc, gap, inline, keep, logoImg, paint, parties, shell, side, sp, stack, textOf } from "../r3lib.mjs";
import { neutral, operatorWords, receiptWords, signerWords } from "../copy.mjs";

function layout(b, o) {
  const serif = stack(b.faces.serif, "serif");
  const sans = stack(b.faces.sans, "sans-serif");
  const script = stack(b.faces.script, "serif");
  const head = b.logo
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">${logoImg(b.logo, 230, b.ground, serif, b.ink, "center")}</td></tr></table>`
    : `<p style="margin:0;text-align:center;font-family:${serif};font-size:20px;line-height:26px;color:${b.ink}">${esc(b.name)}</p>`;
  const P = (t, x = {}) => `<p style="margin:${x.mt ?? 0}px 0 0;font-family:${x.font ?? sans};font-size:${x.size ?? 17}px;line-height:${x.lh ?? 26}px;color:${x.color ?? b.mutedOnGround};text-align:${x.align ?? "center"};word-wrap:break-word">${neutral(inline(keep(t), b.link))}</p>`;
  const stampTone = o.stampTone ?? b.tint;
  const stamp = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td ${paint(stampTone)}border-radius:4px;padding:5px 10px;font-family:${sans};font-size:14px;line-height:18px;font-weight:600;color:${b.mutedOnTint};white-space:nowrap">${esc(o.status)}</td></tr></table>`;
  const rows = (o.rows ?? [])
    .map((r) => {
      const mono = r.mono ? `font-family:${b.faces.mono};font-size:15px;letter-spacing:.02em` : `font-family:${serif};font-size:17px`;
      return `<tr><td valign="top" width="34%" style="padding:11px 12px 11px 0;border-top:1px solid ${b.rule};font-family:${sans};font-size:14px;line-height:21px;color:${b.muted}">${esc(r.label)}</td><td valign="top" style="padding:11px 0;border-top:1px solid ${b.rule};${mono};line-height:24px;color:${b.ink};word-wrap:break-word;overflow-wrap:anywhere">${neutral(esc(keep(r.value)))}</td></tr>`;
    })
    .join("");
  const sigs = (o.sigs ?? [])
    .map(
      (p) => `${sp(20)}<tr><td style="padding:0 0 4px;font-family:${p.signed ? script : serif};${p.signed ? "" : "font-style:italic;"}font-size:${p.signed ? 30 : 17}px;line-height:36px;color:${p.signed ? b.deep : b.muted};word-wrap:break-word">${p.signed ? esc(p.name) : "Awaiting signature"}</td></tr>
<tr><td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px ${p.signed ? "solid" : "dashed"} ${p.signed ? b.ink : b.muted}">&nbsp;</td></tr>
<tr><td style="padding:6px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${b.muted}">${esc(p.name)}, ${esc(p.role)}. ${p.signed ? `Signed ${esc(keep(p.when))}` : "Has not signed yet"}</td></tr>`
    )
    .join("");
  const sheet = T(`<tr><td ${paint(b.paper)}border:1px solid ${b.rule};padding:26px ${side(28, 536)} 28px">
${T(`<tr><td style="padding:0 0 12px">${stamp}</td></tr><tr><td style="font-family:${serif};font-size:24px;line-height:30px;color:${b.ink}">${esc(o.sheetTitle)}</td></tr>${o.sheetPlace ? `<tr><td style="padding:4px 0 0;font-family:${sans};font-size:15px;line-height:22px;color:${b.muted}">${o.sheetPlace.map(esc).join("<br>")}</td></tr>` : ""}${sp(16)}`)}
${rows ? T(rows, 'style="border-collapse:collapse"') : ""}${o.sigs?.length ? T(sigs) : ""}
</td></tr>`);
  const body = T(`<tr><td ${paint(b.ground)}padding:34px ${side(32)} 34px;border-top:4px solid ${b.gold}">
${head}
<h1 style="margin:26px 0 0;font-family:${serif};font-size:30px;line-height:36px;font-weight:400;color:${b.ink};text-align:center">${esc(o.headline)}</h1>
${o.lead.map((t, i) => P(t, { mt: i ? 8 : 12 })).join("")}
${o.button ? `${gap(22)}${button(o.button.url, o.button.label, { bg: b.deep, fg: b.onDeep, font: sans })}` : ""}
${(o.attach ?? []).map((t) => P(t, { size: 15, lh: 22, mt: 12 })).join("")}
${gap(26)}${sheet}
${(o.after ?? []).map((t, i) => P(t, { color: b.ink, mt: i ? 6 : 22, size: 16, lh: 24 })).join("")}
${gap(26)}
${o.footer.map((t, i) => P(t, { size: 14, lh: 21, mt: i ? 6 : 0 })).join("")}
</td></tr>`);
  return shell({ subject: o.subject, preheader: o.preheader, fontsHref: b.fontsHref, ground: b.ground, body });
}

const siteLink = (b) => (b.site ? ` [${b.siteLabel}](${b.site})` : "");
const footer = (b) => [`Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteLink(b)}`];
const sigsOf = (m) => parties(m).map((p) => ({ ...p, role: m.pdfRole?.[p.role] ?? p.role }));

export function signer(m, b) {
  const w = signerWords(m);
  const head = w.complete ? "The lease is fully signed." : `${m.signedBy.split(" ")[0]}, your signature is recorded.`;
  const lead = w.complete
    ? [`All ${w.total} signers are done, the last on ${w.stamp}.`, ...(m.nextStep ? [`${m.nextStep.what}: ${m.nextStep.when}.`] : [])]
    : [`You signed the ${m.docTitle.toLowerCase()} on ${w.stamp}.`, `${w.whatLeft} ${w.promise}`];
  const o = {
    subject: w.subject, preheader: w.preheader, headline: head, lead,
    button: { url: m.button.url, label: w.complete ? "Open the signed lease" : "Open your copy" },
    attach: m.attached ? [`${m.attachmentName} is attached.`] : [],
    status: w.complete ? "Fully signed" : `Signed ${w.signedCount} of ${w.total}`,
    stampTone: w.complete ? undefined : undefined,
    sheetTitle: m.docTitle, sheetPlace: m.place,
    rows: m.terms.filter((t) => t.label !== "Property").map((t) => ({ label: t.label, value: Array.isArray(t.value) ? t.value.join(", ") : t.value })).concat([{ label: "Fingerprint", value: m.fingerprint, mono: true }]),
    sigs: sigsOf(m),
    footer: footer(b),
  };
  const html = layout(b, o);
  const text = textOf([
    head, "", ...lead, "", `${o.button.label}: ${o.button.url}`, ...o.attach, "",
    `${m.docTitle}`, ...m.place, ...o.rows.map((r) => `${r.label}: ${r.value}`), "",
    ...o.sigs.map((p) => `${p.name}, ${p.role}: ${p.signed ? `signed ${p.when}` : "has not signed yet"}`), "",
    `Reply to this email and it reaches ${b.name}.`, `${b.legal}.${b.site ? ` ${b.site}` : ""}`,
  ]);
  return { subject: w.subject, html, text };
}

export function operator(m, b) {
  const w = operatorWords(m);
  const head = w.complete ? `${m.signedBy} signed. The lease is fully signed.` : `${m.signedBy} signed.`;
  const lead = [w.complete ? "Every signer is done. Nothing waits on you." : `${w.left} has not signed yet.`];
  const o = {
    subject: w.subject, preheader: w.preheader, headline: head, lead,
    button: { url: m.button.url, label: m.button.label },
    attach: m.note,
    status: w.complete ? "Fully signed" : "Waiting",
    sheetTitle: "Signature record", sheetPlace: [m.place],
    rows: m.record.map((r) => ({ ...r, mono: r.label === "Fingerprint" || r.label === "Agreement" })),
    sigs: sigsOf(m),
    footer: [`Sent to the ${b.name} inbox each time someone signs.`],
  };
  const html = layout(b, o);
  const text = textOf([head, "", ...lead, "", `${o.button.label}: ${o.button.url}`, ...m.note, "", "Signature record", m.place, ...m.record.map((r) => `${r.label}: ${r.value}`), "", ...o.sigs.map((p) => `${p.name}, ${p.role}: signed ${p.when}`), "", o.footer[0]]);
  return { subject: w.subject, html, text };
}

export function receipt(r, b) {
  const w = receiptWords(r, b);
  const head = "Your inquiry is in.";
  const lead = [`We received it on ${keep(r.sentWhen)}.`];
  const o = {
    subject: w.subject, preheader: w.preheader, headline: head, lead,
    status: "Received",
    sheetTitle: "What you sent",
    rows: r.received.concat([{ ...r.reference, mono: true }]),
    after: r.next,
    footer: footer(b),
  };
  const html = layout(b, o);
  const text = textOf([head, "", ...lead, "", "What you sent", ...o.rows.map((x) => `${x.label}: ${x.value}`), "", ...r.next, "", ...footer(b).map((t) => t.replace(/\[([^\]]+)\]\((https:[^)]+)\)/g, "$2"))]);
  return { subject: w.subject, html, text };
}
