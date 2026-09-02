import type { Agreement } from "../../content/types";
import type { RailRow } from "./ReadingRail";

/**
 * What the reading rail keeps beside a reader.
 *
 * Defaults to the first five rows of the agreement's own Basic Terms, so a
 * lease written next week gets a useful rail without anybody configuring one.
 * An agreement that needs different rows names them by label and gets exactly
 * those, in the order it asked for, skipping any label that does not exist
 * rather than rendering a blank.
 *
 * Five, because a rail long enough to need its own scroll is a second document
 * rather than an aid to reading the first one.
 */
export function railRowsFor(a: Agreement, override?: string[]): RailRow[] {
  const rows = override?.length
    ? override
        .map((label) => a.letter.summary.find((r) => r.label === label))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
    : a.letter.summary.slice(0, 5);
  return rows.map((r) => ({ label: r.label, value: r.value })).filter((r) => r.value);
}
