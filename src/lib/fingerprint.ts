import { createHash } from "node:crypto";

import type { Agreement } from "../content/types";

/**
 * A hash of the exact agreement a signer agreed to.
 *
 * The page and the PDF are rendered at request time from whatever the record
 * says today, so without this nothing in a signature would contradict a later
 * edit. Storing the fingerprint alongside each signature makes a changed figure
 * or a reworded clause provable rather than deniable.
 *
 * It covers the whole record deliberately, including the brand and the letter,
 * because a changed phone number on a page asking for a legal signature is as
 * material as a changed clause.
 */
export function agreementFingerprint(agreement: Agreement): string {
  return createHash("sha256").update(JSON.stringify(agreement), "utf8").digest("hex");
}

/** Short form, for printing on the executed document. */
export function shortFingerprint(full: string): string {
  return full.slice(0, 16);
}
