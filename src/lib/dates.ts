/**
 * Dates on a legal document.
 *
 * Two rules, both learned the hard way on the Bluebill lease.
 *
 * 1. A lease date is a calendar day, not an instant. Parsing "2027-01-28" in
 *    local time and formatting it back can move it a day either side of UTC,
 *    which on a term or a due date is a different agreement.
 * 2. The browser never supplies the time a signature was made. A laptop set to
 *    the wrong day would file the wrong execution date, so the stamp is made on
 *    the server in the agreement's own zone.
 */

/** "August 21, 2026" from "2026-08-21", formatted in UTC so the day cannot drift. */
export function longDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`longDate() needs YYYY-MM-DD, got "${iso}".`);
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** The calendar day in the agreement's zone at a given instant, as YYYY-MM-DD. */
export function dayIn(zone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** "August 27, 2026 at 3:30:38 PM EDT", for the audit line on the document. */
export function stampIn(zone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    dateStyle: "long",
    timeStyle: "long",
  }).format(at);
}

/** Nights between two calendar days, which is how a short term is counted. */
export function nightsBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error(`nightsBetween() needs YYYY-MM-DD, got "${startIso}" and "${endIso}".`);
  }
  if (end <= start) throw new Error("The end date must fall after the start date.");
  return Math.round((end - start) / 86_400_000);
}
