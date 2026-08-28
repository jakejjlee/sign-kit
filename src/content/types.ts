/**
 * What an agreement is, as data.
 *
 * One model has to carry two documents that look nothing alike. On one side, a
 * short negotiated furnished-stay agreement of about fifteen sections, written
 * to be read end to end. On the other, a real New Jersey residential lease of
 * twenty-four pages, most of it statutory disclosure the state requires and
 * nobody reads, signed in three separate places because each addendum carries
 * its own execution block.
 *
 * Everything here is derived from those two documents rather than imagined. If
 * a field exists it is because a real agreement needed it.
 *
 * The rule that governs this file: a fact is either recorded or absent. There
 * is no placeholder, no "TBD", and no default that invents a term. A lease with
 * no pet policy renders without one rather than claiming pets are forbidden.
 */

import type { Cents } from "../lib/money";

/* ------------------------------------------------------------------ brand -- */

/**
 * Who is sending this, and what the document wears.
 *
 * The look belongs to the business behind the door, never to this kit. A
 * Palisade lease and a Sun Mountain lease are the same instrument in different
 * clothes, and every business looking like the same product is how bespoke
 * work ends up looking generic.
 */
export type Brand = {
  /** The operating business, as the signer knows it. */
  name: string;
  /** What this business does in relation to the document, in the signer's words. */
  role: string;
  phone: string;
  /** tel: href. Kept beside the display form so neither can drift. */
  phoneHref: string;
  email: string;
  /** Two or three letters for the sender mark. Never generated from the name. */
  initials: string;
  /**
   * Token overrides. Anything omitted falls back to the consuming site's own
   * tokens, which is the normal case: the lease should look like the site it
   * came from, not like a product bolted onto it.
   */
  tokens?: Partial<Record<BrandToken, string>>;
};

export type BrandToken =
  | "ground"
  | "paper"
  | "ink"
  | "muted"
  | "rule"
  | "accent"
  | "accentText";

/* ---------------------------------------------------------------- parties -- */

/**
 * Someone who signs.
 *
 * `id` is durable: it keys the stored signature, so renaming one after a
 * signature is filed orphans that record. Add a party, never rename one.
 */
export type Party = {
  id: string;
  /** The legal name the document binds. Typed exactly to sign. */
  legalName: string;
  /** "Tenant", "Co-tenant", "Landlord", "Owner", "Contractor". */
  role: string;
  /**
   * True when this party's signature must be on file before the others may
   * sign. The Bluebill case: the owner affirmed a revision, and until he did,
   * signing was refused rather than binding tenants to a version he had not
   * accepted.
   */
  signsFirst?: boolean;
  /** Where their copy goes. Absent when they have not given one yet. */
  email?: string;
};

/* --------------------------------------------------------------- the body -- */

export type Block =
  | { k: "p"; text: string }
  | { k: "list"; items: string[] }
  | { k: "rows"; rows: [string, string][]; total?: [string, string] }
  | { k: "caps"; text: string };

export type Section = {
  /** Number as printed. Held rather than derived, because a real lease numbers
   *  1.5.3 and array position cannot produce that. */
  n: string;
  title: string;
  blocks: Block[];
};

/**
 * A part of the document that carries its own signature block.
 *
 * The 243 Lincoln lease is signed three times: the lease, the Parking
 * Addendum and the Rules Addendum. A signer must be told that before they
 * start, not discover it at the third execution page.
 */
export type SignaturePoint = {
  id: string;
  /** As the document itself names it. */
  title: string;
  /** Which parties sign here. Defaults to every party when absent. */
  parties?: string[];
};

/**
 * Something bound into the agreement that the signer is agreeing to but is not
 * going to read, and which cannot be summarized away.
 *
 * These are the state's words, not ours. `required` marks the ones a
 * jurisdiction compels, which is what lets the surface say plainly why twelve
 * pages of statute are attached to a rental of one apartment.
 */
export type Attachment = {
  id: string;
  /** Exactly as the document names it. Never retitled to read better. */
  title: string;
  /** Why it is here, in the signer's language. */
  note?: string;
  /** The statute or rule that compels it, when one does. */
  authority?: string;
  required: boolean;
  /** Page range in the executed document, when the document is paginated. */
  pages?: string;
};

/* ----------------------------------------------------------------- money --- */

/**
 * What the signer pays, and when.
 *
 * Every line is a fact from the document. `dueNote` carries the timing in the
 * document's own terms rather than a date this kit computes, because "the
 * later of December 23 and the fifth business day after written approval" is
 * a real due date and no date type can hold it.
 */
export type MoneyLine = {
  id: string;
  label: string;
  amount: Cents;
  dueNote: string;
  /** True for a deposit or anything else that comes back. */
  refundable?: boolean;
  /** True when this is a total of the lines above rather than its own charge. */
  isTotal?: boolean;
};

export type MoneyTerms = {
  lines: MoneyLine[];
  /** Where money actually goes. The Lincoln lease pays the owner directly, and
   *  a surface that implied otherwise would be teaching a rent scam. */
  paidTo: string;
  /** "Zelle or ACH, direct to the landlord." */
  method: string;
  /** Nothing is owed until this is true, when something gates payment. */
  gate?: string;
};

/* ------------------------------------------------------------- the letter -- */

/**
 * The plain-words layer that sits above the instrument.
 *
 * This is the whole direction: a stranger receiving an unexpected private link
 * asking for a binding signature has a belief problem before they have a
 * comprehension problem, so a named human says what this is, what it costs and
 * who to call, and only then does the document appear.
 */
export type Letter = {
  /** The person sending it, not the company. A company cannot be called back. */
  fromName: string;
  fromRole: string;
  /** One sentence. What this is and what it commits them to. */
  headline: string;
  /** Two or three short paragraphs at most. Facts, never reassurance. */
  paragraphs: string[];
  /** The six or so things they must understand before signing. */
  summary: { label: string; value: string }[];
  /** What they should do if anything is wrong. Always includes calling. */
  ifWrong: string;
};

/* -------------------------------------------------------------- agreement -- */

export type AgreementKind = "lease" | "management" | "vendor" | "other";

export type Agreement = {
  /** Durable id. Signatures are stored under it. Never rename it. */
  id: string;
  kind: AgreementKind;
  /**
   * The day this version was issued, YYYY-MM-DD. A signature records the
   * version it covers, so re-issuing closes signing until every party has
   * accepted the new one.
   */
  version: string;
  /** IANA zone the signature timestamps are stamped in. Never the browser's. */
  timezone: string;

  brand: Brand;
  /** As the document titles itself. */
  title: string;
  subtitle?: string;

  parties: Party[];
  letter: Letter;
  body: Section[];
  attachments: Attachment[];
  signaturePoints: SignaturePoint[];
  money: MoneyTerms;

  /**
   * The electronic signature act the document invokes. Stated because it is
   * what makes a typed name binding, and it differs by state.
   */
  esignAct: string;

  /** Set when this version revises an earlier executed one. */
  amendment?: {
    /** The day the original was executed. */
    originalExecuted: string;
    /** What changed, materially, in plain words. One line each. */
    changes: string[];
  };
};
