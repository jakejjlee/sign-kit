// Round 3 email board: the shared mechanics every direction keeps (from signer-email-core.ts).
// Only composition, type, hierarchy and detailing differ between directions; this file holds the
// parts that must not: the document shell, the hidden preheader, the 600px table cap with its
// Outlook twin, the VML button, percentage side margins, bgcolor plus style on painted cells,
// the font stacks that never fall to Times New Roman, and the plain-text builder.

export const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);

/* ----------------------------------------------------------------- color -- */
const rgb = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};
export const mix = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
};
/** First candidate that reads 4.5:1 on bg; else the first darkened until it does. */
export const readable = (bg, ...c) => {
  const ok = c.find((x) => x && contrast(x, bg) >= 4.5);
  if (ok) return ok;
  let x = c[0], t = 0;
  while (contrast(x, bg) < 4.5 && t < 1) x = mix("#000000", c[0], (t += 0.05));
  return x;
};

/* ---------------------------------------------------------------- stacks -- */
/** A stack never falls to Times New Roman: Georgia is the serif floor, Arial the sans floor. */
export function stack(s, generic) {
  const parts = s.split(",").map((p) => p.trim()).filter((p) => p && !/^'?times new roman'?$/i.test(p) && p !== "serif" && p !== "sans-serif" && p !== "cursive");
  if (generic === "serif" && !parts.some((p) => /georgia/i.test(p))) parts.push("Georgia");
  if (generic === "sans-serif" && !parts.some((p) => /arial|helvetica/i.test(p))) parts.push("Arial");
  return `${parts.join(",")},${generic}`;
}

/* ---------------------------------------------------------------- layout -- */
export const PAD = "&zwnj;&nbsp;".repeat(90);
export const T = (inner, attrs = "") => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs}>${inner}</table>`;
export const gap = (h) => `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`;
export const sp = (h) => `<tr><td height="${h}" style="height:${h}px;font-size:1px;line-height:${h}px">&nbsp;</td></tr>`;
/** A side margin `px` wide at 600 that shrinks with the screen, no media query. */
export const side = (px, box = 600) => `${+((px / box) * 100).toFixed(3)}%`;
/** A painted cell: bgcolor and style both, so Outlook keeps the color. */
export const paint = (bg) => `bgcolor="${bg}" style="background:${bg};`;

/** `[label](https://url)` becomes an inline link; everything else is escaped. */
export function inline(text, link) {
  return esc(text).replace(/\[([^\]]+)\]\((https:[^)]+)\)/g, (_m, l, u) => `<a href="${u}" style="color:${link};text-decoration:underline;text-underline-offset:3px">${l}</a>`);
}
export function stripLinks(text) {
  return text.replace(/\[([^\]]+)\]\((https:[^)]+)\)/g, (_m, l, u) => (/^[^\s]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(l) ? u : `${l}: ${u}`));
}

/** Keeps "2:00 PM EST" on one line. */
export const keep = (s) => String(s).replace(/(\d{1,2}:\d{2}) (AM|PM)( [A-Z]{2,5})?/g, (_m, t, ap, z) => `${t} ${ap}${z ? ` ${z.trim()}` : ""}`);
export const plain = (s) => String(s).replace(/ /g, " ");

/**
 * The one button: a plain full-width link in every client, a VML twin for Outlook. 56px tall.
 * `radius` and `align` are the only things a direction may change.
 */
export function button(href, label, { bg, fg, font, radius = 6, size = 17, weight = 600 }) {
  const safe = esc(href);
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safe}" style="height:56px;v-text-anchor:middle;width:536px" arcsize="${Math.round((radius / 56) * 100)}%" fillcolor="${bg}" stroke="f"><w:anchorlock/><center style="color:${fg};font-family:Arial,sans-serif;font-size:${size}px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="background:${bg};border-radius:${radius}px"><a href="${safe}" style="display:block;height:56px;line-height:56px;padding:0 16px;font-family:${font};font-size:${size}px;font-weight:${weight};color:${fg};text-align:center;text-decoration:none">${esc(label)}</a></td></tr></table><!--<![endif]-->`;
}

/** A logo image: hosted, alt text, width attribute, height:auto, its own ground painted in. */
export function logoImg(l, w, ground, fallbackFont, ink, align = "left") {
  const h = Math.round((w * l.height) / l.width);
  return `<img src="${esc(l.src)}" width="${w}" height="${h}" alt="${esc(l.alt)}" bgcolor="${ground}" style="display:block;width:${w}px;max-width:100%;height:auto;border:0;${align === "center" ? "margin:0 auto;" : ""}background:${ground};font-family:${fallbackFont};font-size:18px;line-height:24px;color:${ink}">`;
}

/**
 * The document shell every direction shares: light-only, phone auto-linking off, hidden padded
 * preheader, a full-width ground table, the 600px cap on a TABLE plus the Outlook 600 table.
 */
export function shell({ subject, preheader, fontsHref, ground, body }) {
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--><title>${esc(subject)}</title>${fontsHref ? `<link href="${esc(fontsHref)}" rel="stylesheet">` : ""}
<style>:root{color-scheme:light only;supported-color-schemes:light}body{margin:0;padding:0;-webkit-text-size-adjust:100%;text-size-adjust:100%}img{-ms-interpolation-mode:bicubic}</style></head>
<body style="margin:0;padding:0;background:${ground}" bgcolor="${ground}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:13px;line-height:13px;color:${ground};mso-hide:all">${esc(keep(preheader))}${PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${ground}" style="background:${ground}"><tr><td align="center" style="padding:0">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto"><tr><td align="left" style="padding:0">${body}</td></tr></table>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table>
</body></html>`;
}

/* ------------------------------------------------------------ model reads -- */
export const joinNames = (n) => (n.length <= 1 ? n[0] ?? "" : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`);
export const termOf = (m, label) => {
  const t = (m.terms ?? m.record ?? []).find((x) => x.label.toLowerCase() === label.toLowerCase());
  return t ? (Array.isArray(t.value) ? t.value.join(", ") : t.value) : undefined;
};
/** "November 23, 2026, 2:00 PM EST" to { day: "November 23, 2026", time: "2:00 PM", zone: "EST" }. */
export function splitWhen(s) {
  const m = /^([A-Z][a-z]+ \d{1,2}, \d{4}),? (?:at )?(\d{1,2}:\d{2}) (AM|PM)(?: ([A-Z]{2,5}))?/.exec(s ?? "");
  return m ? { day: m[1], time: `${m[2]} ${m[3]}`, zone: m[4] ?? "" } : { day: s ?? "", time: "", zone: "" };
}
/** Every party in the order the document prints them, each with its state. */
export function parties(m) {
  const list = [
    ...(m.others ?? []).map((o) => ({ ...o, signed: true })),
    { name: m.signedBy, role: m.signedRole, when: m.signedWhen, signed: true, isReader: true },
    ...m.waiting.map((w) => ({ ...w, signed: false })),
  ];
  if (m.order) list.sort((a, b) => m.order.indexOf(a.name) - m.order.indexOf(b.name));
  return list;
}
export const firstName = (n) => n.split(" ")[0];

/** Plain-text twin: every line the HTML prints, in order. */
export const textOf = (lines) => lines.filter((l) => l !== undefined && l !== null).map(plain).join("\n").replace(/\n{3,}/g, "\n\n").trim();
