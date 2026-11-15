// The three new directions and option 0+. Each takes a surface model (lib.mjs) and a brand and
// returns one complete email as HTML. Tables, inline styles, bgcolor on every painted cell, 600px
// maximum, light only, live text first, real logo with alt text, web font then a deliberate fallback.
import { BRANDS, esc, inline, fontsLink, BOOK_URL, mix } from "./lib.mjs";

const PAD = "&zwnj;&nbsp;".repeat(90);

/* ---------------------------------------------------------------- shell -- */
export function shell({ m, b, ground, body, mobile = "" }) {
  return `<!doctype html>
<html lang="en" data-medium="email" data-no-hero="email, not a page" data-surface="document" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<title>${esc(m.subject)}</title>
<link href="${fontsLink(b)}" rel="stylesheet">
<style>:root{color-scheme:light only;supported-color-schemes:light}body{margin:0;padding:0;-webkit-text-size-adjust:100%;text-size-adjust:100%}img{-ms-interpolation-mode:bicubic}a{text-underline-offset:3px}@media (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:28px!important;line-height:34px!important}.lc{display:block!important;width:100%!important;padding:14px 0 0!important;border-top:1px solid #d9d2c1!important}.vc{display:block!important;padding:2px 0 14px!important;border-top:0!important}.dt{font-size:22px!important;line-height:28px!important}.tp{padding:18px 14px 16px!important}.tv1{font-size:30px!important;line-height:34px!important}.tv2{font-size:24px!important;line-height:28px!important}.tv3{font-size:20px!important;line-height:25px!important}.tv4{font-size:18px!important;line-height:23px!important}${mobile}}@media (max-width:600px){.hm{display:none!important;max-height:0!important;overflow:hidden!important}.pw{max-width:100%!important}}</style>
</head>
<body data-medium="email" data-surface="document" style="margin:0;padding:0;background:${ground}" bgcolor="${ground}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:13px;line-height:13px;color:${ground};mso-hide:all">${esc(m.preheader)}${PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${ground}" style="background:${ground}"><tr><td align="center" style="padding:0">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<div style="max-width:600px;margin:0 auto;text-align:left">${body}</div>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}

const T = (inner, attrs = "") => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs}>${inner}</table>`;
const gap = (h) => `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`;
const sp = (h) => `<tr><td height="${h}" style="height:${h}px;font-size:1px;line-height:${h}px">&nbsp;</td></tr>`;

/** Logo with alt text that styles itself when images are off, painted on its own ground. */
function logo(b, w, bg, align = "left", extra = "") {
  const L = b.logo;
  const h = Math.round((w * L.h) / L.w);
  return `<img src="${L.src}" width="${w}" height="${h}" alt="${esc(L.alt)}" bgcolor="${bg}" style="display:block;width:${w}px;max-width:100%;height:auto;border:0;background:${bg};font-family:${b.serif};font-size:18px;line-height:24px;color:${b.ink};${align === "center" ? "margin:0 auto;" : ""}${extra}">`;
}
const wordmark = (b, color, size = 15) => `<span style="font-family:${b.wordmarkFont || b.serif};font-size:${size}px;line-height:${size + 6}px;letter-spacing:.14em;text-transform:uppercase;color:${color}">${esc(b.name)}</span>`;

function button(href, label, b, { full = true, h = 56, bg, fg } = {}) {
  const deep = bg || b.deep, on = fg || b.onDeep, s = esc(href);
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${s}" style="height:${h}px;v-text-anchor:middle;width:${full ? 552 : 280}px" arcsize="10%" fillcolor="${deep}" stroke="f"><w:anchorlock/><center style="color:${on};font-family:Arial,sans-serif;font-size:17px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${full ? "" : "max-width:320px"}"><tr><td bgcolor="${deep}" style="background:${deep};border-radius:6px"><a href="${s}" style="display:block;height:${h}px;line-height:${h}px;padding:0 28px;font-family:${b.sans};font-size:17px;font-weight:600;color:${on};text-align:center;text-decoration:none">${esc(label)}</a></td></tr></table><!--<![endif]-->`;
}

const replyLine = (m, b) =>
  m.notice
    ? `Sent to the business inbox when someone signs.`
    : m.reply
      ? `Reply to this email and it reaches ${b.name}. Or [book a call](${BOOK_URL}).`
      : "";

const para = (t, b, { size = 17, lh = 26, color, font, align = "left", mt = 0 }) =>
  !t ? "" : `<p style="margin:${mt}px 0 0;font-family:${font || b.sans};font-size:${size}px;line-height:${lh}px;color:${color};text-align:${align};word-wrap:break-word">${inline(t, b.accent)}</p>`;

/* ===================================================== D1 THE SPECIMEN == */
// The signed document drawn as a sheet of paper on a tinted ground: its title, its terms, and one
// signature line per party, so the state of the agreement is read off the object itself.
export function d1(m, b) {
  const ink = b.ink;
  const head = b.logo.markOnly
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">${logo(b, 64, b.ground, "center")}</td></tr><tr><td align="center" style="padding-top:12px">${wordmark(b, ink)}</td></tr></table>`
    : `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">${logo(b, b.key === "ps" ? 200 : b.key === "xenia" ? 250 : 210, b.ground, "center")}</td></tr></table>`;

  const rows = m.doc.rows
    .map(
      ([l, v]) =>
        `<tr><td valign="top" width="34%" style="padding:11px 12px 11px 0;border-top:1px solid ${b.rule};font-family:${b.sans};font-size:14px;line-height:21px;color:${b.muted}">${esc(l)}</td><td valign="top" style="padding:11px 0;border-top:1px solid ${b.rule};font-family:${b.serif};font-size:17px;line-height:24px;color:${ink};word-wrap:break-word">${esc(v)}</td></tr>`
    )
    .join("");

  const sigs = m.parties
    .map((p) => {
      const signed = p.state === "signed";
      return `${sp(22)}<tr><td colspan="2" style="padding:0 0 4px;font-family:${b.serif};font-style:italic;font-size:${signed ? 28 : 17}px;line-height:34px;color:${signed ? b.deep : b.muted}">${signed ? esc(p.name) : "Signature needed"}</td></tr>
<tr><td colspan="2" height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px ${signed ? "solid" : "dashed"} ${signed ? ink : "#8a8678"}">&nbsp;</td></tr>
<tr><td colspan="2" style="padding:6px 0 0;font-family:${b.sans};font-size:13px;line-height:19px;color:${b.muted}">${esc(p.name)}, ${esc(p.role)}. ${signed ? `Signed ${esc(p.when)}` : "Has not signed yet"}</td></tr>`;
    })
    .join("");

  const stamp = `<table role="presentation" align="right" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.tint}" style="background:${b.tint};border-radius:4px;padding:5px 10px;font-family:${b.sans};font-size:13px;line-height:16px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${b.accent};white-space:nowrap">${esc(m.status)}</td></tr></table>`;

  const sheet = `${T(
    `<tr><td class="px" bgcolor="${b.paper}" style="background:${b.paper};border:1px solid ${b.tint2};padding:30px 32px 30px">
${T(`<tr><td valign="top" class="dt" style="font-family:${b.serif};font-size:26px;line-height:32px;color:${ink}">${esc(m.doc.title)}</td><td valign="top" align="right" width="116">${stamp}</td></tr>
<tr><td colspan="2" style="padding:4px 0 0;font-family:${b.sans};font-size:15px;line-height:22px;color:${b.muted}">${esc(m.doc.place)}</td></tr>${sp(18)}`)}
${T(rows, 'style="border-collapse:collapse"')}
${m.parties.length ? T(sigs) : ""}
</td></tr>`
  )}${["96", "92"]
    .map((w) => T(`<tr><td align="center" style="padding:0">${T(`<tr><td width="${w}%" height="5" bgcolor="${b.paper}" style="width:${w}%;height:5px;font-size:1px;line-height:1px;background:${b.paper};border:1px solid ${b.tint2};border-top:0">&nbsp;</td></tr>`, `align="center" style="width:${w}%"`)}</td></tr>`))
    .join("")}`;

  const body = `${T(`<tr><td class="px" bgcolor="${b.ground}" style="background:${b.ground};padding:40px 28px 36px;border-top:4px solid ${b.gold}">
${head}
<h1 class="h1" style="margin:30px 0 0;font-family:${b.serif};font-size:34px;line-height:40px;font-weight:400;color:${ink};text-align:center">${esc(m.headline)}</h1>
${m.lead.map((t, i) => para(t, b, { color: b.mutedOnGround, align: "center", mt: i ? 10 : 12 })).join("")}
${m.button ? `<div style="height:24px;line-height:24px;font-size:1px">&nbsp;</div>${button(m.button.url, m.button.label, b)}` : ""}
<div style="height:28px;line-height:28px;font-size:1px">&nbsp;</div>
${sheet}
${m.attach ? para(m.attach, b, { size: 14, lh: 21, color: b.mutedOnGround, align: "center", mt: 18 }) : ""}
${(m.after || []).map((t) => para(t, b, { color: ink, align: "center", mt: 26 })).join("")}
${m.signoff ? `<p style="margin:14px 0 0;text-align:center;font-family:${b.serif};font-style:italic;font-size:26px;line-height:32px;color:${b.deep}">${esc(m.signoff.name)}</p>${para(m.signoff.title, b, { size: 14, lh: 20, color: b.mutedOnGround, align: "center" })}` : ""}
<div style="height:30px;line-height:30px;font-size:1px">&nbsp;</div>
${para(replyLine(m, b), b, { size: 14, lh: 22, color: b.mutedOnGround, align: "center" })}
${m.fine ? para(m.fine, b, { size: 13, lh: 20, color: b.mutedOnGround, align: "center", mt: 6 }) : ""}
${para(b.legal, b, { size: 13, lh: 20, color: b.mutedOnGround, align: "center", mt: 6 })}
</td></tr>`)}`;
  return shell({ m, b, ground: b.ground, body });
}

/* ========================================================= D2 THE TILES == */
// A bare paper page with one large sentence and the terms that matter drawn as big numbers in a
// grid of tinted tiles. No signature table, no steps: the numbers are the content.
export function d2(m, b) {
  const ink = b.ink;
  const big = Math.max(...m.tiles.map((t) => t.v.length));
  const tier = big <= 6 ? 1 : big <= 9 ? 2 : big <= 14 ? 3 : 4;
  const vs = { 1: 44, 2: 36, 3: 26, 4: 22 }[tier];
  const left = b.logo.markOnly
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:12px">${logo(b, 40, b.paper)}</td><td valign="middle">${wordmark(b, ink, 14)}</td></tr></table>`
    : logo(b, b.key === "ps" ? 150 : b.key === "xenia" ? 200 : 160, b.paper);

  const pill = `<table role="presentation" align="right" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.tint}" style="background:${b.tint};border-radius:999px;padding:7px 14px;font-family:${b.sans};font-size:14px;line-height:18px;font-weight:600;color:${b.accent};white-space:nowrap">${esc(m.status)}</td></tr></table>`;

  const parties = m.parties
    .map((p) => {
      const signed = p.state === "signed";
      return `<tr><td width="30" valign="top" style="padding:0;font-family:${b.sans};font-size:18px;line-height:26px;font-weight:700;color:${signed ? b.accent : "#8a8678"}">${signed ? "&#10003;" : "&#9675;"}</td><td valign="top" style="padding:0 0 8px;font-family:${b.sans};font-size:16px;line-height:26px;color:${ink}">${signed ? `${esc(p.name)} signed ${esc(p.when)}` : `${esc(p.name)} has not signed yet`}</td></tr>`;
    })
    .join("");

  const cell = (t, side) =>
    `<td width="50%" valign="top" style="padding:${side === "l" ? "0 6px 12px 0" : "0 0 12px 6px"}">${T(
      `<tr><td width="4" bgcolor="${b.gold}" style="width:4px;background:${b.gold};font-size:1px;line-height:1px">&nbsp;</td><td class="tp" bgcolor="${b.tint}" style="background:${b.tint};padding:20px 18px 18px"><p class="tv${tier}" style="margin:0;font-family:${b.serif};font-size:${vs}px;line-height:${vs + 6}px;font-weight:500;color:${ink}">${esc(t.v)}</p><p style="margin:6px 0 0;font-family:${b.sans};font-size:15px;line-height:21px;color:${b.mutedOnTint}">${esc(t.l)}</p></td></tr>`,
      `height="100%" bgcolor="${b.tint}" style="height:100%;background:${b.tint}"`
    )}</td>`;
  const grid = [];
  for (let i = 0; i < m.tiles.length; i += 2) grid.push(`<tr>${cell(m.tiles[i], "l")}${m.tiles[i + 1] ? cell(m.tiles[i + 1], "r") : '<td width="50%"></td>'}</tr>`);

  const body = T(`<tr><td class="px" bgcolor="${b.paper}" style="background:${b.paper};padding:0 32px 36px;border-top:4px solid ${b.gold}">
${gap(26)}
${T(`<tr><td valign="middle">${left}</td><td valign="middle" align="right" width="110">${pill}</td></tr>`)}
<h1 class="h1" style="margin:34px 0 0;font-family:${b.serif};font-size:38px;line-height:44px;font-weight:400;color:${ink}">${esc(m.headline)}</h1>
${para(m.doc.place.length < 70 && m.kind !== "form" ? m.doc.place : "", b, { size: 16, lh: 24, color: b.muted, mt: 6 })}
${m.lead.map((t, i) => para(t, b, { size: 18, lh: 28, color: b.muted, mt: i ? 10 : 12 })).join("")}
${m.parties.length ? `<div style="height:20px;line-height:20px;font-size:1px">&nbsp;</div>${T(parties, 'style="max-width:100%"')}` : ""}
${m.button ? `<div style="height:18px;line-height:18px;font-size:1px">&nbsp;</div>${button(m.button.url, m.button.label, b)}` : ""}
<div style="height:22px;line-height:22px;font-size:1px">&nbsp;</div>
${T(grid.join(""))}
${m.attach ? para(m.attach, b, { size: 14, lh: 21, color: b.muted, mt: 14 }) : ""}
${(m.after || []).map((t) => para(t, b, { color: ink, mt: 22 })).join("")}
${m.signoff ? `<p style="margin:12px 0 0;font-family:${b.serif};font-size:20px;line-height:26px;color:${ink}">${esc(m.signoff.name)}</p>${para(m.signoff.title, b, { size: 14, lh: 20, color: b.muted })}` : ""}
${gap(28)}
${T(`<tr><td style="border-top:1px solid ${b.rule};padding:16px 0 0">${para(replyLine(m, b), b, { size: 14, lh: 22, color: b.muted })}${m.fine ? para(m.fine, b, { size: 13, lh: 20, color: b.muted, mt: 4 }) : ""}${para(b.legal, b, { size: 13, lh: 20, color: b.muted, mt: 4 })}</td></tr>`)}
</td></tr>`);
  return shell({ m, b, ground: b.paper, body });
}

/* ======================================================== D3 THE LEDGER == */
// Everything in the email is a row of one ledger: a label column on the left, the content on the
// right, set between a heavy top rule and a heavy bottom rule. Status, who signed, who is next, the
// button and the terms are all rows, so the same columns carry the message on a desktop and a phone.
export function d3(m, b) {
  const ink = b.ink;
  const LW = 30;
  const row = (label, inner, first = false) =>
    `<tr><td class="lc" valign="top" width="${LW}%" style="padding:16px 14px 16px 0;border-top:${first ? 3 : 1}px solid ${first ? b.deep : b.rule};font-family:${b.sans};font-size:14px;line-height:21px;font-weight:600;color:${b.muted}">${esc(label)}</td><td class="vc" valign="top" style="padding:14px 0 16px;border-top:${first ? 3 : 1}px solid ${first ? b.deep : b.rule};word-wrap:break-word">${inner}</td></tr>`;
  const wide = (inner, first = false) => `<tr><td colspan="2" style="padding:${first ? "22px" : "4px"} 0 ${first ? "6px" : "22px"};border-top:${first ? 3 : 0}px solid ${b.deep}">${inner}</td></tr>`;
  const pill = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.tint}" style="background:${b.tint};border-radius:4px;padding:5px 10px;font-family:${b.sans};font-size:13px;line-height:16px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${b.accent};white-space:nowrap">${esc(m.status)}</td></tr></table>`;
  const sans = (t, o = {}) => `<p style="margin:${o.mt || 0}px 0 0;font-family:${b.sans};font-size:${o.size || 16}px;line-height:${o.lh || 24}px;color:${o.color || ink}">${inline(t, b.accent)}</p>`;
  const serif = (t, o = {}) => `<p style="margin:${o.mt || 0}px 0 0;font-family:${b.serif};font-size:${o.size || 19}px;line-height:${o.lh || 27}px;color:${o.color || ink}">${inline(t, b.accent)}</p>`;

  const rows = [];
  const signed = m.parties.filter((p) => p.state === "signed");
  const waiting = m.parties.filter((p) => p.state !== "signed");
  const statusLine = waiting.length ? `Waiting on ${waiting.map((p) => p.name).join(" and ")}` : m.kind === "form" ? "" : m.lead[0].split(". ")[0].replace(/\.$/, "") + ".";
  const mark = m.status === "Complete" || m.status === "Received" ? "&#10003;" : "&#9681;";
  rows.push(wide(`<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="44" valign="top" style="font-family:${b.sans};font-size:30px;line-height:36px;font-weight:700;color:${b.accent}">${mark}</td><td valign="top"><p style="margin:0;font-family:${b.serif};font-size:26px;line-height:34px;color:${ink}">${esc(m.status === "Received" ? "Received" : m.status === "Complete" ? "Complete" : m.status)}</p>${statusLine ? sans(statusLine, { mt: 2, size: 16, lh: 24, color: b.muted }) : ""}</td></tr></table>`, true));
  if (m.button) rows.push(wide(`${button(m.button.url, m.button.label, b)}${m.attach ? sans(m.attach, { mt: 10, size: 14, lh: 21, color: b.muted }) : ""}`));
  else if (m.attach) rows.push(wide(sans(m.attach, { size: 15, lh: 23 })));
  rows.push(`<tr><td colspan="2" height="1" style="height:1px;font-size:1px;line-height:1px;border-top:3px solid ${b.deep}">&nbsp;</td></tr>`);
  if (signed.length)
    rows.push(
      row(
        m.kind === "alert" ? "Signed by" : "Signed",
        signed
          .map((p, i) => `<p style="margin:${i ? 8 : 0}px 0 0;font-family:${b.serif};font-size:19px;line-height:27px;color:${ink}"><span style="color:${b.accent};font-family:${b.sans};font-weight:700">&#10003;</span> ${esc(p.name)}, ${esc(p.role)}</p>${sans(p.when, { size: 14, lh: 20, color: b.muted })}`)
          .join("")
      )
    );
  if (waiting.length)
    rows.push(row("Waiting on", waiting.map((p) => `<p style="margin:0;font-family:${b.serif};font-size:19px;line-height:27px;color:${ink}"><span style="color:#8a8678;font-family:${b.sans};font-weight:700">&#9675;</span> ${esc(p.name)}, ${esc(p.role)}</p>${sans("Has not signed yet", { size: 14, lh: 20, color: b.muted })}`).join("")));
  if (m.kind === "waiting") rows.push(row("What happens next", sans(m.lead[0], { size: 16, lh: 25 })));
  else if (m.kind === "form") rows.push(row("Reply", m.lead.map((t, i) => sans(t, { mt: i ? 8 : 0, size: 16, lh: 25 })).join("")));
  if (m.kind === "form") rows.push(row("What you sent", m.doc.rows.map(([l, v], i) => `${sans(l, { size: 13, lh: 18, color: b.muted, mt: i ? 10 : 0 })}${serif(v, { size: 18, lh: 25 })}`).join("")));
  else
    m.doc.rows.forEach(([l, v]) => rows.push(row(l, serif(v, { size: 18, lh: 25 }))));
  if (m.after) rows.push(row("Talk sooner", m.after.map((t) => sans(t, { size: 16, lh: 24 })).join("")));

  const top = b.logo.markOnly
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:12px">${logo(b, 44, b.paper)}</td><td valign="middle">${wordmark(b, ink, 14)}</td></tr></table>`
    : logo(b, b.key === "ps" ? 168 : b.key === "xenia" ? 210 : 180, b.paper);

  const body = T(`<tr><td class="px" bgcolor="${b.paper}" style="background:${b.paper};padding:0 32px 34px;border-top:4px solid ${b.gold}">
${gap(30)}
${top}
<h1 class="h1" style="margin:30px 0 0;font-family:${b.serif};font-size:36px;line-height:42px;font-weight:400;color:${ink}">${esc(m.headline)}</h1>
${para(m.doc.place.length < 70 && m.kind !== "form" ? m.doc.place : "", b, { size: 16, lh: 24, color: b.muted, mt: 6 })}
${gap(26)}
${T(rows.join(""), `style="border-collapse:collapse;border-bottom:3px solid ${b.deep}"`)}
${m.signoff ? `<p style="margin:22px 0 0;font-family:${b.serif};font-style:italic;font-size:26px;line-height:32px;color:${b.deep}">${esc(m.signoff.name)}</p>${para(m.signoff.title, b, { size: 14, lh: 20, color: b.muted })}` : ""}
${gap(22)}
${para(replyLine(m, b), b, { size: 14, lh: 22, color: b.muted })}
${m.fine ? para(m.fine, b, { size: 13, lh: 20, color: b.muted, mt: 4 }) : ""}
${para(b.legal, b, { size: 13, lh: 20, color: b.muted, mt: 4 })}
</td></tr>`);
  return shell({ m, b, ground: b.paper, body });
}

/* ================================================= 0+ THE TRACK, PROPERLY == */
// The same skeleton as the live Track (a band, a three-step track, one button, terms as rows, a
// closing band), with its faults corrected: real logo, real faces, a track whose text cannot
// collapse, a slimmer band, and a button that is a full tap target.
function steps(m) {
  const s = [];
  if (m.kind === "form") {
    s.push({ st: "done", t: "Inquiry sent", d: "Received November 14, 2026" });
    s.push({ st: "now", t: "Jake reads it", d: "I review every one personally." });
    s.push({ st: "later", t: "You hear back", d: "Within one business day." });
    return s;
  }
  const signed = m.parties.filter((p) => p.state === "signed");
  const waiting = m.parties.filter((p) => p.state !== "signed");
  const first = m.kind === "alert" ? `${signed[0].name} signed` : "You signed";
  s.push({ st: "done", t: first, d: signed[0].when });
  if (waiting.length) {
    s.push({ st: "now", t: `Waiting on ${waiting.map((w) => w.name).join(" and ")}`, d: "The agreement is not complete until then." });
    s.push({ st: "later", t: "You get the finished copy", d: "A PDF from this address, the moment every party has signed." });
  } else s.push({ st: "done", t: "Agreement complete", d: "Every party has signed." });
  return s;
}

export function d0p(m, b) {
  const ink = b.ink;
  const mk = (st, n) =>
    st === "done"
      ? `<td width="32" height="32" align="center" valign="middle" bgcolor="${b.deep}" style="width:32px;height:32px;background:${b.deep};border-radius:16px;font-family:${b.sans};font-size:16px;line-height:32px;font-weight:700;color:${b.goldOnDeep}">&#10003;</td>`
      : st === "now"
        ? `<td width="28" height="28" align="center" valign="middle" bgcolor="#ffffff" style="width:28px;height:28px;background:#ffffff;border:2px solid ${b.deep};border-radius:16px;font-family:${b.sans};font-size:14px;line-height:28px;font-weight:700;color:${b.deep}">${n}</td>`
        : `<td width="28" height="28" align="center" valign="middle" bgcolor="${b.paper}" style="width:28px;height:28px;background:${b.paper};border:2px dashed #8a8678;border-radius:16px;font-family:${b.sans};font-size:14px;line-height:28px;font-weight:700;color:#5c5446">${n}</td>`;
  const st = steps(m);
  const track = st
    .map((s, i) => {
      const last = i === st.length - 1;
      const line = s.st === "done" ? b.deep : "#8a8678";
      return `<tr><td width="40" valign="top" style="padding:0;width:40px"><table role="presentation" width="32" cellpadding="0" cellspacing="0" border="0"><tr>${mk(s.st, i + 1)}</tr></table></td><td valign="top" style="padding:2px 0 ${last ? 0 : 6}px 14px"><p style="margin:0;font-family:${b.serif};font-size:21px;line-height:27px;color:${ink}">${esc(s.t)}</p><p style="margin:2px 0 0;font-family:${b.sans};font-size:16px;line-height:23px;color:${b.muted}">${esc(s.d)}</p></td></tr>${last ? "" : `<tr><td width="40" align="left" style="padding:0 0 0 15px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="2" height="26" bgcolor="${line}" style="width:2px;height:26px;background:${line};font-size:1px;line-height:1px">&nbsp;</td></tr></table></td><td style="padding:0">&nbsp;</td></tr>`}`;
    })
    .join("");
  const rows = m.doc.rows
    .map(([l, v]) => `<tr><td valign="top" width="36%" style="padding:12px 12px 12px 0;border-top:1px solid ${b.rule};font-family:${b.sans};font-size:15px;line-height:22px;color:${b.muted}">${esc(l)}</td><td valign="top" style="padding:12px 0;border-top:1px solid ${b.rule};font-family:${b.serif};font-size:18px;line-height:25px;color:${ink};word-wrap:break-word">${esc(v)}</td></tr>`)
    .join("");
  const markCell = `<td valign="middle" style="padding-right:14px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.paper}" style="background:${b.paper};padding:${b.logo.markOnly ? "0" : "8px 12px"};border-radius:${b.logo.markOnly ? "22px" : "6px"}">${logo(b, b.logo.markOnly ? 44 : 120, b.paper)}</td></tr></table></td>`;
  const band = T(`<tr><td class="px" bgcolor="${b.deep}" style="background:${b.deep};padding:16px 28px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${markCell}<td valign="middle">${b.logo.markOnly ? `<span style="font-family:${b.wordmarkFont || b.serif};font-size:14px;line-height:20px;letter-spacing:.14em;text-transform:uppercase;color:${b.onDeep}">${esc(b.name)}</span><br>` : ""}<span style="font-family:${b.sans};font-size:14px;line-height:20px;color:${b.goldOnDeep}">${esc(m.doc.title)}</span></td></tr></table></td></tr>`);
  const panel = T(`<tr><td class="px" bgcolor="${b.paper}" style="background:${b.paper};padding:36px 28px 30px">
<h1 class="h1" style="margin:0 0 6px;font-family:${b.serif};font-size:36px;line-height:42px;font-weight:400;color:${ink}">${esc(m.headline)}</h1>
<p style="margin:0 0 30px;font-family:${b.sans};font-size:16px;line-height:24px;color:${b.muted}">${esc(m.doc.place)}</p>
${T(track, 'style="margin:0 0 32px"')}
${m.button ? `<div style="margin:0 0 8px">${button(m.button.url, m.button.label, b, { full: false })}</div>` : ""}
${m.attach ? para(m.attach, b, { size: 15, lh: 23, color: b.muted, mt: 12 }) : ""}
${(m.after || []).map((t) => para(t, b, { size: 17, lh: 26, color: ink, font: b.serif, mt: 18 })).join("")}
${m.signoff ? `<p style="margin:14px 0 0;font-family:${b.serif};font-size:20px;line-height:26px;color:${ink}">${esc(m.signoff.name)}</p>${para(m.signoff.title, b, { size: 14, lh: 20, color: b.muted })}` : ""}
${T(rows, `style="border-collapse:collapse;border-bottom:1px solid ${b.rule};margin:34px 0 0"`)}
${m.fine ? para(m.fine, b, { size: 13, lh: 21, color: b.muted, mt: 16 }) : ""}
</td></tr>`);
  const foot = T(`<tr><td class="px" bgcolor="${b.deep}" style="background:${b.deep};padding:22px 28px"><p style="margin:0;font-family:${b.sans};font-size:15px;line-height:23px;color:${b.onDeep}">${replyLine(m, b) ? inline(replyLine(m, b), b.goldOnDeep) : esc(b.name)}</p><p style="margin:6px 0 0;font-family:${b.sans};font-size:13px;line-height:20px;color:${b.goldOnDeep}">${esc(b.legal)}</p></td></tr>`);
  return shell({ m, b, ground: b.ground, body: band + panel + foot });
}
