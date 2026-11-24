/**
 * The Certificate: the ONE email design for every signing and form email across Jake's businesses
 * (picked by Jake on the round 3 board, 2026-11-23, option 2, over 0 the live Specimen, 0+ the
 * Specimen done properly, 1 the Counterpart and 3 the Notice; the Track of round 1 stays rejected).
 *
 * It proves an event the way signing services and payment receipts do: the business's real logo on
 * its own ground, then one white card holding a status line (a colored dot and the state in words),
 * the news as a heading that carries the name and the time, one button, the signed file drawn as a
 * file row, every signer as a row (initials, name and role, Signed or Waiting with the time and
 * zone), and the document's details ending in its document ID. A quiet footer sits under the card.
 * Sans-led and left-aligned, so it is scanned, not read.
 *
 * This file imports nothing. It holds the whole design and three ways to describe a message to it:
 *
 * - renderSignerEmail(EmailModel)       the confirmation a signer gets after signing (waiting or complete)
 * - renderOperatorEmail(OperatorModel)  the alert the business inbox gets when someone signs
 * - renderReceiptEmail(ReceiptModel)    the receipt for a form (their answers back and a reference)
 *
 * All three build a CertificateModel and call renderCertificate(), the layout itself. The older
 * renderSpecimen(SpecimenModel) is kept as an adapter onto the same layout, so a module generated
 * from an earlier copy keeps working and draws the Certificate. Sites that cannot depend on the kit
 * keep a byte-for-byte copy (`pnpm emails:vendor <site repo>`); the web-kit mail framework gets the
 * same layout as a generated module (`pnpm emails:vendor-webkit <web-kit repo>`), so there is one
 * design and one place to change it.
 *
 * Mechanics, chosen for the inboxes that actually exist (unchanged from the Specimen):
 * - nested presentation tables and inline styles; the one small <style> only declares light-only
 *   and switches off text resizing. Nothing about the layout depends on it or on a class, because
 *   Gmail (the iPhone app above all) drops both: side margins are percentages that shrink with the
 *   screen, so a 320px phone and a 1280px desktop get the same markup (2026-11-23, "janky on mobile")
 * - 600px maximum set on a TABLE (a table's max-width survives every Gmail), with a 600px table for
 *   Outlook inside a conditional comment; fluid under that
 * - body copy 16px; labels and small print 14px; only the file badge is 13px
 * - no flex, grid, position, background images, SVG, CSS variables or symbol glyphs anywhere
 * - every painted cell carries BOTH bgcolor and style, so Outlook's Word engine keeps the colors
 * - web font first with a deliberate system fallback (Helvetica Neue, Arial; Iowan Old Style,
 *   Charter, Georgia), never a Times New Roman fallback
 * - the logo is the business's real see-through file, hosted, with alt text and the ground it sits
 *   on painted behind it; never an opaque letterhead header. With no logo the name is live text
 * - the button is a plain link in every client with a VML twin for Outlook
 * - the page declares itself light-only and switches off phone auto-linking; an email address we
 *   print as a fact is broken up so Gmail cannot turn it blue
 * - the preview line is a hidden preheader, padded so body text cannot follow it into the list
 * - every time is printed with its zone and kept on one line ("2:00 PM EST")
 * - the booking link is the bare address alone in its own paragraph under a footer sentence that ends
 *   in a colon, never a button and never buried in a sentence (Jake, 2026-11-20); an empty bookUrl
 *   drops the booking line entirely (Palisade: no booking link in any email, 2026-11-14)
 * - a plain-text twin is always built and carries every fact the html does
 *
 * Subjects follow one convention so they are found by search and skimmed in a list:
 * "<place> | <document> | <what happened>, <day>" (Jake, 2026-11-14).
 *
 * No phone number appears anywhere on these emails. Contact is the reply.
 */

export type Palette = {
  paper: string;
  ground: string;
  ink: string;
  muted: string;
  rule: string;
  /** The brand's deep color: the button, the Completed state and the links. */
  band: string;
  bandText: string;
  /** The brand's accent: the Waiting state and the tint behind initials and the file badge. */
  bandAccent: string;
};

/** `mono` sets the document ID; it falls back to the system monospace faces. */
export type Faces = { serif: string; sans: string; wordmark: string; mono?: string };

export type Term = { label: string; value: string | string[] };

/**
 * A hosted logo: the business's real see-through file. `markOnly` marks a square mark, which is
 * shown beside the live name. `displayWidth` overrides the drawn width (default: about 48px tall,
 * at most 260px wide).
 */
export type Logo = { src: string; width: number; height: number; alt: string; markOnly?: boolean; displayWidth?: number };

export type Signer = { name: string; role?: string; when?: string };

/** A file that really is attached to this message. */
export type Attachment = { name: string; note?: string };

export type EmailModel = {
  palette: Palette;
  faces: Faces;
  /** The wordmark, the footer sentence and the preheader all use this. */
  brandName: string;
  /** The document's title, e.g. "Management Agreement". */
  docTitle: string;
  /**
   * The client or place that leads the subject, e.g. "309 Cranbrook Circle, Colorado Springs".
   * Empty when the document names no one, and the subject then starts with the document.
   */
  subjectPlace?: string;
  /** The property or document, one line per entry. The first line sits under the heading. */
  place: string | string[];
  /** The real logo, hosted. Preferred over `mark`. */
  logo?: Logo;
  /** A square mark (the older field): shown beside the live name. */
  mark?: { src: string; ground: string };
  /** Hosted web font stylesheet (Google Fonts) for the brand's faces. */
  fontsHref?: string;
  signedBy: string;
  /** The signer's role on the document, e.g. "Owner". */
  signedRole?: string;
  /** "November 11, 2026, 6:59 PM MST". Empty when the time cannot be read. */
  signedWhen: string;
  /** Parties who signed earlier, shown with their times when known. */
  others?: Signer[];
  /** Parties who have not signed. Empty means the agreement is complete. */
  waiting: { name: string; role?: string }[];
  /** The next real date after signing, when one exists. Never invented. */
  nextStep?: { what: string; when: string };
  /** Said under the heading when the agreement is complete, e.g. "Every party has signed." */
  completeDetail: string;
  /** What happens after the missing signatures: the detail line carries the promise. */
  completion: { title: string; detail: string };
  button?: { url: string; label?: string };
  /** Short sentences under the button (an attachment line when no `attachment` is given). */
  note: string[];
  terms: Term[];
  /** Small-print sentences above "Keep this email for your records." */
  fineprint?: string[];
  /** The booking page. Empty means this business shows no booking link at all. */
  bookUrl: string;
  /** Second footer line, e.g. the legal entity. */
  legalLine: string;
  /** The attached file, drawn as a file row. Only when it really is attached. */
  attachment?: Attachment;
  /** The document ID, printed last in the details in a fixed-width face. */
  documentId?: string;
  /** Signer names in the order the document prints them. Default: earlier signers, this signer, then those waiting. */
  order?: string[];
  /** The heading over the details. Default "Document details". */
  detailsTitle?: string;
  /** The first footer sentence. Default "Reply to this email and it reaches <brand>." */
  replyLine?: string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

/* ------------------------------------------------------- the layout -- */

export type CertificateSigner = { name: string; role?: string; signed: boolean; when?: string };
export type CertificateRow = { label: string; value: string; mono?: boolean };

export type CertificateModel = {
  subject: string;
  preheader: string;
  palette: Palette;
  faces: Faces;
  fontsHref?: string;
  brandName: string;
  logo?: Logo;
  /** The state in words, beside a dot: green when done, the accent when something waits. */
  status: { text: string; done: boolean };
  /** The news, with the name and the time. */
  headline: string;
  /** Muted lines under the heading: the document and place, the day. */
  sub?: string[];
  /** Paragraphs under the heading. `[label](https://url)` becomes an inline link. */
  lead: string[];
  button?: { url: string; label: string };
  attachment?: Attachment;
  /** Small lines under the button or file row. */
  notes?: string[];
  /** `day` is the day under the heading; a signer on any other day shows that day beside the time. */
  signers?: { title: string; rows: CertificateSigner[]; day?: string };
  details?: { title: string; caption?: string; rows: CertificateRow[] };
  /** Paragraphs at the end of the card, links as above. */
  after?: string[];
  signoff?: { name: string; title?: string };
  footer: { reply?: string; book?: string; fine?: string; legal: string };
};

export function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] as string);
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Roles read once each: ["owner", "owner", "manager"] becomes "owner and manager". */
function uniqueRoles(waiting: { role?: string }[]): string {
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

/** "November 23, 2026, 2:00 PM EST" to { day: "November 23, 2026", time: "2:00 PM EST" }. */
export function splitWhen(s: string | undefined): { day: string; time: string } {
  const m = /^([A-Z][a-z]+ \d{1,2}, \d{4}),? (?:at )?(\d{1,2}:\d{2})(?::\d{2})? (AM|PM)(?: ([A-Z]{2,5}))?/.exec((s ?? "").trim());
  if (!m) return { day: signedDay(s ?? ""), time: "" };
  return { day: m[1] ?? "", time: `${m[2]} ${m[3]}${m[4] ? ` ${m[4]}` : ""}` };
}

/** "November 21, 2026" to "Nov 21". */
function shortDay(day: string): string {
  const m = /^([A-Z][a-z]{2})[a-z]* (\d{1,2}),/.exec(day);
  return m ? `${m[1]} ${m[2]}` : day;
}

/** Two letters for a signer's badge: first and last word, a nickname in parentheses skipped. */
export function initials(name: string): string {
  const w = name.replace(/\([^)]*\)/g, " ").trim().split(/\s+/).filter(Boolean);
  const first = w[0]?.[0] ?? "";
  const last = w.length > 1 ? (w[w.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/* ------------------------------------------------------------- contrast -- */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
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
  }) as [number, number, number];
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

function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a) ?? [0, 0, 0];
  const B = hexToRgb(b) ?? [255, 255, 255];
  return `#${A.map((v, i) => Math.round(v * t + (B[i] ?? 255) * (1 - t)).toString(16).padStart(2, "0")).join("")}`;
}

/** The color itself when it reads at 4.5:1, else the same hue darkened toward `toward` until it does. */
function deepen(bg: string, color: string, toward: string): string {
  let x = color;
  for (let t = 0.05; contrast(x, bg) < 4.5 && t <= 1.0001; t += 0.05) x = mix(toward, color, t);
  return x;
}

export type PaletteInput = {
  paper: string;
  ground: string;
  ink?: string;
  muted?: string;
  rule: string;
  /** The brand's deep color. Used for the button only if the paper reads on it. */
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
 * Every pair the email paints is checked here, not assumed: ink and muted on the paper, the deep
 * color against the paper it must carry as the button, the button's text and the accent. A token
 * that would fail 4.5:1 is replaced by one that passes rather than shipped unreadable.
 */
export function makePalette(t: PaletteInput): Palette {
  const paper = t.paper;
  const ink = readable(paper, t.ink, FALLBACK.ink);
  const muted = readable(paper, t.muted, FALLBACK.muted, ink);
  const bandWanted = isHex(t.band) ? t.band : FALLBACK.band;
  const band = contrast(paper, bandWanted) >= 4.5 ? bandWanted : ink;
  const bandText = readable(band, t.bandText, paper, "#ffffff");
  const bandAccent = isHex(t.accent) ? t.accent : readable(band, bandText);
  return { paper, ground: t.ground, ink, muted, rule: t.rule, band, bandText, bandAccent };
}

/* ----------------------------------------------------------- type stacks -- */

export const SANS_STACK = "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";
export const SERIF_NEWSREADER = "Newsreader,'Iowan Old Style',Charter,Georgia,serif";
export const SERIF_GARAMOND = "'EB Garamond',Garamond,'Iowan Old Style',Charter,Georgia,serif";
export const WORDMARK_CINZEL = "Cinzel,'Trajan Pro',Georgia,serif";
export const MONO_STACK = "ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
export const FONTS_NEWSREADER =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Instrument+Sans:wght@400;500;600;700&display=swap";
export const FONTS_GARAMOND =
  "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap";

/** The default faces: Instrument Sans leads, Newsreader for the name, with the deliberate fallbacks. */
export const DEFAULT_FACES: Faces = { serif: SERIF_NEWSREADER, sans: SANS_STACK, wordmark: SERIF_NEWSREADER, mono: MONO_STACK };

/** A stack must never fall to Times New Roman: strip it and make sure Georgia (or Arial) is the floor. */
function stack(s: string, generic: "serif" | "sans-serif" | "monospace"): string {
  const cleaned = s
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^'?times new roman'?$/i.test(p) && p !== "serif" && p !== "sans-serif" && p !== "monospace");
  if (generic === "serif" && !cleaned.some((p) => /georgia/i.test(p))) cleaned.push("Georgia");
  if (generic === "sans-serif" && !cleaned.some((p) => /arial|helvetica/i.test(p))) cleaned.push("Arial");
  if (generic === "monospace" && !cleaned.some((p) => /menlo|consolas/i.test(p))) cleaned.push("Menlo", "Consolas");
  return `${cleaned.join(",")},${generic}`;
}

/* --------------------------------------------------------------- layout -- */

const PAD = "&zwnj;&nbsp;".repeat(90);
const T = (inner: string, attrs = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs}>${inner}</table>`;
const gap = (h: number) => `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`;
/**
 * A side margin that is `px` wide on the 600px email and shrinks with the screen (about half at 320),
 * as a percentage of the cell's own width, so no media query is needed: Gmail drops those.
 */
const side = (px: number, box = 600) => `${+((px / box) * 100).toFixed(3)}%`;
/** A painted cell's opening attributes: bgcolor and style both, so Outlook keeps the color. */
const paint = (bg: string) => `bgcolor="${bg}" style="background:${bg};`;

type Colors = {
  paper: string;
  ground: string;
  ink: string;
  muted: string;
  mutedOnGround: string;
  rule: string;
  border: string;
  deep: string;
  onDeep: string;
  done: string;
  waitDot: string;
  waitText: string;
  tint: string;
  onTint: string;
  link: string;
  linkOnGround: string;
};

function colors(p: Palette): Colors {
  const tint = mix(p.bandAccent, p.paper, 0.12);
  return {
    paper: p.paper,
    ground: p.ground,
    ink: p.ink,
    muted: p.muted,
    mutedOnGround: readable(p.ground, p.muted, p.ink),
    rule: p.rule,
    border: mix(p.ink, p.ground, 0.1),
    deep: p.band,
    onDeep: p.bandText,
    done: readable(p.paper, p.band, p.ink),
    waitDot: p.bandAccent,
    waitText: deepen(p.paper, p.bandAccent, p.ink),
    tint,
    onTint: readable(tint, p.muted, p.ink),
    link: readable(p.paper, p.band, p.ink),
    linkOnGround: readable(p.ground, p.band, p.ink),
  };
}

/** Breaks Gmail's auto-linking of an email address we print as a fact (the plain text keeps it whole). */
function neutral(html: string): string {
  return html.replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+)\.([a-z]{2,})(?![^<]*>)/g, "$1@&zwnj;<wbr>$2&zwnj;.$3");
}

/** `[label](https://url)` becomes an inline link; everything else is escaped and neutralized. */
function inline(text: string, link: string): string {
  const parts: string[] = [];
  let last = 0;
  const re = /\[([^\]]+)\]\((https:[^)]+)\)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    parts.push(neutral(esc(text.slice(last, m.index))));
    parts.push(`<a href="${esc(m[2] ?? "")}" style="color:${link};text-decoration:underline;text-underline-offset:3px">${esc(m[1] ?? "")}</a>`);
    last = m.index + m[0].length;
  }
  parts.push(neutral(esc(text.slice(last))));
  return parts.join("");
}
function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\((https:[^)]+)\)/g, (_m, l: string, u: string) =>
    /^[^\s]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(l) ? u : `${l}: ${u}`
  );
}

function button(href: string, label: string, c: Colors, sans: string): string {
  const safe = esc(href);
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safe}" style="height:56px;v-text-anchor:middle;width:500px" arcsize="14%" fillcolor="${c.deep}" stroke="f"><w:anchorlock/><center style="color:${c.onDeep};font-family:Arial,sans-serif;font-size:17px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${c.deep}" style="background:${c.deep};border-radius:8px"><a href="${safe}" style="display:block;height:56px;line-height:56px;padding:0 16px;font-family:${sans};font-size:17px;font-weight:600;color:${c.onDeep};text-align:center;text-decoration:none">${esc(label)}</a></td></tr></table><!--<![endif]-->`;
}

/** The drawn width of a logo: about 48px tall, never wider than 260px. */
function logoWidth(l: Logo): number {
  if (l.displayWidth) return l.displayWidth;
  if (l.markOnly) return 48;
  return Math.min(260, Math.round((48 * l.width) / l.height));
}

/** The layout itself: the one place the Certificate is drawn. Pure: no network, clock or environment. */
export function renderCertificate(m: CertificateModel): BuiltEmail {
  const c = colors(m.palette);
  const sans = stack(m.faces.sans, "sans-serif");
  const serif = stack(m.faces.serif, "serif");
  const wordmarkFont = stack(m.faces.wordmark, "serif");
  const mono = stack(m.faces.mono ?? MONO_STACK, "monospace");

  const P = (t: string, o: { size?: number; lh?: number; color?: string; mt?: number; link?: string; weight?: number } = {}) =>
    `<p style="margin:${o.mt ?? 0}px 0 0;font-family:${sans};font-size:${o.size ?? 16}px;line-height:${o.lh ?? 24}px;${o.weight ? `font-weight:${o.weight};` : ""}color:${o.color ?? c.ink};word-wrap:break-word;overflow-wrap:anywhere">${inline(keepTogether(t), o.link ?? c.link)}</p>`;
  const rule = (above: number, below: number) =>
    `${gap(above)}${T(`<tr><td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${c.rule}">&nbsp;</td></tr>`)}${gap(below)}`;
  const label = (t: string, right?: string) =>
    T(
      `<tr><td valign="bottom" style="font-family:${sans};font-size:15px;line-height:20px;font-weight:600;color:${c.ink}">${esc(t)}</td>${
        right ? `<td valign="bottom" align="right" style="font-family:${sans};font-size:14px;line-height:20px;color:${c.muted};text-align:right">${esc(right)}</td>` : ""
      }</tr>`
    );

  /* the head: the real logo on the ground, or the name as live text */
  const img = (l: Logo) => {
    const w = logoWidth(l);
    const h = Math.round((w * l.height) / l.width);
    return `<img src="${esc(l.src)}" width="${w}" height="${h}" alt="${esc(l.alt)}" bgcolor="${c.ground}" style="display:block;width:${w}px;max-width:100%;height:auto;border:0;background:${c.ground};font-family:${serif};font-size:18px;line-height:24px;color:${c.ink}">`;
  };
  const name = `<span style="font-family:${wordmarkFont};font-size:20px;line-height:26px;color:${c.ink}">${esc(m.brandName)}</span>`;
  const head = m.logo?.markOnly
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" width="${logoWidth(m.logo)}" style="width:${logoWidth(m.logo)}px">${img(m.logo)}</td><td valign="middle" style="padding:0 0 0 12px">${name}</td></tr></table>`
    : m.logo
      ? img(m.logo)
      : `<p style="margin:0">${name}</p>`;

  /* the status line */
  const dot = (color: string) =>
    `<td width="18" valign="middle" style="width:18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="10" height="10" ${paint(color)}width:10px;height:10px;border-radius:5px;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td>`;
  const status = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${dot(m.status.done ? c.done : c.waitDot)}<td valign="middle" style="font-family:${sans};font-size:15px;line-height:20px;font-weight:600;color:${m.status.done ? c.done : c.waitText};word-wrap:break-word">${inline(keepTogether(m.status.text), c.link)}</td></tr></table>`;

  /* the file row */
  const fileRow = m.attachment
    ? `${gap(14)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${c.rule};border-radius:8px;border-collapse:separate"><tr><td width="52" valign="middle" style="width:52px;padding:12px 0 12px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="48" align="center" valign="middle" ${paint(c.tint)}width:40px;height:48px;border-radius:4px;font-family:${sans};font-size:13px;line-height:16px;font-weight:600;color:${c.onTint}">${esc(/\.([a-z0-9]{2,4})$/i.exec(m.attachment.name)?.[1]?.toUpperCase() ?? "FILE")}</td></tr></table></td><td valign="middle" style="padding:12px 14px 12px 4px"><p style="margin:0;font-family:${sans};font-size:15px;line-height:21px;color:${c.ink};word-wrap:break-word;overflow-wrap:anywhere">${esc(m.attachment.name)}</p><p style="margin:2px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${c.muted}">${esc(m.attachment.note ?? "Attached to this email")}</p></td></tr></table>`
    : "";

  /* the signers */
  const refDay = m.signers?.day ?? splitWhen(m.signers?.rows.find((r) => r.signed && r.when)?.when).day;
  const signerRows = (m.signers?.rows ?? [])
    .map((p) => {
      const w = splitWhen(p.when);
      const at = w.time ? (w.day && w.day !== refDay ? `${shortDay(w.day)}, ${w.time}` : w.time) : w.day ? shortDay(w.day) : "";
      const badge = p.signed
        ? `<td width="38" height="38" align="center" valign="middle" ${paint(c.tint)}width:38px;height:38px;border-radius:19px;font-family:${sans};font-size:14px;line-height:38px;font-weight:600;color:${c.onTint}">${esc(initials(p.name))}</td>`
        : `<td width="36" height="36" align="center" valign="middle" ${paint(c.paper)}width:36px;height:36px;border-radius:19px;border:1px dashed ${c.muted};font-family:${sans};font-size:14px;line-height:36px;font-weight:600;color:${c.muted}">${esc(initials(p.name))}</td>`;
      return `<tr><td width="50" valign="top" style="width:50px;padding:12px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${badge}</tr></table></td><td valign="top" style="padding:12px 10px 12px 0"><p style="margin:0;font-family:${sans};font-size:16px;line-height:22px;font-weight:600;color:${c.ink};word-wrap:break-word;overflow-wrap:anywhere">${esc(p.name)}</p>${
        p.role ? `<p style="margin:1px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${c.muted}">${esc(p.role)}</p>` : ""
      }</td><td width="108" valign="top" align="right" style="width:108px;padding:12px 0"><p style="margin:0;font-family:${sans};font-size:14px;line-height:22px;font-weight:600;color:${p.signed ? c.done : c.waitText};text-align:right">${p.signed ? "Signed" : "Waiting"}</p><p style="margin:1px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${c.muted};text-align:right">${p.signed ? esc(keepTogether(at)) : "Not signed yet"}</p></td></tr>`;
    })
    .join(`<tr><td colspan="3" height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${c.rule}">&nbsp;</td></tr>`);
  const signedCount = (m.signers?.rows ?? []).filter((r) => r.signed).length;
  const total = m.signers?.rows.length ?? 0;

  /* the details */
  const detailRows = (m.details?.rows ?? [])
    .map((d) => {
      const v = `font-family:${d.mono ? mono : sans};font-size:${d.mono ? 15 : 16}px;line-height:22px;color:${c.ink};word-wrap:break-word;overflow-wrap:anywhere`;
      const value = neutral(esc(keepTogether(d.value)));
      return d.value.length > 44 || d.label.length > 22
        ? `<tr><td colspan="2" style="padding:9px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${c.muted}">${esc(d.label)}</td></tr><tr><td colspan="2" style="padding:3px 0 9px;${v}">${value}</td></tr>`
        : `<tr><td valign="top" width="38%" style="padding:9px 12px 9px 0;font-family:${sans};font-size:14px;line-height:22px;color:${c.muted}">${esc(d.label)}</td><td valign="top" style="padding:9px 0;${v}">${value}</td></tr>`;
    })
    .join("");

  const inner = [
    status,
    `<h1 style="margin:16px 0 0;font-family:${sans};font-size:28px;line-height:34px;font-weight:600;letter-spacing:-.01em;color:${c.ink};word-wrap:break-word">${esc(keepTogether(m.headline))}</h1>`,
    (m.sub ?? []).map((t, i) => P(t, { color: c.muted, mt: i ? 0 : 6 })).join(""),
    m.lead.map((t, i) => P(t, { mt: i ? 8 : 16 })).join(""),
    m.button ? `${gap(22)}${button(m.button.url, m.button.label, c, sans)}` : "",
    fileRow,
    (m.notes ?? []).map((t, i) => P(t, { size: 14, lh: 21, color: c.muted, mt: i ? 4 : 12 })).join(""),
    total ? `${rule(26, 22)}${label(m.signers?.title ?? "Signers", `${signedCount} of ${total} signed`)}${gap(4)}${T(signerRows)}` : "",
    m.details?.rows.length
      ? `${rule(total ? 10 : 24, 20)}${label(m.details.title)}${m.details.caption ? P(m.details.caption, { size: 14, lh: 21, color: c.muted, mt: 2 }) : ""}${gap(4)}${T(detailRows)}`
      : "",
    (m.after ?? []).length ? `${rule(14, 18)}${(m.after ?? []).map((t, i) => P(t, { mt: i ? 8 : 0 })).join("")}` : "",
    m.signoff
      ? `${gap(18)}${P(m.signoff.name, { weight: 600 })}${m.signoff.title ? P(m.signoff.title, { size: 14, lh: 20, color: c.muted }) : ""}`
      : "",
  ].join("\n");

  const foot = [m.footer.reply, m.footer.book, m.footer.fine, m.footer.legal]
    .filter((t): t is string => Boolean(t))
    .map((t, i) => P(t, { size: 14, lh: 21, color: c.mutedOnGround, link: c.linkOnGround, mt: i ? 8 : 0 }))
    .join("");

  const body = T(`<tr><td ${paint(c.ground)}padding:28px ${side(20)} 36px">
${T(`<tr><td style="padding:0 0 0 ${side(6, 560)}">${head}</td></tr>`)}
${gap(18)}
${T(`<tr><td ${paint(c.paper)}border:1px solid ${c.border};border-radius:12px;padding:26px ${side(22, 560)} 26px">${inner}</td></tr>`, 'style="border-collapse:separate"')}
${gap(20)}
${T(`<tr><td style="padding:0 ${side(6, 560)}">${foot}</td></tr>`)}
</td></tr>`);

  const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--><title>${esc(m.subject)}</title>${m.fontsHref ? `<link href="${esc(m.fontsHref)}" rel="stylesheet">` : ""}
<style>:root{color-scheme:light only;supported-color-schemes:light}body{margin:0;padding:0;-webkit-text-size-adjust:100%;text-size-adjust:100%}img{-ms-interpolation-mode:bicubic}</style></head>
<body style="margin:0;padding:0;background:${c.ground}" bgcolor="${c.ground}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:13px;line-height:13px;color:${c.ground};mso-hide:all">${esc(keepTogether(m.preheader))}${PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.ground}" style="background:${c.ground}"><tr><td align="center" style="padding:0">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto"><tr><td align="left" style="padding:0">${body}</td></tr></table>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table>
</body></html>`;

  /* the plain-text twin: every fact the html prints, in the same order */
  const lines: string[] = [m.status.text, "", m.headline, ...(m.sub ?? []), ""];
  for (const t of m.lead) lines.push(stripLinks(t));
  if (m.button) lines.push("", `${m.button.label}: ${m.button.url}`);
  if (m.attachment) lines.push(`${m.attachment.name}: ${m.attachment.note ?? "Attached to this email"}`);
  for (const t of m.notes ?? []) lines.push(stripLinks(t));
  if (total) {
    lines.push("", `${m.signers?.title ?? "Signers"}, ${signedCount} of ${total} signed`);
    for (const p of m.signers?.rows ?? [])
      lines.push(`${p.name}${p.role ? `, ${p.role}` : ""}: ${p.signed ? `signed${p.when ? ` ${p.when}` : ""}` : "has not signed yet"}`);
  }
  if (m.details?.rows.length) {
    lines.push("", m.details.title);
    if (m.details.caption) lines.push(m.details.caption);
    for (const d of m.details.rows) lines.push(`${d.label}: ${d.value}`);
  }
  for (const t of m.after ?? []) lines.push("", stripLinks(t));
  if (m.signoff) lines.push("", m.signoff.name, ...(m.signoff.title ? [m.signoff.title] : []));
  lines.push("");
  if (m.footer.reply) lines.push(stripLinks(m.footer.reply));
  if (m.footer.book) lines.push("", stripLinks(m.footer.book), "");
  if (m.footer.fine) lines.push(stripLinks(m.footer.fine));
  lines.push(stripLinks(m.footer.legal));
  const text = plain(lines.join("\n").replace(/\n{3,}/g, "\n\n").trim());
  return { subject: m.subject, html, text };
}

/* ------------------------------------------- the older layout model -- */

export type Sheet = {
  title: string;
  place?: string;
  /** A line above the rows, e.g. "For your records, here is what you sent:". */
  caption?: string;
  rows: { label: string; value: string }[];
  signatures?: { name: string; role?: string; signed: boolean; when?: string }[];
  /** A reference the reader can quote, drawn as the last row. */
  reference?: { label: string; value: string };
};

export type SpecimenModel = {
  subject: string;
  preheader: string;
  palette: Palette;
  faces: Faces;
  fontsHref?: string;
  brandName: string;
  logo?: Logo;
  headline: string;
  lead: string[];
  status: string;
  button?: { url: string; label: string };
  attach?: string[];
  sheet: Sheet;
  after?: string[];
  signoff?: { name: string; title?: string };
  footer: { reply?: string; book?: string; fine?: string; legal: string };
};

/** The Specimen's model (2026-11-14), drawn as the Certificate, so an older caller keeps working. */
export function renderSpecimen(m: SpecimenModel): BuiltEmail {
  const s = m.sheet;
  return renderCertificate({
    subject: m.subject,
    preheader: m.preheader,
    palette: m.palette,
    faces: m.faces,
    fontsHref: m.fontsHref,
    brandName: m.brandName,
    logo: m.logo,
    status: { text: m.status, done: !/waiting|signed \d+ of/i.test(m.status) },
    headline: m.headline,
    sub: s.place ? s.place.split("\n") : undefined,
    lead: m.lead,
    button: m.button,
    notes: m.attach,
    signers: s.signatures?.length ? { title: "Signers", rows: s.signatures } : undefined,
    details: {
      title: s.title,
      caption: s.caption,
      rows: [...s.rows, ...(s.reference ? [{ ...s.reference, mono: true }] : [])],
    },
    after: m.after,
    signoff: m.signoff,
    footer: m.footer,
  });
}

/* ----------------------------------------------------------- subject -- */

/** "November 11, 2026, 6:59 PM MST" or "November 11, 2026 at 6:59:12 PM MST" to "November 11, 2026". */
export function signedDay(signedWhen: string): string {
  const m = /^([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(signedWhen.trim());
  return m?.[1] ?? "";
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

const FOOTER_REPLY = (brand: string, book: boolean, line?: string) => {
  const reply = line ?? `Reply to this email and it reaches ${brand}.`;
  return book ? `${reply} To talk anything through, pick a time here:` : reply;
};
/** The booking address on its own: the link text is the address itself. */
const FOOTER_BOOK = (bookUrl: string) => `[${bookUrl}](${bookUrl})`;

/** "<Name> signed at 2:00 PM EST." The heading carries the name and the time. */
function signedHeadline(name: string, when: string): string {
  const w = splitWhen(when);
  return w.time ? `${name} signed at ${w.time}.` : `${name} signed.`;
}

/** Every party in the order the document prints them, each with its state. */
function partyRows(
  others: Signer[] | undefined,
  me: { name: string; role?: string; when?: string },
  waiting: { name: string; role?: string }[],
  order?: string[]
): CertificateSigner[] {
  const rows: CertificateSigner[] = [
    ...(others ?? []).map((o) => ({ name: o.name, role: o.role, signed: true, when: o.when || undefined })),
    { name: me.name, role: me.role, signed: true, when: me.when || undefined },
    ...waiting.map((w) => ({ name: w.name, role: w.role, signed: false })),
  ];
  if (order?.length) {
    const at = (n: string) => {
      const i = order.indexOf(n);
      return i < 0 ? order.length : i;
    };
    rows.sort((a, b) => at(a.name) - at(b.name));
  }
  return rows;
}

const firstPlace = (place: string | string[]) => (Array.isArray(place) ? place.join(", ") : place);

/* ----------------------------------------------- the signer's email -- */

/**
 * The confirmation a signer gets after signing. Pure: no network, no clock, no environment, so it
 * can be rendered to a file and read before anything is ever sent.
 */
export function renderSignerEmail(m: EmailModel): BuiltEmail {
  const complete = m.waiting.length === 0;
  const names = joinNames(m.waiting.map((w) => w.name));
  const verb = m.waiting.length > 1 ? "need" : "needs";
  const roles = uniqueRoles(m.waiting);
  const when = splitWhen(m.signedWhen);

  const lead: string[] = [];
  if (complete) {
    lead.push(m.completeDetail || "Every party has signed.");
    if (m.nextStep) lead.push(`${m.nextStep.what}: ${m.nextStep.when}.`);
  } else {
    // A role reads well here only when it is a short title ("manager"). A long legal capacity
    // garbles once lowercased and joined, so it falls back to the names.
    const shortRoles =
      roles && m.waiting.every((w) => !(w.role ?? "").includes(",") && (w.role ?? "").trim().split(/\s+/).length <= 3);
    lead.push(
      shortRoles
        ? `The ${roles} still ${verb} to sign, so the agreement is not complete yet.`
        : `${names} still ${verb} to sign, so the agreement is not complete yet.`
    );
    lead.push(m.completion.detail);
  }

  const logo = m.logo ?? (m.mark ? { src: m.mark.src, width: 256, height: 256, alt: m.brandName, markOnly: true } : undefined);
  const fine = [...(m.fineprint ?? []), "Keep this email for your records."].join(" ");
  const details: CertificateRow[] = m.terms.map((t) => ({ label: t.label, value: Array.isArray(t.value) ? t.value.join(", ") : t.value }));
  if (m.documentId) details.push({ label: "Document ID", value: m.documentId, mono: true });

  return renderCertificate({
    subject: subjectFor(m),
    preheader: complete
      ? m.attachment
        ? `The signed PDF is attached.${m.nextStep ? ` ${m.nextStep.what}: ${m.nextStep.when}.` : ""}`
        : `Your ${m.docTitle} with ${m.brandName} is signed and complete.`
      : `${names} still ${verb} to sign. ${m.completion.title}.`,
    palette: m.palette,
    faces: m.faces,
    fontsHref: m.fontsHref,
    brandName: m.brandName,
    logo,
    status: complete ? { text: "Completed", done: true } : { text: `Waiting on ${names}`, done: false },
    headline: signedHeadline(m.signedBy, m.signedWhen),
    sub: [`${m.docTitle}, ${firstPlace(m.place)}`, ...(when.day ? [when.day] : [])],
    lead,
    button: m.button ? { url: m.button.url, label: m.button.label ?? (complete ? "Open your signed copy" : "Open your copy") } : undefined,
    attachment: m.attachment,
    notes: m.note,
    signers: { title: "Signers", rows: partyRows(m.others, { name: m.signedBy, role: m.signedRole, when: m.signedWhen }, m.waiting, m.order), day: when.day },
    details: { title: m.detailsTitle ?? "Document details", rows: details },
    footer: {
      reply: FOOTER_REPLY(m.brandName, Boolean(m.bookUrl), m.replyLine),
      book: m.bookUrl ? FOOTER_BOOK(m.bookUrl) : undefined,
      fine,
      legal: m.legalLine,
    },
  });
}

/* ---------------------------------------------- the operator's alert -- */

export type OperatorModel = {
  palette: Palette;
  faces: Faces;
  brandName: string;
  logo?: Logo;
  fontsHref?: string;
  docTitle: string;
  subjectPlace?: string;
  place: string;
  signedBy: string;
  signedWhen: string;
  /** Parties still to sign. Empty means fully executed. */
  waiting: { name: string; role?: string }[];
  /** The signature record: signed by, when, their email, version, fingerprint, and so on. */
  record: Term[];
  /** The signed agreement, when there is a page or file for it. */
  button?: { url: string; label?: string };
  /** The attachment line, and the line saying the record is filed elsewhere. */
  note: string[];
  legalLine: string;
  /** The signer's role on the document. */
  signedRole?: string;
  /** Parties who signed earlier, so the alert lists every signer. */
  others?: Signer[];
  /** The attached file, drawn as a file row. Only when it really is attached. */
  attachment?: Attachment;
  /** The document ID, printed last in the record in a fixed-width face. */
  documentId?: string;
  /** Signer names in the order the document prints them. */
  order?: string[];
  /** Replaces the default sentences under the heading. */
  lead?: string[];
  /** The footer sentence. Default "Sent to the <brand> inbox each time someone signs." */
  footerLine?: string;
};

/**
 * The operator's subject names who signed even when it completes the document:
 *   11 Bluebill Ave Unit 201 | Residential Lease | Fully signed, Victoria Donovan last, November 23, 2026
 */
export function operatorSubject(m: Pick<OperatorModel, "waiting" | "subjectPlace" | "docTitle" | "signedBy" | "signedWhen">): string {
  if (m.waiting.length) return subjectFor(m);
  const day = signedDay(m.signedWhen);
  return `${m.subjectPlace ? `${m.subjectPlace} | ` : ""}${m.docTitle} | Fully signed, ${m.signedBy} last${day ? `, ${day}` : ""}`;
}

/** The alert the business inbox gets when someone signs: who, when, what is left, the record. */
export function renderOperatorEmail(m: OperatorModel): BuiltEmail {
  const complete = m.waiting.length === 0;
  const names = joinNames(m.waiting.map((w) => w.name));
  const verb = m.waiting.length > 1 ? "have" : "has";
  const rows = partyRows(m.others, { name: m.signedBy, role: m.signedRole, when: m.signedWhen }, m.waiting, m.order);
  const when = splitWhen(m.signedWhen);
  const record: CertificateRow[] = m.record.map((t) => ({ label: t.label, value: Array.isArray(t.value) ? t.value.join(", ") : t.value }));
  if (m.documentId) record.push({ label: "Document ID", value: m.documentId, mono: true });
  return renderCertificate({
    subject: operatorSubject(m),
    preheader: complete
      ? `All ${rows.length} signers are done.${m.attachment ? " The signed PDF is attached." : ""}`
      : `${names} ${verb} not signed yet.`,
    palette: m.palette,
    faces: m.faces,
    fontsHref: m.fontsHref,
    brandName: m.brandName,
    logo: m.logo,
    status: complete ? { text: "Completed. Nothing waits on you.", done: true } : { text: `Waiting on ${names}`, done: false },
    headline: signedHeadline(m.signedBy, m.signedWhen),
    sub: [`${m.docTitle}, ${m.place}`, ...(when.day ? [when.day] : [])],
    lead: m.lead ?? [complete ? `Every party has signed.${m.attachment ? " The signed PDF is attached." : ""}` : `${names} ${verb} not signed yet.`],
    button: m.button ? { url: m.button.url, label: m.button.label ?? "Open the signed agreement" } : undefined,
    attachment: m.attachment,
    notes: m.note,
    signers: { title: "Signers", rows, day: when.day },
    details: { title: "Signature record", rows: record },
    footer: { reply: m.footerLine ?? `Sent to the ${m.brandName} inbox each time someone signs.`, legal: m.legalLine },
  });
}

/* ------------------------------------------------- the form receipt -- */

export type ReceiptModel = {
  palette: Palette;
  faces: Faces;
  brandName: string;
  logo?: Logo;
  fontsHref?: string;
  /** The subject, already built: "<business> | <form> | Received from <name>, <day>". */
  subject: string;
  /** The news with the name and the time, e.g. "Dana, your inquiry arrived at 4:12 PM EST." */
  headline: string;
  /** Opening paragraphs; the first may be a greeting. */
  lead: string[];
  /** "Your answers", "What you sent". */
  sheetTitle: string;
  /** "For your records, here is what you sent:". */
  caption?: string;
  received: { label: string; value: string }[];
  reference?: { label: string; value: string };
  after?: string[];
  signoff?: { name: string; title?: string };
  legalLine: string;
  /** The status line. Default "Received", or "Received <receivedWhen>". */
  status?: string;
  /** "November 23, 2026, 4:12 PM EST": printed on the status line and under the heading. */
  receivedWhen?: string;
  /** What it was about, e.g. "11 Bluebill Avenue, Unit 201, Naples, Florida". */
  about?: string;
  /** The first footer sentence, e.g. "Reply to this email and it reaches Owner Hosted Homes." */
  replyLine?: string;
};

/** The receipt for a form: their answers back for checking, and a reference. No signers. */
export function renderReceiptEmail(m: ReceiptModel): BuiltEmail {
  const day = m.receivedWhen ? splitWhen(m.receivedWhen) : undefined;
  return renderCertificate({
    subject: m.subject,
    preheader: m.lead.find((l) => !/^(hello|hi|dear)\b/i.test(l)) ?? m.headline,
    palette: m.palette,
    faces: m.faces,
    fontsHref: m.fontsHref,
    brandName: m.brandName,
    logo: m.logo,
    status: { text: m.status ?? (day ? `Received ${day.day}` : "Received"), done: true },
    headline: m.headline,
    sub: m.about ? [m.about] : undefined,
    lead: m.lead,
    details: {
      title: m.sheetTitle,
      caption: m.caption,
      rows: [...m.received, ...(m.reference ? [{ ...m.reference, mono: true }] : [])],
    },
    after: m.after,
    signoff: m.signoff,
    footer: { reply: m.replyLine, legal: m.legalLine },
  });
}

/* ------------------------------------------------------------------ lint -- */

const EM_DASH = String.fromCharCode(8212);

/**
 * The cheap checks, as a list of problems (empty means clean). Pure string work, a few milliseconds
 * per email, so every state of every agreement can be checked on each test run. It does not
 * replace looking at a render; it catches what a change to the markup or the copy would silently
 * break.
 */
export function lintSignerEmail(m: BuiltEmail): string[] {
  const { subject, html, text } = m;
  const problems: string[] = [];
  const bad = (cond: boolean, msg: string) => {
    if (cond) problems.push(msg);
  };
  const visible = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<!doctype html>/i, "");
  const body = visible.replace(/<head>[\s\S]*?<\/head>/i, "");
  const words = body.replace(/<div style="display:none[^"]*"[^>]*>[\s\S]*?<\/div>/, " ").replace(/<[^>]+>/g, " ");
  const sizes = [...body.replace(/<td[^>]*>&nbsp;<\/td>/g, "").matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1])).filter((n) => n > 2);

  bad(html.length > 90_000, `html is ${html.length} bytes; Gmail clips at about 102,000`);
  bad(Math.min(...sizes) < 13, `a font size under 13px (${Math.min(...sizes)})`);
  bad(subject.length === 0 || subject.length > 200, `subject length ${subject.length}`);
  bad(!/^[^|]+ \| [^|]+ \| .+$/.test(subject) && !/^[^|]+ \| .+$/.test(subject), "subject is not Place | Document | what happened");
  bad((html + text + subject).includes(EM_DASH), "an em dash");
  bad(/!/.test(`${words}${text}${subject}`), "an exclamation mark");
  bad(/tel:|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/.test(body + text), "a phone number or tel: link");
  bad(/<script\b/i.test(html), "a <script>");
  bad(/prefers-color-scheme\s*:\s*dark/i.test(html), "a dark-mode style");
  bad(/Times New Roman/i.test(html), "a Times New Roman fallback");
  bad(!/name="format-detection"/.test(html), "phone auto-linking is not switched off");
  bad(!/content="light only"/.test(html), "the page does not declare itself light-only");
  bad((html.match(/&zwnj;&nbsp;/g)?.length ?? 0) < 60, "the preheader is not padded");
  bad(/<img\b(?![^>]*\balt=)/.test(html), "an image with no alt attribute");
  bad(/<img\b[^>]*\balt=""/.test(html), "an image with empty alt text");
  bad(/<img\b[^>]*src="[^"]*(letterhead-header|header@3x)/i.test(html), "an opaque letterhead header as the logo (use the see-through mark)");
  bad((body.match(/<h1\b/g)?.length ?? 0) !== 1, "the news is not one <h1>");
  bad(/\d{1,2}:\d{2} (AM|PM)/.test(body), "a time that can break across lines");
  bad(/\d{1,2}:\d{2} (AM|PM)(?! [A-Z]{2,5})/.test(words), "a time with no zone");
  bad(/\d{1,2}:\d{2} (AM|PM)(?! [A-Z]{2,5})/.test(text), "a time with no zone in the plain text");
  bad(/\b([01]?\d|2[0-3]):[0-5]\d\b(?![:\d]|\s*(AM|PM)| (AM|PM))/.test(words + text), "a 24-hour time");
  bad(/\d{1,2}:\d{2}:\d{2}/.test(body + text), "a time with seconds");
  const bare = [...body.matchAll(/<(\w+)\b([^>]*style="[^"]*background:[^"]*"[^>]*)>/g)].filter(
    ([, tag, attrs]) => !["a", "img", "div"].includes(tag ?? "") && !/bgcolor=/.test(attrs ?? "")
  );
  bad(bare.length > 0, `a painted background with no bgcolor on <${bare[0]?.[1]}>`);
  const buttons = body.match(/height:56px;line-height:56px/g)?.length ?? 0;
  bad(buttons > 1, `${buttons} buttons`);
  const meet = body.match(/<a [^>]*href="https:\/\/jakejjlee\.com\/meet"/g)?.length ?? 0;
  bad(meet > 1, `${meet} booking links`);
  bad(
    meet === 1 && !/<p [^>]*>\s*<a [^>]*href="https:\/\/jakejjlee\.com\/meet"[^>]*>https:\/\/jakejjlee\.com\/meet<\/a>\s*<\/p>/.test(body),
    "the booking link is not the bare address alone in its own paragraph"
  );
  bad(
    /https:\/\/jakejjlee\.com\/meet/.test(text) && !/^https:\/\/jakejjlee\.com\/meet$/m.test(text),
    "the booking link is not alone on its own line in the plain text"
  );
  bad(/<a [^>]*href="(?!https:\/\/)[^"]*"/.test(body), "a link that is not https");
  bad(text.trim().length < 80, "the plain-text part is missing or empty");
  bad(/<[a-z][^>]*>|&nbsp;|&amp;| /.test(text), "markup or a non-breaking space leaked into the plain text");
  bad(/>undefined<|\[object Object\]|NaN|\bundefined\b/.test(words + text), "an undefined value leaked into the email");

  // What the Gmail iPhone app and Gmail web drop (2026-11-23): the layout must not lean on any of it.
  bad(/display:\s*(inline-)?(flex|grid)/i.test(body), "flex or grid layout (Gmail drops it)");
  bad(/<svg\b/i.test(html), "an inline SVG (Gmail drops it)");
  bad(/[;"\s]position:\s*(absolute|relative|fixed|sticky)/i.test(body), "positioned layout (Gmail drops it)");
  bad(/var\(--/.test(html), "a CSS variable (Gmail drops it)");
  bad(/background-image|url\(/i.test(body), "a background image (Gmail and Outlook drop it)");
  bad(/\sclass="/.test(body), "a class in the body (Gmail drops classes and the <style> they need)");
  bad(/@media/i.test(html), "a media query (Gmail drops it, so the phone layout must not need one)");
  bad(/<div\b[^>]*max-width/i.test(body), "the column cap is on a div (the cap must sit on a table)");
  bad(!/<table\b[^>]*style="[^"]*max-width:600px/.test(body), "no 600px column cap on a table");
  for (const tag of body.match(/<img\b[^>]*>/gi) ?? []) {
    bad(!/\bsrc="https:\/\//.test(tag), `an image that is not an absolute https address: ${tag.slice(0, 80)}`);
    bad(!/\bwidth="\d+"/.test(tag), `an image with no width attribute: ${tag.slice(0, 80)}`);
    bad(!/height:auto/.test(tag), `an image that does not keep its shape (no height:auto): ${tag.slice(0, 80)}`);
  }
  const glyphs = body
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .match(/[←-⇿⌀-⏿①-⓿■-➿⬀-⯿]/g);
  bad(Boolean(glyphs), `a symbol glyph that each phone draws differently (${glyphs?.[0]})`);
  const wide = [...body.matchAll(/padding:\s*(\d+)px\s+(\d+)px/g)].filter(([, , x]) => Number(x) > 24);
  bad(wide.length > 0, `a fixed side padding over 24px (${wide[0]?.[0]}), which squeezes a 320px phone`);
  return problems;
}
