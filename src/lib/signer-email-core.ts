/**
 * The signer's confirmation email, direction d3, "The Track": the ONE place
 * its design lives.
 *
 * This file imports nothing. It takes a plain description of the message (the
 * model below) and returns { subject, html, text }. Two callers describe their
 * messages differently and share every pixel:
 *
 * - the kit's own adapter, src/lib/signer-email.ts (Agreement and Execution)
 * - the Sun Mountain Stays site, which keeps a byte-for-byte copy of this file
 *   (src/lib/agreements/vendor/signer-email-core.ts) and describes its own
 *   agreements. `pnpm emails:vendor <site repo>` makes that copy and stamps it
 *   with this file's hash; the site's test fails if the copy is edited by hand
 *   or falls behind.
 *
 * A signer opens this to be certain the signature counted. So the first thing
 * on it is where they stand, drawn as a short vertical track that reads by
 * shape (a check, a number, a dashed number) AND by words, then one button to
 * the signed copy, then the key terms as rows.
 *
 * Mechanics, all of them chosen for the inboxes that actually exist:
 * - tables and inline styles only; no <style> block, no webfont, no script
 * - 600px maximum, fluid under that; body copy 16px or more, nothing under 13px
 * - every painted shape is a table cell carrying BOTH bgcolor and style, so
 *   Outlook's Word engine (which drops div backgrounds) and forced dark modes
 *   keep the colors and the track
 * - the wordmark is live text in a web-safe face; a logo is decoration and has
 *   empty alt text, so images off shows the name once, not twice
 * - the button is a plain link in every client, with a VML twin for Outlook
 * - the page declares itself light-only and switches off phone auto-linking of
 *   addresses and dates, which would otherwise turn them blue and underlined
 * - the preview line is the hidden preheader, padded so the band text cannot
 *   follow it into the inbox list
 * - "book a call" is an inline text link in the footer, never a button
 * - a plain-text twin is always built, so no send ever goes out html-only
 *
 * No phone number appears anywhere on this email. Contact is the reply.
 */

export type Palette = {
  paper: string;
  ground: string;
  ink: string;
  muted: string;
  rule: string;
  band: string;
  bandText: string;
  bandAccent: string;
};

export type Faces = { serif: string; sans: string; wordmark: string };

export type Term = { label: string; value: string | string[] };

export type EmailModel = {
  palette: Palette;
  faces: Faces;
  /** The wordmark, the footer sentence and the preheader all use this. */
  brandName: string;
  /** Small second line on the band, e.g. "Management Agreement". */
  docTitle: string;
  /**
   * The client or place that leads the subject, e.g. "309 Cranbrook Circle, Colorado Springs".
   * Empty when the document names no one, and the subject then starts with the document.
   */
  subjectPlace?: string;
  /** Under the heading: the property or document, one line per entry. */
  place: string | string[];
  /** A decorative mark beside the wordmark, painted on its own ground. */
  mark?: { src: string; ground: string };
  signedBy: string;
  /** "November 11, 2026, 6:59 PM MST". Empty when the time cannot be read. */
  signedWhen: string;
  /** Parties who have not signed. Empty means the agreement is complete. */
  waiting: { name: string; role?: string }[];
  /** The next real date after signing, when one exists. Never invented. */
  nextStep?: { what: string; when: string };
  /** Step 2 of a complete agreement, e.g. "Every party has signed." */
  completeDetail: string;
  /** Step 3 of a waiting agreement. */
  completion: { title: string; detail: string };
  button?: { url: string };
  /** Short paragraphs under the button. */
  note: string[];
  terms: Term[];
  /** Small-print sentences above "Keep this email for your records." */
  fineprint?: string[];
  bookUrl: string;
  /** Second footer line, e.g. the legal entity. */
  legalLine: string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

/* --------------------------------------------------------------- helpers -- */

export function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] as string);
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Roles read once each: ["owner", "owner", "manager"] becomes "owner and manager". */
function uniqueRoles(waiting: EmailModel["waiting"]): string {
  const seen: string[] = [];
  for (const w of waiting) {
    const r = (w.role ?? "").toLowerCase();
    if (r && !seen.includes(r)) seen.push(r);
  }
  return joinNames(seen);
}

/** Keeps "6:59 PM MST" on one line so a receipt never breaks as "6:59 / PM MST". */
export function keepTogether(s: string): string {
  return s.replace(/(\d{1,2}:\d{2}) (AM|PM)( [A-Z]{2,5})?/g, (_m, t: string, ap: string, z?: string) =>
    `${t} ${ap}${z ? ` ${z.trim()}` : ""}`
  );
}

function plain(s: string): string {
  return s.replace(/ /g, " ");
}

/* ------------------------------------------------------------- contrast -- */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isHex(v: string | undefined): v is string {
  return typeof v === "string" && hexToRgb(v) !== null;
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** The first candidate that reads at 4.5:1 on the background, else the last. */
export function readable(bg: string, ...candidates: (string | undefined)[]): string {
  const usable = candidates.filter(isHex);
  return usable.find((c) => contrast(c, bg) >= 4.5) ?? usable[usable.length - 1] ?? "#000000";
}

export type PaletteInput = {
  paper: string;
  ground: string;
  ink?: string;
  muted?: string;
  rule: string;
  /** The brand's deep color. Used as the band only if the paper reads on it. */
  band?: string;
  bandText?: string;
  accent?: string;
};

export const FALLBACK = {
  paper: "#fbf8f1",
  ground: "#f3ede1",
  ink: "#1b1a16",
  muted: "#6b6455",
  rule: "#e5dac4",
  band: "#1b1a16",
} as const;

/**
 * Every pair the email paints is checked here, not assumed: ink and muted on
 * the paper, the band against the paper it must carry as text, the band's text
 * and its accent line. A token that would fail 4.5:1 is replaced by one that
 * passes rather than shipped unreadable.
 */
export function makePalette(t: PaletteInput): Palette {
  const paper = t.paper;
  const ink = readable(paper, t.ink, FALLBACK.ink);
  const muted = readable(paper, t.muted, FALLBACK.muted, ink);
  const bandWanted = isHex(t.band) ? t.band : FALLBACK.band;
  const band = contrast(paper, bandWanted) >= 4.5 ? bandWanted : ink;
  const bandText = readable(band, t.bandText, paper, "#ffffff");
  const bandAccent = readable(band, t.accent, bandText);
  return { paper, ground: t.ground, ink, muted, rule: t.rule, band, bandText, bandAccent };
}

/* ---------------------------------------------------------------- pieces -- */

const IDLE = "#8f8570"; // the not-yet marker's border and the idle track: 3.4:1 on the paper
const IDLE_TEXT = "#5c5446";

function button(href: string, label: string, p: Palette, f: Faces): string {
  const safe = esc(href);
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safe}" style="height:52px;v-text-anchor:middle;width:260px" arcsize="12%" fillcolor="${p.band}" stroke="f"><w:anchorlock/><center style="color:${p.bandText};font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${safe}" style="display:inline-block;background:${p.band};color:${p.bandText};font-family:${f.sans};font-size:16px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;padding:16px 28px;border-radius:6px;min-height:20px">${esc(label)}</a><!--<![endif]-->`;
}

type StepState = "done" | "now" | "later";

/** A square marker drawn as a one-cell table: bgcolor and border survive Outlook and dark modes. */
function marker(state: StepState, n: number, p: Palette, f: Faces): string {
  const wrap = (inner: string) =>
    `<table role="presentation" aria-hidden="true" cellpadding="0" cellspacing="0" border="0"><tr>${inner}</tr></table>`;
  if (state === "done") {
    return wrap(
      `<td width="28" height="28" align="center" valign="middle" bgcolor="${p.band}" style="width:28px;height:28px;background:${p.band};color:${p.bandAccent};font-family:${f.sans};font-size:16px;line-height:28px;font-weight:700;border-radius:6px">&#10003;</td>`
    );
  }
  if (state === "now") {
    return wrap(
      `<td width="24" height="24" align="center" valign="middle" bgcolor="#ffffff" style="width:24px;height:24px;background:#ffffff;border:2px solid ${p.band};color:${p.band};font-family:${f.sans};font-size:14px;line-height:24px;font-weight:700;border-radius:6px">${n}</td>`
    );
  }
  return wrap(
    `<td width="24" height="24" align="center" valign="middle" bgcolor="${p.paper}" style="width:24px;height:24px;background:${p.paper};border:2px dashed ${IDLE};color:${IDLE_TEXT};font-family:${f.sans};font-size:14px;line-height:24px;font-weight:700;border-radius:6px">${n}</td>`
  );
}

/**
 * One step. The marker sits in the first row; the connecting line is a second,
 * stretchy row under it, so the line always reaches the next marker however
 * many lines the text wraps to.
 */
function step(state: StepState, n: number, title: string, detail: string, last: boolean, p: Palette, f: Faces): string {
  const text = `<p style="margin:0;font-family:${f.serif};font-size:21px;line-height:28px;color:${p.ink}">${esc(title)}</p><p style="margin:2px 0 0;font-family:${f.sans};font-size:16px;line-height:22px;color:${p.muted};word-wrap:break-word">${esc(detail)}</p>`;
  const spine = state === "done" ? p.band : IDLE;
  if (last) {
    return `<tr><td width="28" valign="top" style="padding:0;width:28px">${marker(state, n, p, f)}</td><td valign="top" style="padding:0 0 0 16px">${text}</td></tr>`;
  }
  return `<tr><td colspan="3" width="28" valign="top" style="padding:0;width:28px">${marker(state, n, p, f)}</td><td rowspan="2" valign="top" style="padding:0 0 18px 16px">${text}</td></tr><tr><td width="13" style="padding:0;width:13px;font-size:1px;line-height:1px">&nbsp;</td><td width="2" bgcolor="${spine}" style="padding:0;width:2px;background:${spine};font-size:1px;line-height:1px">&nbsp;</td><td width="13" style="padding:0;width:13px;font-size:1px;line-height:1px">&nbsp;</td></tr>`;
}

function termRow(t: Term, p: Palette, f: Faces): string {
  const value = (Array.isArray(t.value) ? t.value : [t.value]).map(esc).join("<br>");
  return `<tr><td valign="top" width="38%" style="padding:12px 12px 12px 0;border-top:1px solid ${p.rule};font-family:${f.sans};font-size:16px;line-height:22px;color:${p.muted}">${esc(t.label)}</td><td valign="top" style="padding:12px 0;border-top:1px solid ${p.rule};font-family:${f.serif};font-size:18px;line-height:24px;color:${p.ink};word-wrap:break-word">${value}</td></tr>`;
}

/** "November 11, 2026, 6:59 PM MST" or "November 11, 2026 at 6:59:12 PM MST" to "November 11, 2026". */
export function signedDay(signedWhen: string): string {
  const m = /^([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(signedWhen.trim());
  return m ? m[1] : "";
}

/**
 * The subject, built to be found by search and skimmed in a list (Jake, 2026-11-14):
 * who or where, then the document, then what happened and the day it happened.
 *
 *   309 Cranbrook Circle | Management Agreement | Signed by Michael Williams, November 11, 2026
 *   309 Cranbrook Circle | Management Agreement | Fully signed, November 11, 2026
 */
export function subjectFor(
  m: Pick<EmailModel, "waiting" | "subjectPlace" | "docTitle" | "signedBy" | "signedWhen">
): string {
  const day = signedDay(m.signedWhen);
  const what = m.waiting.length === 0 ? "Fully signed" : `Signed by ${m.signedBy}`;
  return `${m.subjectPlace ? `${m.subjectPlace} | ` : ""}${m.docTitle} | ${what}${day ? `, ${day}` : ""}`;
}

/* --------------------------------------------------------------- builder -- */

/**
 * Pure: no network, no clock, no environment, so it can be rendered to a file
 * and read before anything is ever sent.
 */
export function renderSignerEmail(m: EmailModel): BuiltEmail {
  const p = m.palette;
  const f = m.faces;
  const complete = m.waiting.length === 0;
  const names = joinNames(m.waiting.map((w) => w.name));
  const verb = m.waiting.length > 1 ? "need" : "needs";
  const roles = uniqueRoles(m.waiting);
  const when = m.signedWhen ? keepTogether(m.signedWhen) : "";
  const signedDetail = when ? `${m.signedBy}, ${when}` : m.signedBy;
  const subject = subjectFor(m);
  const heading = complete ? "It is signed and complete." : "Your signature is recorded.";
  const place = Array.isArray(m.place) ? m.place : [m.place];
  const preheader = complete
    ? `Your ${m.docTitle} with ${m.brandName} is signed and complete.`
    : `${names} still ${verb} to sign. ${m.completion.title}.`;
  const buttonLabel = complete ? "Open your signed copy" : "Open your copy";

  const steps: { state: StepState; title: string; detail: string }[] = [{ state: "done", title: "You signed", detail: signedDetail }];
  if (complete) {
    steps.push({ state: "done", title: "Agreement complete", detail: m.completeDetail });
    if (m.nextStep) steps.push({ state: "now", title: m.nextStep.what, detail: m.nextStep.when });
  } else {
    steps.push({
      state: "now",
      title: `Waiting on ${names}`,
      // A role reads well here only when it is a short title ("manager"). A long legal capacity
      // ("Owner, for himself and his operating company") garbles once lowercased and joined.
      detail:
        roles && m.waiting.every((w) => !(w.role ?? "").includes(",") && (w.role ?? "").trim().split(/\s+/).length <= 3)
          ? `The ${roles} still ${verb} to sign. The agreement is not complete until then.`
          : `${m.waiting.length > 1 ? "Their signatures are" : "That signature is"} still needed. The agreement is not complete until then.`,
    });
    steps.push({ state: "later", title: m.completion.title, detail: m.completion.detail });
  }
  const stepRows = steps.map((s, i) => step(s.state, i + 1, s.title, s.detail, i === steps.length - 1, p, f)).join("");

  const terms = m.terms.map((t) => termRow(t, p, f)).join("");
  const fine = [...(m.fineprint ?? []), "Keep this email for your records."].join(" ");

  const mark = m.mark
    ? `<td valign="middle" style="padding-right:14px"><img src="${esc(m.mark.src)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;background:${m.mark.ground}" bgcolor="${m.mark.ground}"></td>`
    : "";

  const band = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${p.band}" style="background:${p.band};padding:24px 20px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${mark}<td valign="middle"><p style="margin:0;font-family:${f.wordmark};font-size:16px;line-height:24px;letter-spacing:.12em;text-transform:uppercase;color:${p.bandText}">${esc(m.brandName)}</p><p style="margin:2px 0 0;font-family:${f.sans};font-size:14px;line-height:20px;color:${p.bandAccent}">${esc(m.docTitle)}</p></td></tr></table></td></tr></table>`;

  const footer = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${p.band}" style="background:${p.band};padding:22px 20px"><p style="margin:0;font-family:${f.sans};font-size:16px;line-height:24px;color:${p.bandText}">Reply to this email and it reaches ${esc(m.brandName)}. Or <a href="${esc(m.bookUrl)}" style="color:${p.bandAccent};text-decoration:underline">book a call</a>.</p><p style="margin:6px 0 0;font-family:${f.sans};font-size:14px;line-height:22px;color:${p.bandAccent}">${esc(m.legalLine)}</p></td></tr></table>`;

  const pad = "&zwnj;&nbsp;".repeat(90);
  const notes = m.note
    .map((n, i) => `<p style="margin:${i === 0 ? "16px" : "6px"} 0 0;font-family:${f.sans};font-size:16px;line-height:24px;color:${p.muted};word-wrap:break-word">${esc(n)}</p>`)
    .join("");

  const panel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${p.paper}" style="background:${p.paper};padding:34px 24px 30px">
<h1 style="margin:0 0 6px;font-family:${f.serif};font-size:34px;line-height:40px;font-weight:400;color:${p.ink}">${heading}</h1>
<p style="margin:0 0 28px;font-family:${f.sans};font-size:16px;line-height:24px;color:${p.muted}">${place.map(esc).join("<br>")}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 30px;table-layout:fixed">${stepRows}</table>
${m.button ? `<div style="margin:0 0 6px">${button(m.button.url, buttonLabel, p, f)}</div>` : ""}${notes}
${terms ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:1px solid ${p.rule};margin:34px 0 0">${terms}</table>` : ""}
<p style="margin:16px 0 0;font-family:${f.sans};font-size:14px;line-height:22px;color:${p.muted};word-wrap:break-word">${esc(fine)}</p>
</td></tr></table>`;

  const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${p.ground}" bgcolor="${p.ground}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:13px;line-height:13px;color:${p.ground};mso-hide:all">${esc(preheader)}${pad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${p.ground}" style="background:${p.ground}"><tr><td align="center" style="padding:0">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<div style="max-width:600px;margin:0 auto;text-align:left">${band}${panel}${footer}</div>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table>
</body></html>`;

  const lines: string[] = [heading, ...place, ""];
  steps.forEach((s, i) => lines.push(`${i + 1}) ${s.title}: ${plain(s.detail)}`));
  if (m.button) lines.push("", `${buttonLabel}: ${m.button.url}`);
  if (m.note.length) lines.push(...m.note);
  if (m.terms.length) {
    lines.push("");
    for (const t of m.terms) {
      const v = Array.isArray(t.value) ? t.value : [t.value];
      lines.push(`${t.label}: ${v.join("; ")}`);
    }
  }
  lines.push("", fine, "", `Reply to this email and it reaches ${m.brandName}. Or book a call: ${m.bookUrl}`, m.legalLine);
  const text = lines.join("\n");

  return { subject, html, text };
}

/* ------------------------------------------------------------------ lint -- */

const EM_DASH = String.fromCharCode(8212);

/**
 * The cheap checks, as a list of problems (empty means clean). Pure string
 * work, a few milliseconds per email, so every state of every agreement can be
 * checked on each test run. It does not replace looking at a render; it
 * catches what a change to the markup or the copy would silently break.
 */
export function lintSignerEmail(m: BuiltEmail): string[] {
  const { subject, html, text } = m;
  const problems: string[] = [];
  const bad = (cond: boolean, msg: string) => {
    if (cond) problems.push(msg);
  };
  const visible = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<!doctype html>/i, "");
  const sizes = [...visible.replace(/<td[^>]*>&nbsp;<\/td>/g, "").matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));

  bad(html.length > 90_000, `html is ${html.length} bytes; Gmail clips at about 102,000`);
  bad(Math.min(...sizes) < 13, `a font size under 13px (${Math.min(...sizes)})`);
  bad(subject.length === 0 || subject.length > 200, `subject length ${subject.length}`);
  bad(!/ \| (Signed by .+|Fully signed)(, [A-Z][a-z]+ \d{1,2}, \d{4})?$/.test(subject), "subject does not end with what happened and the day");
  bad((html + text + subject).includes(EM_DASH), "an em dash");
  bad(/!/.test(visible + text + subject), "an exclamation mark");
  bad(/tel:|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/.test(visible + text), "a phone number or tel: link");
  bad(/<style\b/i.test(html), "a <style> block");
  bad(/<script\b/i.test(html), "a <script>");
  bad(!/name="format-detection"/.test(html), "phone auto-linking is not switched off");
  bad(!/content="light only"/.test(html), "the page does not declare itself light-only");
  bad((html.match(/&zwnj;&nbsp;/g)?.length ?? 0) < 60, "the preheader is not padded");
  bad(/<img\b(?![^>]*\balt=)/.test(html), "an image with no alt attribute");
  bad(/\d{1,2}:\d{2} (AM|PM)/.test(visible), "a time that can break across lines");
  bad(/\d{1,2}:\d{2}:\d{2}/.test(visible + text), "a time with seconds");
  const bare = [...visible.matchAll(/<(\w+)\b([^>]*style="[^"]*background:[^"]*"[^>]*)>/g)].filter(
    ([, tag, attrs]) => !["a", "img"].includes(tag) && !/bgcolor=/.test(attrs)
  );
  bad(bare.length > 0, `a painted background with no bgcolor on <${bare[0]?.[1]}>`);
  const buttons = visible.match(/padding:16px 28px/g)?.length ?? 0;
  bad(buttons > 1, `${buttons} buttons`);
  bad(!/Or <a [^>]*>book a call<\/a>\./.test(visible), "book a call is not an inline link");
  bad(/<a [^>]*href="(?!https:\/\/)[^"]*"/.test(visible), "a link that is not https");
  bad(text.trim().length < 80, "the plain-text part is missing or empty");
  bad(/<[a-z][^>]*>|&nbsp;|&amp;| /.test(text), "markup or a non-breaking space leaked into the plain text");
  bad(!/^1\) You signed: /m.test(text), "the plain text has no numbered track");
  bad(/>undefined<|\[object Object\]|NaN/.test(visible + text), "an undefined value leaked into the email");
  return problems;
}
