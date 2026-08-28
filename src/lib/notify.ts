import { Resend } from "resend";

import type { Agreement } from "../content/types";
import { longDate } from "./dates";
import { isFullyExecuted, outstandingParties, type Execution, type SignatureRecord } from "./execution";
import { shortFingerprint } from "./fingerprint";
import { pdfFilename, renderAgreementPdf } from "./pdf";

/**
 * Getting the signed document to the people who need it.
 *
 * Two rules govern this file, both ported from the Bluebill agreement.
 *
 * 1. Email NEVER decides whether a signature counts. The signature is stored
 *    first and stands on its own. Delivery is attempted afterwards, and a
 *    failure is reported to the signer as a delivery problem, never as a
 *    signing problem. The download on the page is always the fallback.
 *
 * 2. A failure is never silent. If the copy did not go out, the signer is told
 *    on screen and the operator is told in the logs, because "nothing arrived"
 *    and "nothing was sent" look identical from the outside.
 */

export type DeliveryResult = {
  signerCopy: boolean;
  operatorNotice: boolean;
  detail: string;
};

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string);
}

/** One visual language, taking the brand's own accent so the mail matches the page. */
function shell(a: Agreement, heading: string, lead: string, body: string): string {
  const accent = a.brand.tokens?.accent ?? "#7a4a22";
  const ground = a.brand.tokens?.ground ?? "#f3ede1";
  const paper = a.brand.tokens?.paper ?? "#fbf8f1";
  return `
  <div style="margin:0;padding:28px 18px;background:${ground};font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:560px;margin:0 auto;background:${paper};border:1px solid #ddd2bb;padding:32px 30px">
      <p style="margin:0 0 22px;font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.14em;
        text-transform:uppercase;color:${accent}">${esc(a.title)}</p>
      <h1 style="margin:0 0 6px;font-size:23px;line-height:1.15;font-weight:400;color:#1b1a16">${esc(heading)}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b6455">${esc(a.subtitle ?? "")}</p>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#3d382e">${lead}</p>
      ${body}
      <p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e5dac4;
        font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;color:#6b6455">
        ${esc(a.brand.name)}, ${esc(a.brand.role)}.<br>
        Call or text <a href="${a.brand.phoneHref}" style="color:${accent}">${esc(a.brand.phone)}</a>.
      </p>
    </div>
  </div>`;
}

function rows(pairs: [string, string][]): string {
  return `<table style="border-collapse:collapse;width:100%;margin:0 0 20px">${pairs
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 0;border-bottom:1px solid #e5dac4;font-family:system-ui,sans-serif;
          font-size:14px;color:#6b6455">${esc(k)}</td>
         <td style="padding:9px 0;border-bottom:1px solid #e5dac4;text-align:right;
          font-family:ui-monospace,SFMono-Regular,monospace;font-size:14px;color:#1b1a16">${esc(v)}</td></tr>`
    )
    .join("")}</table>`;
}

function signerEmail(a: Agreement, rec: SignatureRecord, ex: Execution) {
  const executed = isFullyExecuted(a, ex);
  const waiting = outstandingParties(a, ex);

  const status = executed
    ? `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#3d382e">
         Everyone named on it has now signed. Your completed copy is attached.
       </p>`
    : `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#3d382e">
         ${esc(waiting.map((p) => p.legalName).join(" and "))} still needs to sign. The copy
         attached shows it as it stands, and you will get the completed one once they have.
       </p>`;

  return {
    subject: executed
      ? `Signed: ${a.title}, ${a.subtitle ?? ""}`.trim()
      : `Your signature is recorded, ${a.subtitle ?? a.title}`,
    html: shell(
      a,
      executed ? "This agreement is complete" : "Your signature is recorded",
      `Thank you, ${esc(rec.legalName)}. You signed on ${esc(rec.signedAtLocal)}.`,
      `${status}
       ${rows(a.letter.summary.map((r) => [r.label, r.value] as [string, string]))}
       <p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;line-height:1.6;color:#6b6455">
         Version ${esc(longDate(a.version))}. Reference
         ${esc(shortFingerprint(rec.fingerprint ?? ""))}. Keep the attached PDF.
       </p>`
    ),
  };
}

function operatorEmail(a: Agreement, rec: SignatureRecord, ex: Execution) {
  const executed = isFullyExecuted(a, ex);
  const waiting = outstandingParties(a, ex);
  return {
    subject: executed
      ? `FULLY EXECUTED: ${a.subtitle ?? a.title}`
      : `Signed by ${rec.legalName}: ${a.subtitle ?? a.title}`,
    html: shell(
      a,
      executed ? "Fully executed" : `${rec.legalName} has signed`,
      executed
        ? "Every party has signed. The executed agreement is attached."
        : `${esc(waiting.map((p) => p.legalName).join(" and "))} has not signed yet.`,
      rows([
        ["Signed by", rec.legalName],
        ["Typed", rec.typed],
        ["When", rec.signedAtLocal],
        ["Their email", rec.email ?? "not given"],
        ["From", rec.ip ?? "not recorded"],
        ["Version", longDate(rec.version)],
        ["Fingerprint", shortFingerprint(rec.fingerprint ?? "none")],
      ]) +
        `<p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;line-height:1.6;color:#6b6455">
           The signature record is filed in the agreements folder on the shared drive. This
           email is the notification, not the record.
         </p>`
    ),
  };
}

/** Can this environment actually deliver? Reported by the health route. */
export function deliveryConfig() {
  const apiKey = Boolean(process.env.RESEND_API_KEY);
  const from = process.env.AGREEMENT_FROM_EMAIL || process.env.LEAD_FROM_EMAIL || "";
  const sharedSender = !from || from.includes("resend.dev");
  return {
    configured: apiKey,
    from: from || "not set",
    operator: process.env.LEAD_TO_EMAIL || "not set",
    // Resend's shared sender only delivers to the account owner, so a signer
    // would silently never receive their copy.
    canReachSigners: apiKey && !sharedSender,
    note: !apiKey
      ? "RESEND_API_KEY is not set. No copies will be emailed to anyone."
      : sharedSender
        ? "No verified sender is set, so mail would go from Resend's shared test address, which only delivers to the Resend account owner. A signer will NOT receive their copy. Set AGREEMENT_FROM_EMAIL to a verified sender."
        : "Configured to deliver to signers.",
  };
}

export async function deliverSignedCopy(
  a: Agreement,
  rec: SignatureRecord,
  ex: Execution
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const cfg = deliveryConfig();
  if (!apiKey) {
    return {
      signerCopy: false,
      operatorNotice: false,
      detail:
        "RESEND_API_KEY is not set, so no copy was emailed. The signature is filed and the " +
        "document is downloadable from the page.",
    };
  }

  let attachments: { filename: string; content: Buffer }[] | undefined;
  try {
    const bytes = await renderAgreementPdf(a, ex);
    attachments = [{ filename: pdfFilename(a, ex), content: Buffer.from(bytes) }];
  } catch (err) {
    console.error("[sign-kit] could not render the PDF for delivery:", err);
  }

  const resend = new Resend(apiKey);
  const from = cfg.from === "not set" ? "onboarding@resend.dev" : cfg.from;
  const operator = process.env.LEAD_TO_EMAIL || a.brand.email;
  const notes: string[] = [];

  let signerCopy = false;
  if (rec.email) {
    const msg = signerEmail(a, rec, ex);
    try {
      const { error } = await resend.emails.send({
        from, to: rec.email, replyTo: operator,
        subject: msg.subject, html: msg.html, attachments,
      });
      if (error) throw new Error(error.message);
      signerCopy = true;
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.error(`[sign-kit] signer copy to ${rec.email} failed: ${m}`);
      notes.push(`copy to the signer failed (${m})`);
    }
  } else {
    notes.push("no address was given for the signer");
  }

  // Sent even when the signer's copy failed, because that failure is exactly
  // the thing the operator needs to know about.
  let operatorNotice = false;
  const op = operatorEmail(a, rec, ex);
  try {
    const { error } = await resend.emails.send({
      from, to: operator, replyTo: rec.email ?? undefined,
      subject: (signerCopy ? "" : "[SIGNER COPY FAILED] ") + op.subject,
      html: op.html, attachments,
    });
    if (error) throw new Error(error.message);
    operatorNotice = true;
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.error(`[sign-kit] operator notice to ${operator} failed: ${m}`);
    notes.push(`notice to ${operator} failed (${m})`);
  }

  return {
    signerCopy,
    operatorNotice,
    detail: notes.length ? notes.join("; ") : "Copies sent.",
  };
}
