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
import { buildSignerEmail, signerFaces, signerPalette, type SignerEmailOptions } from "./signer-email";
import { renderOperatorEmail } from "./signer-email-core";

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

/**
 * The notice to the business inbox when someone signs: the same Certificate as the signer's email, so
 * the person reading it sees who signed and when, every signer's state, and the record, at a glance.
 * The subject follows the one convention: "<place> | <document> | Signed by <name>, <date>", or
 * "Fully signed, <name> last, <date>" when this signature completes it.
 */
export function buildOperatorEmail(
  a: Agreement,
  rec: SignatureRecord,
  ex: Execution,
  opts: { attached?: boolean; attachmentName?: string; copyUrl?: string } = {}
) {
  const executed = isFullyExecuted(a, ex);
  const waiting = outstandingParties(a, ex).map((p) => ({ name: p.legalName, role: p.role }));
  const stamp = (s: string) => s.replace(/(\d{1,2}:\d{2}):\d{2}/, "$1");
  const record: { label: string; value: string }[] = [];
  if (rec.typed && rec.typed !== rec.legalName) record.push({ label: "Typed", value: rec.typed });
  record.push(
    { label: "Their email", value: rec.email ?? "not given" },
    { label: "From", value: rec.ip ?? "not recorded" },
    { label: "Version", value: longDate(rec.version) }
  );
  const note: string[] = [];
  if (opts.attached && !opts.attachmentName) note.push(executed ? "The signed PDF is attached." : "The PDF is attached, as it stands with the signatures so far.");
  note.push("The signature record is filed in the agreements folder on the shared drive. This email is the notification, not the record.");
  return renderOperatorEmail({
    palette: signerPalette(a),
    faces: signerFaces(a),
    brandName: a.brand.name,
    logo: a.brand.logo,
    fontsHref: a.brand.fontsHref,
    docTitle: a.title,
    subjectPlace: a.subtitle,
    place: a.subtitle ?? a.title,
    signedBy: rec.legalName,
    signedRole: a.parties.find((p) => p.id === rec.party)?.role,
    signedWhen: stamp(rec.signedAtLocal),
    others: a.parties
      .filter((p) => p.id !== rec.party && ex.signatures[p.id])
      .map((p) => ({ name: p.legalName, role: p.role, when: stamp(ex.signatures[p.id]?.signedAtLocal ?? "") })),
    order: a.parties.map((p) => p.legalName),
    waiting,
    record,
    documentId: rec.fingerprint ? shortFingerprint(rec.fingerprint) : undefined,
    attachment:
      opts.attached && opts.attachmentName
        ? { name: opts.attachmentName, note: executed ? "Signed by every party, attached" : "As signed so far, attached" }
        : undefined,
    button: opts.copyUrl ? { url: opts.copyUrl } : undefined,
    note,
    legalLine: `${a.brand.name}, ${a.brand.role}.`,
  });
}

/** Can this environment actually deliver? Reported by the health route. */
export function deliveryConfig() {
  const apiKey = Boolean(process.env.RESEND_API_KEY);
  const from = process.env.AGREEMENT_FROM_EMAIL || process.env.LEAD_FROM_EMAIL || "";
  const sharedSender = !from || from.includes("resend.dev");
  return {
    configured: apiKey,
    from: from || "not set",
    // Signing alerts never reuse the site lead address (LEAD_TO_EMAIL): it belongs to the lead forms and
    // may point anywhere (2026-11-23: a dead fallback swallowed 19 lease alerts). Standard:
    // ~/.claude/docs/signing-and-forms-mail-standard.md section 2.
    operator: operatorInbox(),
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
  const operator = operatorInbox(a.brand.email);
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

  const op = buildOperatorEmail(a, rec, ex, {
    attached: Boolean(attachments),
    attachmentName: attachments?.[0]?.filename,
    copyUrl: signerOpts.copyUrl,
  });
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

/**
 * The inbox that gets the signing alert: AGREEMENT_ALERT_EMAIL when set, otherwise the inbox of the
 * business that is party to the document (its brand email). Never LEAD_TO_EMAIL, never a guessed
 * fallback. Every address used here must be on the verified list in
 * ~/.claude/docs/signing-and-forms-mail-standard.md (proven to land in a mailbox Jake reads).
 */
export function operatorInbox(brandEmail?: string): string {
  return process.env.AGREEMENT_ALERT_EMAIL?.trim() || brandEmail?.trim() || "not set";
}
