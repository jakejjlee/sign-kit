import { Resend } from "resend";

import type { Agreement } from "../content/types";
import { longDate } from "./dates";
import {
  currentSignatures,
  isFullyExecuted,
  outstandingParties,
  type Execution,
  type SignatureRecord,
} from "./execution";
import { shortFingerprint } from "./fingerprint";
import { pdfFilename, renderAgreementPdf } from "./pdf";
import { buildSignerEmail, type SignerEmailOptions } from "./signer-email";
import { joinNames } from "./signer-email-core";

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
 *
 * Speed: the PDF is rendered once and shared; every signer email and the
 * operator notice go out side by side, each with its own time limit, so the
 * slowest single call sets the delay and one hung call can hold nothing else up.
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

function operatorEmail(a: Agreement, rec: SignatureRecord, ex: Execution) {
  const executed = isFullyExecuted(a, ex);
  const waiting = outstandingParties(a, ex);
  const facts: [string, string][] = [
    ["Signed by", rec.legalName],
    ["Typed", rec.typed],
    ["When", rec.signedAtLocal],
    ["Their email", rec.email ?? "not given"],
    ["From", rec.ip ?? "not recorded"],
    ["Version", longDate(rec.version)],
    ["Fingerprint", shortFingerprint(rec.fingerprint ?? "none")],
  ];
  const lead = executed
    ? "Every party has signed. The executed agreement is attached."
    : `${joinNames(waiting.map((p) => p.legalName))} ${waiting.length > 1 ? "have" : "has"} not signed yet.`;
  const heading = executed ? "Fully executed" : `${rec.legalName} has signed`;
  const filed =
    "The signature record is filed in the agreements folder on the shared drive. This email is the notification, not the record.";
  return {
    subject: executed
      ? `FULLY EXECUTED: ${a.subtitle ?? a.title}`
      : `Signed by ${rec.legalName}: ${a.subtitle ?? a.title}`,
    html: shell(
      a,
      heading,
      lead,
      rows(facts) +
        `<p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;line-height:1.6;color:#6b6455">${filed}</p>`
    ),
    text: [heading, lead, "", ...facts.map(([k, v]) => `${k}: ${v}`), "", filed].join("\n"),
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

/** The longest any single mail call, or the PDF render, may hold the signing response. */
export const STEP_TIMEOUT_MS = 8000;

/** Resolves to "timeout" if the work outlasts the limit; leaves no stray timer and no unhandled rejection. */
async function within<T>(work: Promise<T>, ms: number): Promise<T | "timeout"> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const clock = new Promise<"timeout">((resolve) => {
    id = setTimeout(() => resolve("timeout"), ms);
  });
  work.catch(() => {});
  try {
    return await Promise.race([work, clock]);
  } finally {
    clearTimeout(id);
  }
}

/** "Brand <address>" so the inbox list shows a name, not a bare address. */
function fromHeader(brandName: string, configured: string): string {
  return configured.includes("<") ? configured : `${brandName} <${configured}>`;
}

export async function deliverSignedCopy(
  a: Agreement,
  rec: SignatureRecord,
  ex: Execution,
  /** Where the signer's button goes and any real next date. Both optional. */
  signerOpts: Pick<SignerEmailOptions, "copyUrl" | "nextStep"> = {}
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

  // One PDF, rendered once, shared by every message.
  let attachments: { filename: string; content: Buffer }[] | undefined;
  try {
    const rendered = await within(renderAgreementPdf(a, ex), STEP_TIMEOUT_MS);
    if (rendered === "timeout") {
      console.error(`[sign-kit] the PDF took over ${STEP_TIMEOUT_MS / 1000}s to render; sending without it.`);
    } else {
      attachments = [{ filename: pdfFilename(a, ex), content: Buffer.from(rendered) }];
    }
  } catch (err) {
    console.error("[sign-kit] could not render the PDF for delivery:", err);
  }

  const resend = new Resend(apiKey);
  const from = fromHeader(a.brand.name, cfg.from === "not set" ? "onboarding@resend.dev" : cfg.from);
  const operator = process.env.LEAD_TO_EMAIL || a.brand.email;
  const executed = isFullyExecuted(a, ex);

  /** Null when it went out; otherwise the reason, in words. Never throws. */
  const deliver = async (
    to: string,
    replyTo: string | undefined,
    mail: { subject: string; html: string; text: string }
  ): Promise<string | null> => {
    try {
      const sent = await within(
        resend.emails.send({ from, to, replyTo, subject: mail.subject, html: mail.html, text: mail.text, attachments }),
        STEP_TIMEOUT_MS
      );
      if (sent === "timeout") return `took over ${STEP_TIMEOUT_MS / 1000}s`;
      return sent.error ? sent.error.message : null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  };

  /**
   * Who is owed a signer email: the person who just signed, always; and when
   * this signature completes the agreement, every earlier signer with an
   * address too, because their waiting email promised them the completed copy.
   */
  const recipients: SignatureRecord[] = [rec];
  if (executed) {
    for (const other of Object.values(currentSignatures(a, ex))) {
      if (other && other.party !== rec.party && other.email) recipients.push(other);
    }
  }

  const signerJobs = recipients.map(async (who) => {
    if (!who.email) return { who, problem: "no address was given for the signer" };
    const mail = buildSignerEmail(a, who, ex, {
      ...signerOpts,
      attached: Boolean(attachments),
      attachmentName: attachments?.[0]?.filename,
    });
    const problem = await deliver(who.email, operator, mail);
    if (problem) console.error(`[sign-kit] signer copy for ${who.party} failed: ${problem}`);
    return { who, problem };
  });

  const op = operatorEmail(a, rec, ex);
  const operatorJob = deliver(operator, rec.email ?? undefined, op).then((problem) => {
    if (problem) console.error(`[sign-kit] operator notice to ${operator} failed: ${problem}`);
    return problem;
  });

  const [signerResults, operatorProblem] = await Promise.all([Promise.all(signerJobs), operatorJob]);
  const mine = signerResults.find((r) => r.who === rec);

  // The operator needs to know when the signer's own copy did not arrive. The notice above is already
  // on its way, so a failure costs one more short alert and a success costs nothing extra.
  if (mine?.problem) {
    const why = rec.email ? "SIGNER COPY FAILED" : "NO SIGNER ADDRESS";
    const alert = await deliver(operator, rec.email ?? undefined, {
      subject: `[${why}] ${op.subject}`,
      html: op.html,
      text: op.text,
    });
    if (alert) console.error(`[sign-kit] operator alert to ${operator} failed: ${alert}`);
  }

  const notes: string[] = [];
  for (const r of signerResults) if (r.problem) notes.push(`copy to ${r.who.party} failed (${r.problem})`);
  if (operatorProblem) notes.push(`notice to ${operator} failed (${operatorProblem})`);
  return {
    signerCopy: mine ? mine.problem === null : false,
    operatorNotice: operatorProblem === null,
    detail: notes.length ? notes.join("; ") : "Copies sent.",
  };
}
