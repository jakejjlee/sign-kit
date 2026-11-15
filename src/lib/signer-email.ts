import type { Agreement, BrandToken } from "../content/types";
import { longDate } from "./dates";
import { isFullyExecuted, outstandingParties, type Execution, type SignatureRecord } from "./execution";
import { shortFingerprint } from "./fingerprint";
import {
  DEFAULT_FACES,
  type BuiltEmail,
  type EmailModel,
  FALLBACK,
  type Palette,
  isHex,
  makePalette,
  renderSignerEmail,
} from "./signer-email-core";

/**
 * The signer's confirmation email, direction d3, "The Track". The design itself
 * lives in signer-email-core.ts and is shared with the Sun Mountain Stays site;
 * this file only describes a kit Agreement to it.
 *
 * No phone number appears anywhere on this email. Contact is the reply.
 */

export { contrast } from "./signer-email-core";
export type { Palette as SignerPalette } from "./signer-email-core";

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

const FACES = DEFAULT_FACES;

function token(a: Agreement, k: BrandToken): string | undefined {
  const v = a.brand.tokens?.[k];
  return isHex(v) ? v : undefined;
}

export function signerPalette(a: Agreement): Palette {
  return makePalette({
    paper: token(a, "paper") ?? FALLBACK.paper,
    ground: token(a, "ground") ?? FALLBACK.ground,
    ink: token(a, "ink"),
    muted: token(a, "muted"),
    rule: token(a, "rule") ?? FALLBACK.rule,
    band: token(a, "accentText") ?? token(a, "accent"),
    accent: token(a, "accent"),
  });
}

/** "243 Lincoln Avenue, Unit 2, Cliffside Park, NJ" becomes "243 Lincoln Avenue, Unit 2". */
export function shortPlace(subtitle: string): string {
  const parts = subtitle.split(",").map((s) => s.trim());
  if (parts.length <= 2) return subtitle;
  return /^(unit|apt|apartment|suite|ste|room|floor|#)/i.test(parts[1]) ? `${parts[0]}, ${parts[1]}` : parts[0];
}

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
): BuiltEmail {
  const executed = isFullyExecuted(a, ex);
  const waiting = outstandingParties(a, ex).map((w) => ({ name: w.legalName, role: w.role }));
  const place = a.subtitle ?? a.title;

  const note: string[] = [];
  if (opts.attached) {
    const name = opts.attachmentName ? `${opts.attachmentName} is attached` : "The PDF is attached";
    note.push(executed ? `${name}.` : `${name}, as it stands with the signatures so far.`);
  } else if (opts.copyUrl) {
    note.push("The PDF could not be attached to this message. Use the button above to open your copy.");
  } else {
    note.push("The PDF could not be attached to this message. Reply and it will be sent to you.");
  }

  const model: EmailModel = {
    palette: signerPalette(a),
    faces: FACES,
    logo: a.brand.logo,
    fontsHref: a.brand.fontsHref,
    brandName: a.brand.name,
    docTitle: a.title,
    subjectPlace: a.subtitle,
    place,
    signedBy: rec.legalName,
    signedRole: a.parties.find((p) => p.id === rec.party)?.role,
    others: a.parties
      .filter((p) => p.id !== rec.party && ex.signatures[p.id])
      .map((p) => ({
        name: p.legalName,
        role: p.role,
        when: ex.signatures[p.id]?.signedAtLocal.replace(/(\d{1,2}:\d{2}):\d{2}/, "$1"),
      })),
    signedWhen: rec.signedAtLocal.replace(/(\d{1,2}:\d{2}):\d{2}/, "$1"),
    waiting,
    nextStep: opts.nextStep,
    completeDetail: opts.attached ? "Every party has signed. The signed PDF is attached." : "Every party has signed.",
    completion: {
      title: "We email you when it is complete",
      detail: "You get the completed agreement as a PDF, from this address.",
    },
    button: opts.copyUrl ? { url: opts.copyUrl } : undefined,
    note,
    terms: a.letter.summary.map((r) => ({ label: r.label, value: r.value })),
    fineprint: [`Version ${longDate(a.version)}.`, ...(rec.fingerprint ? [`Reference ${shortFingerprint(rec.fingerprint)}.`] : [])],
    bookUrl: BOOK_A_CALL_URL,
    legalLine: `${a.brand.name}, ${a.brand.role}.`,
  };
  return renderSignerEmail(model);
}
