import type { Agreement, BrandToken } from "../content/types";
import { longDate } from "./dates";
import { isFullyExecuted, outstandingParties, type Execution, type SignatureRecord } from "./execution";
import { shortFingerprint } from "./fingerprint";

/**
 * The signer's confirmation email: direction d3, "The Track".
 *
 * A signer opens this to be certain the signature counted. So the first thing
 * on it is where they stand, drawn as a short vertical track that reads by
 * shape (a check, a number, a dashed number) before a word is read, then one
 * button to the signed copy, then the key terms as rows.
 *
 * Mechanics, all of them chosen for the inboxes that actually exist:
 * - tables and inline styles only; no <style> block, no webfont, no script
 * - 600px maximum, fluid under that; body text never under 16px, nothing under 13px
 * - the wordmark is live text in a web-safe face, so it survives images off
 * - every background is painted twice (bgcolor and style) and the page declares
 *   itself light-only, so a forced dark mode cannot turn the band's text invisible
 * - the button is a plain link in every client, with a VML twin for Outlook
 * - "book a call" is an inline text link in the footer, never a button
 *
 * The look is the business's own. Colors come from the agreement's brand
 * tokens and are checked for contrast here, so a token that would fail 4.5:1
 * is replaced by one that passes rather than shipped unreadable.
 *
 * No phone number appears anywhere on this email. Contact is the reply.
 */

export const BOOK_A_CALL_URL = "https://jakejjlee.com/meet";

export type SignerEmailOptions = {
  /** Where "Open your signed copy" goes. Absent means no button is drawn. */
  copyUrl?: string;
  /** True only when the PDF really is attached to this message. */
  attached?: boolean;
  /** The attachment's filename, shown so the signer can find it again. */
  attachmentName?: string;
  /**
   * The next real date after signing, when one exists ("Cranbrook goes live",
   * "Friday, November 13, 2026"). Never invented; absent means the track has
   * two steps when the agreement is complete.
   */
  nextStep?: { what: string; when: string };
};

const FALLBACK = {
  paper: "#fbf8f1",
  ground: "#f3ede1",
  ink: "#1b1a16",
  muted: "#6b6455",
  rule: "#e5dac4",
  band: "#1b1a16",
} as const;

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] as string);
}

/* --------------------------------------------------------------- contrast -- */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
function readable(bg: string, ...candidates: (string | undefined)[]): string {
  const usable = candidates.filter((c): c is string => Boolean(c) && hexToRgb(c as string) !== null);
  return usable.find((c) => contrast(c, bg) >= 4.5) ?? usable[usable.length - 1] ?? "#000000";
}

/* ----------------------------------------------------------------- palette -- */

export type SignerPalette = {
  paper: string;
  ground: string;
  ink: string;
  muted: string;
  rule: string;
  band: string;
  bandText: string;
  bandAccent: string;
};

function token(a: Agreement, k: BrandToken): string | undefined {
  const v = a.brand.tokens?.[k];
  return v && hexToRgb(v) ? v : undefined;
}

export function signerPalette(a: Agreement): SignerPalette {
  const paper = token(a, "paper") ?? FALLBACK.paper;
  const ground = token(a, "ground") ?? FALLBACK.ground;
  const ink = readable(paper, token(a, "ink"), FALLBACK.ink);
  const muted = readable(paper, token(a, "muted"), FALLBACK.muted, ink);
  const rule = token(a, "rule") ?? FALLBACK.rule;
  // The band is the business's own deep color. A band too light to carry the
  // page's paper color as text falls back to ink rather than shipping unreadable.
  const bandWanted = token(a, "accentText") ?? token(a, "accent") ?? FALLBACK.band;
  const band = contrast(paper, bandWanted) >= 4.5 ? bandWanted : ink;
  const bandText = readable(band, paper, "#ffffff");
  // Small second line on the band: the brand accent when it reads, else the text color.
  const bandAccent = readable(band, token(a, "accent"), bandText);
  return { paper, ground, ink, muted, rule, band, bandText, bandAccent };
}

/* ------------------------------------------------------------------ pieces -- */

function button(href: string, label: string, p: SignerPalette): string {
  const safe = esc(href);
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safe}" style="height:52px;v-text-anchor:middle;width:260px" arcsize="12%" fillcolor="${p.band}" stroke="f"><w:anchorlock/><center style="color:${p.bandText};font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${safe}" style="display:inline-block;background:${p.band};color:${p.bandText};font-family:${SANS};font-size:16px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;padding:16px 28px;border-radius:6px;min-height:20px">${esc(label)}</a><!--<![endif]-->`;
}

type StepState = "done" | "now" | "later";

function stepMarker(state: StepState, n: number, p: SignerPalette): string {
  if (state === "done") {
    return `<div style="width:28px;height:28px;line-height:28px;background:${p.band};color:${p.bandAccent};text-align:center;font-family:${SANS};font-size:16px;font-weight:700;border-radius:6px">&#10003;</div>`;
  }
  if (state === "now") {
    return `<div style="width:28px;height:28px;line-height:24px;border:2px solid ${p.band};color:${p.band};text-align:center;font-family:${SANS};font-size:14px;font-weight:700;border-radius:6px;background:#ffffff">${n}</div>`;
  }
  return `<div style="width:28px;height:28px;line-height:24px;border:2px dashed #8f8570;color:#5c5446;text-align:center;font-family:${SANS};font-size:14px;font-weight:700;border-radius:6px">${n}</div>`;
}

function step(state: StepState, n: number, title: string, detail: string, last: boolean, p: SignerPalette): string {
  const spine = last
    ? ""
    : `<div style="width:2px;height:30px;background:${state === "done" ? p.band : "#cfc6b0"};margin:4px 0 4px 13px"></div>`;
  return `<tr><td width="44" valign="top" align="left" style="padding:0">${stepMarker(state, n, p)}${spine}</td><td valign="top" style="padding:0 0 ${last ? 0 : 14}px 0"><p style="margin:0;font-family:${SERIF};font-size:21px;line-height:28px;color:${p.ink}">${title}</p><p style="margin:2px 0 0;font-family:${SANS};font-size:15px;line-height:22px;color:${p.muted}">${detail}</p></td></tr>`;
}

/* -------------------------------------------------------------------- email -- */

/**
 * The message a signer gets after signing. Pure: no network, no clock, no
 * environment. Whether it is sent, and what happens when sending fails, is
 * notify.ts's business and nothing here.
 */
export function buildSignerEmail(
  a: Agreement,
  rec: SignatureRecord,
  ex: Execution,
  opts: SignerEmailOptions = {}
): { subject: string; html: string } {
  const executed = isFullyExecuted(a, ex);
  const waiting = outstandingParties(a, ex);
  const waitNames = waiting.map((w) => w.legalName).join(" and ");
  const waitRoles = waiting.map((w) => w.role.toLowerCase()).join(" and ");
  const p = signerPalette(a);
  const place = a.subtitle ?? a.title;

  const steps: string[] = [];
  steps.push(step("done", 1, "You signed", `${esc(rec.legalName)}, ${esc(rec.signedAtLocal.replace(/(\d{1,2}:\d{2}):\d{2}/, "$1"))}`, false, p));
  if (executed) {
    const next = opts.nextStep;
    steps.push(
      step(
        "done",
        2,
        "Agreement complete",
        opts.attached ? "Every party has signed. The signed PDF is attached." : "Every party has signed.",
        !next,
        p
      )
    );
    if (next) steps.push(step("now", 3, esc(next.what), esc(next.when), true, p));
  } else {
    steps.push(
      step(
        "now",
        2,
        `Waiting on ${esc(waitNames)}`,
        `The ${esc(waitRoles)} still ${waiting.length > 1 ? "need" : "needs"} to sign. The agreement is not complete until then.`,
        false,
        p
      )
    );
    steps.push(step("later", 3, "You get the completed agreement", "By email, as a PDF, from this address.", true, p));
  }

  const terms = a.letter.summary
    .map(
      (r) =>
        `<tr><td valign="top" width="38%" style="padding:12px 12px 12px 0;border-top:1px solid ${p.rule};font-family:${SANS};font-size:15px;line-height:22px;color:${p.muted}">${esc(r.label)}</td><td valign="top" style="padding:12px 0;border-top:1px solid ${p.rule};font-family:${SERIF};font-size:18px;line-height:24px;color:${p.ink}">${esc(r.value)}</td></tr>`
    )
    .join("");

  const fileLine = opts.attached
    ? `${opts.attachmentName ? `${esc(opts.attachmentName)} is attached. ` : "The PDF is attached. "}`
    : opts.copyUrl
      ? "The PDF could not be attached to this message. Use the button above to open your copy. "
      : "The PDF could not be attached to this message. Reply and it will be sent to you. ";
  const reference = rec.fingerprint ? `Reference ${esc(shortFingerprint(rec.fingerprint))}. ` : "";

  const heading = executed ? "It is signed and complete." : "Your signature is recorded.";
  const preheader = executed
    ? `Your ${a.title} is signed and complete.${opts.attached ? " The signed PDF is attached." : ""}`
    : `${waitNames} still ${waiting.length > 1 ? "need" : "needs"} to sign. The completed agreement will follow by email.`;
  const buttonLabel = executed ? "Open your signed copy" : "Open your copy";

  const band = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${p.band}" style="background:${p.band};padding:26px 24px"><p style="margin:0;font-family:${SERIF};font-size:20px;line-height:24px;letter-spacing:.16em;text-transform:uppercase;color:${p.bandText}">${esc(a.brand.name)}</p><p style="margin:2px 0 0;font-family:${SANS};font-size:14px;line-height:20px;color:${p.bandAccent}">${esc(a.title)}</p></td></tr></table>`;

  const footer = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${p.band}" style="background:${p.band};padding:22px 24px"><p style="margin:0;font-family:${SANS};font-size:15px;line-height:24px;color:${p.bandText}">Reply to this email and it reaches ${esc(a.brand.name)}. Or <a href="${BOOK_A_CALL_URL}" style="color:${p.bandAccent};text-decoration:underline">book a call</a>.</p><p style="margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:22px;color:${p.bandAccent}">${esc(a.brand.name)}, ${esc(a.brand.role)}.</p></td></tr></table>`;

  const inner = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:13px;line-height:13px;color:${p.paper}">${esc(preheader)}</div>${band}<div style="background:${p.paper};padding:34px 24px 30px">
<h1 style="margin:0 0 6px;font-family:${SERIF};font-size:34px;line-height:40px;font-weight:400;color:${p.ink}">${heading}</h1>
<p style="margin:0 0 28px;font-family:${SANS};font-size:16px;line-height:24px;color:${p.muted}">${esc(place)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 30px">${steps.join("")}</table>
${opts.copyUrl ? `<div style="margin:0 0 34px">${button(opts.copyUrl, buttonLabel, p)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:1px solid ${p.rule}">${terms}</table>
<p style="margin:16px 0 0;font-family:${SANS};font-size:14px;line-height:22px;color:${p.muted};overflow-wrap:anywhere">${fileLine}Version ${esc(longDate(a.version))}. ${reference}Keep this email for your records.</p>
</div>${footer}`;

  const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${esc(
    executed ? "Signed" : "Signature recorded"
  )}: ${esc(a.title)}</title></head>
<body style="margin:0;padding:0;background:${p.ground}" bgcolor="${p.ground}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${p.ground}" style="background:${p.ground}"><tr><td align="center" style="padding:0">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<div style="max-width:600px;margin:0 auto;text-align:left">${inner}</div>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table>
</body></html>`;

  return {
    subject: executed
      ? `Signed: ${a.title}${a.subtitle ? `, ${a.subtitle}` : ""}`
      : `Your signature is recorded: ${place}`,
    html,
  };
}
