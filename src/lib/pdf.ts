import type { Agreement } from "../content/types";
import { longDate } from "./dates";
import { currentSignatures, isFullyExecuted, type Execution } from "./execution";
import { shortFingerprint } from "./fingerprint";
import { renderPdf, type PdfModel } from "./pdf-core";

/**
 * The agreement as a downloadable PDF.
 *
 * Laid out from the same record the page renders, so the file a signer keeps
 * cannot say something different from the document they read and signed. Only
 * the typography differs. The layout itself lives in pdf-core.ts, shared with
 * sites that cannot depend on the kit; this file only describes a kit
 * Agreement and its Execution to it.
 */

export function agreementPdfModel(a: Agreement, ex: Execution): PdfModel {
  const signatures = currentSignatures(a, ex);
  const executed = isFullyExecuted(a, ex);
  const allInitials = Object.values(ex.signatures).flatMap((s) => s?.initials ?? []);

  const initialed = a.parties.flatMap((p) => {
    const sig = ex.signatures[p.id];
    return (sig?.initials ?? []).map((i) => ({ role: p.role, ...i }));
  });

  return {
    eyebrow: a.title,
    heading: a.subtitle,
    preparedBy: `Prepared by ${a.brand.name}, ${a.brand.role}. ${a.brand.phone}.`,
    parties: a.parties.map((p) => `${p.role}: ${p.legalName.trim() || "to be named"}`),
    payable:
      a.money.lines.length > 0
        ? {
            lines: a.money.lines.map((line) => ({
              label: line.refundable ? `${line.label}, refundable` : line.label,
              value: usdish(line.amount),
              total: Boolean(line.isTotal),
            })),
            footnote: `Paid to ${a.money.paidTo}, by ${a.money.method}.`,
          }
        : undefined,
    body: a.body.map((sec) => ({
      n: sec.n,
      group: sec.group,
      title: sec.title,
      blocks: sec.blocks,
      mark:
        allInitials
          .filter((i) => i.clause === sec.n)
          .map((i) => i.initials)
          .join(" ") || undefined,
    })),
    attachments: a.attachments.map((x) => {
      const auth = x.authority ? `  (${x.authority})` : "";
      const req = x.required ? "  Required by law." : "";
      return `${x.title}${auth}${req}`;
    }),
    initialsSchedule: initialed.map((i) => `Section ${i.clause}, ${i.initials}, ${i.role}, ${i.at}`),
    signatures: a.parties.map((p) => {
      const sig = signatures[p.id];
      const named = p.legalName.trim().length > 0;
      return {
        caption: `${named ? p.legalName : "To be named"}, ${p.role}`,
        named,
        typed: sig?.typed,
        status: sig
          ? `Signed electronically ${sig.signedAtLocal}`
          : named
            ? "Awaiting signature"
            : "No party named yet",
      };
    }),
    closing:
      `Version ${longDate(a.version)}. Signed electronically under ${a.esignAct}. ` +
      `Signed in counterparts and delivered electronically.`,
    record: executed
      ? {
          lines: a.parties.flatMap((p) => {
            const sig = signatures[p.id];
            if (!sig) return [];
            return [
              `${sig.legalName} typed "${sig.typed}" and signed on ${sig.signedAtLocal}. ` +
                `Confirmed receipt of everything attached and consented to sign electronically.` +
                `${sig.ip ? ` Recorded from ${sig.ip}.` : ""}` +
                `${sig.fingerprint ? ` Agreement fingerprint ${shortFingerprint(sig.fingerprint)}.` : ""}`,
            ];
          }),
          footnote: `Times shown in ${a.timezone.replace("_", " ")}.`,
        }
      : undefined,
    footerLabel: a.subtitle ?? a.title,
  };
}

export async function renderAgreementPdf(a: Agreement, ex: Execution): Promise<Uint8Array> {
  return renderPdf(agreementPdfModel(a, ex));
}

/** Local copy so the PDF never imports the surface's formatter. */
function usdish(v: number): string {
  const neg = v < 0;
  const abs = Math.abs(v);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}$${whole}.${frac}`;
}

/** A stamped filename, so a saved copy sorts and identifies itself. */
export function pdfFilename(a: Agreement, ex: Execution): string {
  // A copy with some signatures on it is not a draft; say what it is (2026-11-14).
  // The name carries the client or place AND the document, so a search finds it.
  const stamp = isFullyExecuted(a, ex) ? "signed" : "partly-signed";
  const slug = `${a.subtitle ? `${a.subtitle} ` : ""}${a.title}`
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90)
    .replace(/-$/, "");
  return `${slug}-${stamp}.pdf`;
}
