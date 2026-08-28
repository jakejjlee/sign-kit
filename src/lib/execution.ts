/**
 * What a signature is, and when an agreement counts as executed.
 *
 * Ported from the Bluebill agreement, where every rule here was earned by a
 * real defect, and generalized from two named tenants to any party set.
 *
 * The browser never supplies the time. A signature is stamped on the server in
 * the agreement's own zone, because the signer's clock is not evidence of when
 * they signed and a laptop set to the wrong day would file the wrong date.
 */

import type { Agreement, Party } from "../content/types";
import { dayIn, stampIn } from "./dates";

export type SignatureRecord = {
  agreementId: string;
  party: string;
  /** The legal name the agreement binds, copied at signing time. */
  legalName: string;
  /** What the signer actually typed. */
  typed: string;
  /**
   * The version this signature covers, copied from the agreement.
   *
   * This is the rule that matters most. A signature is against a text, not
   * against a document id, so re-issuing a version leaves every earlier
   * signature covering the earlier text and signing closes until each party
   * accepts the new one. Without it, editing a clause after a signature would
   * silently move what somebody agreed to.
   */
  version: string;
  /** Calendar day in the agreement's zone, YYYY-MM-DD. */
  signedOn: string;
  /** Full instant, ISO 8601 UTC. */
  signedAt: string;
  /** Human-readable stamp in the agreement's zone, for the audit line. */
  signedAtLocal: string;
  acceptedAttachments: boolean;
  consentedToElectronicSignature: boolean;
  /** SHA-256 of the exact text and figures at the moment of signing. */
  fingerprint?: string;
  /** The address this signer asked their copy to go to. */
  email?: string;
  /** Audit trail. Absent rather than faked when the platform does not supply it. */
  ip: string | null;
  userAgent: string | null;
};

export type Execution = {
  signatures: Record<string, SignatureRecord | undefined>;
};

export type SignInput = {
  party: string;
  typed: string;
  email: string;
  acceptedAttachments: boolean;
  consentedToElectronicSignature: boolean;
};

export type SignValidation =
  | { ok: true; party: string; legalName: string; typed: string; email: string }
  | { ok: false; field: keyof SignInput | "form"; message: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "Susan  BERMAN" matches "Susan Berman". "S. Berman" does not. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * There is deliberately no honeypot field.
 *
 * A honeypot only works by accepting the submission and throwing it away.
 * Browser autofill fills a hidden field called "company" routinely, which meant
 * a real signer could be shown the full confirmation while nothing was stored.
 * On an unguessable private link shared with named people, that trade was never
 * worth making.
 */
export function validateSignature(
  agreement: Agreement,
  input: SignInput,
  signingAs?: string
): SignValidation {
  const party = agreement.parties.find((p) => p.id === input.party);
  if (!party) {
    return { ok: false, field: "party", message: "That signer is not named on this agreement." };
  }
  if (signingAs && signingAs !== party.id) {
    return { ok: false, field: "party", message: "That signer is not named on this agreement." };
  }
  if (!party.legalName.trim()) {
    return {
      ok: false,
      field: "party",
      message: "That party has not been named on this agreement yet, so it cannot be signed.",
    };
  }

  const typed = (input.typed || "").trim().replace(/\s+/g, " ");
  if (!typed) {
    return { ok: false, field: "typed", message: "Please type your full name to sign." };
  }
  if (normalize(typed) !== normalize(party.legalName)) {
    // Deliberately does NOT repeat the legal name. This endpoint is reachable
    // by anyone holding the link, and echoing the name turned a failed attempt
    // into a way to read every party's legal name out of the error.
    return {
      ok: false,
      field: "typed",
      message:
        "That does not match the name on the agreement. Please type it exactly as it appears.",
    };
  }
  if (!input.acceptedAttachments) {
    return {
      ok: false,
      field: "acceptedAttachments",
      message: "Please confirm you have received everything attached to this agreement.",
    };
  }
  if (!input.consentedToElectronicSignature) {
    return {
      ok: false,
      field: "consentedToElectronicSignature",
      message: "Please agree to sign this agreement electronically.",
    };
  }

  const email = (input.email || "").trim();
  if (!EMAIL.test(email)) {
    return {
      ok: false,
      field: "email",
      message: "Please add an email address so we can send you your signed copy.",
    };
  }

  return { ok: true, party: party.id, legalName: party.legalName, typed, email };
}

/**
 * Is this a record we are willing to treat as real?
 *
 * The store cannot delete, so a malformed or foreign file in the folder is
 * permanent. Without this check one bad record threw while formatting a date
 * and took down every page load and every PDF, with no way to remove it.
 *
 * A record naming a different version is stale rather than invalid: it is kept
 * as evidence that somebody signed an earlier text, and it does not count
 * toward execution of this one.
 */
export function isValidRecord(rec: unknown, agreement: Agreement): rec is SignatureRecord {
  if (!rec || typeof rec !== "object") return false;
  const r = rec as Record<string, unknown>;
  if (r.agreementId !== agreement.id) return false;
  if (!agreement.parties.some((p) => p.id === r.party)) return false;
  if (typeof r.legalName !== "string" || typeof r.typed !== "string") return false;
  if (typeof r.version !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.version)) return false;
  if (typeof r.signedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.signedOn)) return false;
  if (typeof r.signedAtLocal !== "string" || !r.signedAtLocal) return false;
  return true;
}

/** Signatures against the version being shown. A stale one does not count. */
export function currentSignatures(agreement: Agreement, ex: Execution): Execution["signatures"] {
  const out: Execution["signatures"] = {};
  for (const [id, rec] of Object.entries(ex.signatures)) {
    if (rec && rec.version === agreement.version) out[id] = rec;
  }
  return out;
}

export function namedParties(agreement: Agreement): Party[] {
  return agreement.parties.filter((p) => p.legalName.trim().length > 0);
}

/** Every named party has signed the version on screen. */
export function isFullyExecuted(agreement: Agreement, ex: Execution): boolean {
  const named = namedParties(agreement);
  if (named.length !== agreement.parties.length) return false;
  const current = currentSignatures(agreement, ex);
  return named.every((p) => Boolean(current[p.id]));
}

export function outstandingParties(agreement: Agreement, ex: Execution): Party[] {
  const current = currentSignatures(agreement, ex);
  return namedParties(agreement).filter((p) => !current[p.id]);
}

export type Gate =
  | { open: true }
  | { open: false; reason: string };

/**
 * May anyone sign right now?
 *
 * Two things close it, and both are refused at the endpoint rather than merely
 * hidden in the panel, because a disabled button is never the gate and a filed
 * signature is write-once against a store that cannot delete it again.
 *
 * 1) A party has not been named. A lease with no tenant binds nobody, and a
 *    blank rule under a role invites a name that means nothing.
 * 2) A party who signs first has not. On the Bluebill lease the owner had to
 *    affirm a revision before the tenants could be bound to it.
 */
export function signingGate(agreement: Agreement, ex: Execution, forParty?: string): Gate {
  const unnamed = agreement.parties.filter((p) => !p.legalName.trim());
  if (unnamed.length > 0) {
    const roles = unnamed.map((p) => p.role.toLowerCase()).join(" and ");
    return {
      open: false,
      reason:
        `This agreement has no ${roles} named yet, so there is nobody for it to bind. ` +
        `Once we agree who that is, their name goes on it and this page opens for signature.`,
    };
  }

  const current = currentSignatures(agreement, ex);
  const waitingOn = agreement.parties.filter((p) => p.signsFirst && !current[p.id]);

  // The party who signs first is not waiting on themselves. Without this the
  // gate locked out the one person who could open it, and the page showed the
  // owner a notice saying the owner had not signed. Found by driving the real
  // form rather than by a test, which is why it is now both.
  const asksForThemselves = Boolean(forParty && waitingOn.some((p) => p.id === forParty));

  if (waitingOn.length > 0 && !asksForThemselves) {
    const who = waitingOn.map((p) => p.legalName).join(" and ");
    return {
      open: false,
      reason:
        `${who} has not signed this version yet. Signing opens as soon as they do, and you ` +
        `will be signing exactly the version shown on this page. Nothing is owed in the meantime.`,
    };
  }

  return { open: true };
}

/** Build the record. The only place a signature is constructed. */
export function makeRecord(
  agreement: Agreement,
  checked: { party: string; legalName: string; typed: string; email: string },
  meta: { fingerprint: string; ip: string | null; userAgent: string | null },
  now: Date
): SignatureRecord {
  return {
    agreementId: agreement.id,
    party: checked.party,
    legalName: checked.legalName,
    typed: checked.typed,
    version: agreement.version,
    signedOn: dayIn(agreement.timezone, now),
    signedAt: now.toISOString(),
    signedAtLocal: stampIn(agreement.timezone, now),
    acceptedAttachments: true,
    consentedToElectronicSignature: true,
    fingerprint: meta.fingerprint,
    email: checked.email,
    ip: meta.ip,
    userAgent: meta.userAgent,
  };
}
