// 2 The Certificate. Product mail, the way signing services and Stripe prove an event: the logo on
// the ground, one rounded card. Inside it a status line, the news as a sans heading, one button,
// the signed file drawn as a file row, then every signer as a row (initials, name and role, status
// and time), then the document's details with its ID. Sans-led and scanned, left-aligned.
import { T, button, esc, gap, inline, keep, logoImg, mix, paint, parties, readable, shell, side, sp, splitWhen, stack, textOf } from "../r3lib.mjs";
import { neutral, operatorWords, receiptWords, signerWords } from "../copy.mjs";

const initials = (n) => {
  const w = n.replace(/\([^)]*\)/g, " ").trim().split(/\s+/);
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

function card(b, o) {
  const serif = stack(b.faces.serif, "serif");
  const sans = stack(b.faces.sans, "sans-serif");
  const green = readable(b.paper, b.deep);
  const amber = b.goldText;
  const P = (t, x = {}) => `<p style="margin:${x.mt ?? 0}px 0 0;font-family:${sans};font-size:${x.size ?? 16}px;line-height:${x.lh ?? 24}px;color:${x.color ?? b.ink};word-wrap:break-word">${neutral(inline(keep(t), b.link))}</p>`;
  const rule = (m = 22) => `${gap(m)}${T(`<tr><td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${b.rule}">&nbsp;</td></tr>`)}${gap(m - 2)}`;
  const dot = (c) => `<td width="18" valign="middle" style="width:18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="10" height="10" ${paint(c)}width:10px;height:10px;border-radius:5px;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td>`;
  const status = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${dot(o.done ? green : b.gold)}<td valign="middle" style="font-family:${sans};font-size:15px;line-height:20px;font-weight:600;color:${o.done ? green : amber}">${esc(o.status)}</td></tr></table>`;
  const head = b.logo ? logoImg(b.logo, 210, b.ground, serif, b.ink) : `<p style="margin:0;font-family:${serif};font-size:20px;line-height:26px;color:${b.ink}">${esc(b.name)}</p>`;

  const fileRow = o.file
    ? `${gap(14)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${b.rule};border-radius:8px;border-collapse:separate"><tr><td width="52" valign="middle" style="width:52px;padding:12px 0 12px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="48" align="center" valign="middle" ${paint(b.tint)}width:40px;height:48px;border-radius:4px;font-family:${sans};font-size:13px;line-height:16px;font-weight:600;color:${b.mutedOnTint}">PDF</td></tr></table></td><td valign="middle" style="padding:12px 14px 12px 4px"><p style="margin:0;font-family:${sans};font-size:15px;line-height:21px;color:${b.ink};word-wrap:break-word;overflow-wrap:anywhere">${esc(o.file.name)}</p><p style="margin:2px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${b.muted}">${esc(o.file.note)}</p></td></tr></table>`
    : "";

  const signers = (o.sigs ?? [])
    .map((p) => {
      const w = splitWhen(p.when);
      const av = p.signed
        ? `<td width="38" height="38" align="center" valign="middle" ${paint(b.tint)}width:38px;height:38px;border-radius:19px;font-family:${sans};font-size:14px;line-height:38px;font-weight:600;color:${b.mutedOnTint}">${esc(initials(p.name))}</td>`
        : `<td width="36" height="36" align="center" valign="middle" ${paint(b.paper)}width:36px;height:36px;border-radius:19px;border:1px dashed ${b.muted};font-family:${sans};font-size:14px;line-height:36px;font-weight:600;color:${b.muted}">${esc(initials(p.name))}</td>`;
      return `<tr><td width="50" valign="top" style="width:50px;padding:12px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${av}</tr></table></td>
<td valign="top" style="padding:12px 10px 12px 0"><p style="margin:0;font-family:${sans};font-size:16px;line-height:22px;font-weight:600;color:${b.ink};word-wrap:break-word">${esc(p.name)}</p><p style="margin:1px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${b.muted}">${esc(p.role)}</p></td>
<td width="104" valign="top" align="right" style="width:104px;padding:12px 0"><p style="margin:0;font-family:${sans};font-size:14px;line-height:22px;font-weight:600;color:${p.signed ? green : amber};text-align:right">${p.signed ? "Signed" : "Waiting"}</p><p style="margin:1px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${b.muted};text-align:right">${p.signed ? esc(keep(`${w.time} ${w.zone}`.trim())) : "Not signed yet"}</p></td></tr>`;
    })
    .join(`<tr><td colspan="3" height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${b.rule}">&nbsp;</td></tr>`);

  const details = (o.details ?? [])
    .map((d) => {
      const v = `font-family:${d.mono ? b.faces.mono : sans};font-size:${d.mono ? 15 : 16}px;line-height:22px;color:${b.ink};word-wrap:break-word;overflow-wrap:anywhere`;
      return d.value.length > 44
        ? `<tr><td colspan="2" style="padding:9px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${b.muted}">${esc(d.label)}</td></tr><tr><td colspan="2" style="padding:3px 0 9px;${v}">${neutral(esc(keep(d.value)))}</td></tr>`
        : `<tr><td valign="top" width="38%" style="padding:9px 12px 9px 0;font-family:${sans};font-size:14px;line-height:22px;color:${b.muted}">${esc(d.label)}</td><td valign="top" style="padding:9px 0;${v}">${neutral(esc(keep(d.value)))}</td></tr>`;
    })
    .join("");

  const inner = `${status}
<h1 style="margin:16px 0 0;font-family:${sans};font-size:28px;line-height:34px;font-weight:600;letter-spacing:-.01em;color:${b.ink}">${esc(o.headline)}</h1>
${P(o.sub, { color: b.muted, mt: 6 })}
${o.lead.map((t, i) => P(t, { mt: i ? 8 : 16 })).join("")}
${o.button ? `${gap(22)}${button(o.button.url, o.button.label, { bg: b.deep, fg: b.onDeep, font: sans, radius: 8 })}` : ""}
${fileRow}
${o.sigs?.length ? `${rule(26)}${T(`<tr><td style="font-family:${sans};font-size:15px;line-height:20px;font-weight:600;color:${b.ink}">Signers</td><td align="right" style="font-family:${sans};font-size:14px;line-height:20px;color:${b.muted};text-align:right">${esc(o.sigCount)}</td></tr>`)}${gap(4)}${T(signers)}` : ""}
${o.details?.length ? `${rule(22)}<p style="margin:0 0 4px;font-family:${sans};font-size:15px;line-height:20px;font-weight:600;color:${b.ink}">${esc(o.detailsTitle)}</p>${T(details)}` : ""}
${(o.after ?? []).length ? `${rule(22)}${o.after.map((t, i) => P(t, { mt: i ? 6 : 0 })).join("")}` : ""}`;

  const body = T(`<tr><td ${paint(b.ground)}padding:28px ${side(20)} 36px">
${T(`<tr><td style="padding:0 0 0 ${side(6, 560)}">${head}</td></tr>`)}
${gap(18)}
${T(`<tr><td ${paint(b.paper)}border:1px solid ${mix(b.ink, b.ground, 0.1)};border-radius:12px;padding:26px ${side(22, 560)} 26px">${inner}</td></tr>`, 'style="border-collapse:separate"')}
${gap(20)}
${T(`<tr><td style="padding:0 ${side(6, 560)}">${o.footer.map((t, i) => P(t, { size: 14, lh: 21, color: b.mutedOnGround, mt: i ? 6 : 0 })).join("")}</td></tr>`)}
</td></tr>`);
  return shell({ subject: o.subject, preheader: o.preheader, fontsHref: b.fontsHref, ground: b.ground, body });
}

const siteMd = (b) => (b.site ? ` [${b.siteLabel}](${b.site})` : "");
const siteTx = (b) => (b.site ? ` ${b.site}` : "");
const sigsOf = (m) => parties(m).map((p) => ({ ...p, role: m.pdfRole?.[p.role] ?? p.role }));
const docLine = (m) => `${m.docTitle}, ${m.terms[0].value}`;

export function signer(m, b) {
  const w = signerWords(m);
  const headline = w.complete ? "The lease is fully signed." : "You signed the lease.";
  const lead = w.complete
    ? [`All ${w.total} signers are done, the last at ${keep(`${w.when.time} ${w.when.zone}`)} on ${w.when.day}.`, ...(m.nextStep ? [`${m.nextStep.what} is ${m.nextStep.when}.`] : [])]
    : [`Signed ${w.stamp}. ${w.whatLeft} ${w.promise}`];
  const o = {
    subject: w.subject, preheader: w.preheader, done: w.complete,
    status: w.complete ? "Completed" : `Waiting on ${w.left}`,
    headline, sub: docLine(m), lead,
    button: { url: m.button.url, label: w.complete ? "Open the signed lease" : "Open your copy" },
    file: m.attached ? { name: m.attachmentName, note: "Attached to this email" } : null,
    sigCount: `${w.signedCount} of ${w.total} signed`,
    sigs: sigsOf(m),
    detailsTitle: "Document details",
    details: [
      { label: "Lease number", value: m.leaseNo },
      { label: "Term", value: `${m.terms.find((t) => t.label === "Term").value}` },
      { label: "Document ID", value: m.fingerprint, mono: true },
    ],
    footer: [`Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteMd(b)}`],
  };
  const text = textOf([
    o.status, "", headline, o.sub, "", ...lead, "", `${o.button.label}: ${o.button.url}`, ...(o.file ? [`${o.file.name}: ${o.file.note}`] : []), "",
    `Signers, ${o.sigCount}`, ...o.sigs.map((p) => `${p.name}, ${p.role}: ${p.signed ? `signed ${p.when}` : "waiting, not signed yet"}`), "",
    "Document details", ...o.details.map((d) => `${d.label}: ${d.value}`), "", `Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteTx(b)}`,
  ]);
  return { subject: w.subject, html: card(b, o), text };
}

export function operator(m, b) {
  const w = operatorWords(m);
  const n = parties(m).length;
  const o = {
    subject: w.subject, preheader: w.preheader, done: w.complete,
    status: w.complete ? "Completed. Nothing waits on you." : `Waiting on ${w.left}`,
    headline: `${m.signedBy} signed.`,
    sub: docLine(m),
    lead: [w.complete ? `That makes ${n} of ${n}: the lease is fully signed. The signed PDF went to every signer.` : `${w.left} has not signed yet.`],
    button: { url: m.button.url, label: m.button.label },
    file: { name: m.attachmentName, note: "Attached to this email" },
    sigCount: `${n} of ${n} signed`,
    sigs: sigsOf(m),
    detailsTitle: "Record",
    details: [{ label: "Lease number", value: m.leaseNo }, { label: "Agreement", value: m.agreementId, mono: true }, { label: "Document ID", value: m.fingerprint, mono: true }],
    footer: [`Sent to the ${b.name} inbox each time someone signs.`],
  };
  const text = textOf([o.status, "", o.headline, o.sub, "", ...o.lead, "", `${o.button.label}: ${o.button.url}`, `${o.file.name}: ${o.file.note}`, "", `Signers, ${o.sigCount}`, ...o.sigs.map((p) => `${p.name}, ${p.role}: signed ${p.when}`), "", "Record", ...o.details.map((d) => `${d.label}: ${d.value}`), "", o.footer[0]]);
  return { subject: w.subject, html: card(b, o), text };
}

export function receipt(r, b) {
  const w = receiptWords(r, b);
  const o = {
    subject: w.subject, preheader: w.preheader, done: true,
    status: `Received ${keep(r.sentWhen)}`,
    headline: "Your inquiry is in.",
    sub: r.home,
    lead: [r.next.join(" ")],
    detailsTitle: "Your answers",
    details: r.received.filter((f) => f.label !== "Home").concat([{ ...r.reference, mono: true }]),
    footer: [`Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteMd(b)}`],
  };
  const text = textOf([`Received ${r.sentWhen}`, "", o.headline, o.sub, "", ...o.lead, "", "Your answers", ...o.details.map((d) => `${d.label}: ${d.value}`), "", `Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteTx(b)}`]);
  return { subject: w.subject, html: card(b, o), text };
}
