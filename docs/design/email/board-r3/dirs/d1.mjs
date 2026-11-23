// 1 The Counterpart. A dated letter on the business's own paper: letterhead rule, dateline, a Re
// line with the lease number, the news as one sentence in the serif, one button, then the lease's
// signature page (section 24) reproduced as it reads on the PDF: role, the signature in the same
// script, the printed name, the date. The fingerprint closes the letter. Paper edge to edge, no
// card, no tint, everything left-aligned. Serif-led: the body is read, not scanned.
import { T, button, esc, gap, inline, keep, logoImg, paint, parties, shell, side, sp, splitWhen, stack, textOf } from "../r3lib.mjs";
import { neutral, operatorWords, receiptWords, signerWords } from "../copy.mjs";

function page(b, o) {
  const serif = stack(b.faces.serif, "serif");
  const sans = stack(b.faces.sans, "sans-serif");
  const script = stack(b.faces.script, "serif");
  const P = (t, x = {}) => `<p style="margin:${x.mt ?? 0}px 0 0;font-family:${x.font ?? serif};font-size:${x.size ?? 18}px;line-height:${x.lh ?? 28}px;color:${x.color ?? b.ink};word-wrap:break-word">${neutral(inline(keep(t), b.link))}</p>`;
  const small = (t, mt = 0, color = b.muted) => P(t, { font: sans, size: 14, lh: 21, color, mt });
  const head = b.logo ? logoImg(b.logo, 250, b.paper, serif, b.ink) : `<p style="margin:0;font-family:${serif};font-size:21px;line-height:26px;color:${b.ink}">${esc(b.name)}</p>`;
  const section = (title, sub) => `${gap(34)}<p style="margin:0;font-family:${sans};font-size:15px;line-height:20px;font-weight:600;color:${b.ink}">${esc(title)}</p>${sub ? small(sub, 2) : ""}${gap(4)}`;

  const sigs = (o.sigs ?? [])
    .map((p) => {
      const w = splitWhen(p.when);
      return `${sp(18)}<tr><td style="font-family:${sans};font-size:14px;line-height:20px;color:${b.muted}">${esc(p.role)}</td></tr>
<tr><td style="padding:2px 0 0;height:46px;vertical-align:bottom;font-family:${p.signed ? script : serif};${p.signed ? "" : "font-style:italic;"}font-size:${p.signed ? 34 : 17}px;line-height:${p.signed ? 44 : 30}px;color:${p.signed ? b.ink : b.muted};word-wrap:break-word">${p.signed ? esc(p.name) : "Awaiting signature"}</td></tr>
<tr><td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px ${p.signed ? "solid" : "dashed"} ${p.signed ? b.ink : b.muted}">&nbsp;</td></tr>
<tr><td style="padding:7px 0 0;font-family:${sans};font-size:15px;line-height:22px;color:${b.ink}">${esc(p.name)}</td></tr>
<tr><td style="font-family:${sans};font-size:14px;line-height:21px;color:${b.muted}">${p.signed ? esc(keep(`${w.day}, ${w.time}${w.zone ? ` ${w.zone}` : ""}`)) : "Not signed yet"}</td></tr>`;
    })
    .join("");
  const fields = (o.fields ?? [])
    .map((f) => `${sp(14)}<tr><td style="font-family:${sans};font-size:14px;line-height:20px;color:${b.muted}">${esc(f.label)}</td></tr><tr><td style="padding:3px 0 0;font-family:${f.mono ? b.faces.mono : serif};font-size:${f.mono ? 16 : 18}px;line-height:27px;color:${b.ink};word-wrap:break-word;overflow-wrap:anywhere">${neutral(esc(keep(f.value)))}</td></tr>`)
    .join("");

  const body = T(`<tr><td ${paint(b.paper)}padding:34px ${side(36)} 40px">
${head}
${gap(16)}${T(`<tr><td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${b.ink}">&nbsp;</td></tr>`)}
${small(o.date, 16)}
${P(`Re: ${o.re}`, { size: 17, lh: 25, mt: 8 })}
${o.ref ? small(o.ref, 2) : ""}
<h1 style="margin:30px 0 0;font-family:${serif};font-size:31px;line-height:38px;font-weight:400;color:${b.ink}">${esc(o.headline)}</h1>
${o.lead.map((t, i) => P(t, { mt: i ? 10 : 14 })).join("")}
${o.button ? `${gap(26)}${button(o.button.url, o.button.label, { bg: b.deep, fg: b.onDeep, font: sans, radius: 3 })}` : ""}
${(o.attach ?? []).map((t) => small(t, 10)).join("")}
${o.sigs?.length ? `${section(o.sigTitle, o.sigSub)}${T(sigs)}` : ""}
${o.fields?.length ? `${section(o.fieldsTitle, o.fieldsSub)}${T(fields)}` : ""}
${(o.after ?? []).map((t, i) => P(t, { mt: i ? 8 : 30 })).join("")}
${gap(36)}${T(`<tr><td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${b.rule}">&nbsp;</td></tr>`)}
${o.footer.map((t, i) => small(t, i ? 8 : 16)).join("")}
</td></tr>`);
  return shell({ subject: o.subject, preheader: o.preheader, fontsHref: b.fontsHref, ground: b.paper, body });
}

const site = (b) => (b.site ? ` [${b.siteLabel}](${b.site})` : "");
const siteText = (b) => (b.site ? ` ${b.site}` : "");
const fpLine = (m) => `Document fingerprint ${m.fingerprint}. The fully signed PDF prints the same number at the foot of every page.`;
const sigsOf = (m) => parties(m).map((p) => ({ ...p, role: m.pdfRole?.[p.role] ?? p.role }));
const reLease = (m) => `${m.docTitle}, ${m.terms[0].value}`;
const termText = (m) => `${m.checkIn.when}, to ${m.checkout}. 31 nights.`;

export function signer(m, b) {
  const w = signerWords(m);
  const headline = w.complete ? "The lease is fully signed." : `You signed the lease at ${keep(`${w.when.time} ${w.when.zone}`)}.`;
  const lead = w.complete
    ? [`All ${w.total} signers are done, the last at ${keep(`${w.when.time} ${w.when.zone}`)}. The fully signed lease is attached as a PDF; keep it with your records.`, ...(m.nextStep ? [`${m.nextStep.what} is ${m.nextStep.when}.`] : [])]
    : [`${w.whatLeft} ${w.promise} Nothing else is needed from you.`];
  const o = {
    subject: w.subject, preheader: w.preheader, date: w.when.day, re: reLease(m), ref: `Lease number ${m.leaseNo}`,
    headline, lead,
    button: { url: m.button.url, label: w.complete ? "Open the signed lease" : "Open your copy of the lease" },
    attach: m.attached ? [`Attached: ${m.attachmentName}`] : [],
    sigTitle: "Section 24. Signatures", sigSub: w.complete ? "As it reads on the signed PDF." : "As it reads on the lease now.",
    sigs: sigsOf(m),
    fieldsTitle: "Term", fields: [{ label: "Check-in", value: m.checkIn.when }, { label: "Checkout", value: m.checkout }],
    footer: [`Reply to this email and it reaches ${b.name}.`, fpLine(m), `${b.legal}.${site(b)}`],
  };
  const text = textOf([
    w.when.day, `Re: ${o.re}`, o.ref, "", headline, "", ...lead, "", `${o.button.label}: ${o.button.url}`, ...o.attach, "",
    `${o.sigTitle}. ${o.sigSub}`, ...o.sigs.map((p) => `${p.role}: ${p.name}, ${p.signed ? `signed ${p.when}` : "not signed yet"}`), "",
    `Term: ${termText(m)}`, "", `Reply to this email and it reaches ${b.name}.`, fpLine(m), `${b.legal}.${siteText(b)}`,
  ]);
  return { subject: w.subject, html: page(b, o), text };
}

export function operator(m, b) {
  const w = operatorWords(m);
  const n = parties(m).length;
  const words = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const headline = w.complete ? `${m.signedBy} signed, the last of ${words[n] ?? n}.` : `${m.signedBy} signed.`;
  const lead = w.complete
    ? [`The lease is fully signed. The signed PDF went to every signer and is attached here. Nothing waits on you.`]
    : [`${w.left} has not signed yet.`];
  const o = {
    subject: w.subject, preheader: w.preheader, date: w.when.day, re: reLease(m), ref: `Lease number ${m.leaseNo}. Agreement ${m.agreementId}.`,
    headline, lead,
    button: { url: m.button.url, label: m.button.label },
    sigTitle: "Section 24. Signatures", sigSub: "As it reads on the signed PDF.",
    sigs: sigsOf(m),
    footer: [`Sent to the ${b.name} inbox each time someone signs.`, fpLine(m), `${b.legal}.${site(b)}`],
  };
  const text = textOf([w.when.day, `Re: ${o.re}`, o.ref, "", headline, "", ...lead, "", `${o.button.label}: ${o.button.url}`, "", `${o.sigTitle}. ${o.sigSub}`, ...o.sigs.map((p) => `${p.role}: ${p.name}, signed ${p.when}`), "", ...o.footer.map((t) => t.replace(/ \[([^\]]+)\]\((https:[^)]+)\)/g, " $2"))]);
  return { subject: w.subject, html: page(b, o), text };
}

export function receipt(r, b) {
  const w = receiptWords(r, b);
  const first = r.recipient.split(" ")[0];
  const headline = `${first}, your inquiry is in.`;
  const lead = [`We received it on ${keep(r.sentWhen)}. ${r.next.join(" ")}`];
  const o = {
    subject: w.subject, preheader: w.preheader, date: w.when.day, re: `Your inquiry about ${r.home}`, ref: `Reference ${r.reference.value}`,
    headline, lead,
    fieldsTitle: "What you sent", fieldsSub: "In your words, so you can check them.",
    fields: r.received.filter((f) => f.label !== "Home"),
    footer: [`Reply to this email and it reaches ${b.name}.`, `${b.legal}.${site(b)}`],
  };
  const text = textOf([w.when.day, `Re: ${o.re}`, o.ref, "", headline, "", ...lead, "", "What you sent", ...o.fields.map((f) => `${f.label}: ${f.value}`), "", `Reply to this email and it reaches ${b.name}.`, `${b.legal}.${siteText(b)}`]);
  return { subject: w.subject, html: page(b, o), text };
}
