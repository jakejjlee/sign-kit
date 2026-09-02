/**
 * The lease surface.
 *
 * An instrument rather than a letter: every element is a term, a party, a
 * figure, a schedule or a signature, and nothing comments on the document it
 * sits in. Built for the 677 Yorktown Place room agreement, proven on it, and
 * lifted here on 2026-09-01 so the next lease starts from it.
 *
 * `AgreementSurface` in the parent folder is the other register, and it stays:
 * a named person speaking first in plain words, which is right for a stranger
 * opening an unexpected private link and wrong for a document two people will
 * hand to an attorney.
 */
export { FormalAgreement, slug } from "./FormalAgreement";
export { ReadingRail } from "./ReadingRail";
export type { RailRow, RailMark } from "./ReadingRail";
export { InitialBox } from "./InitialBox";
export { SignBlock } from "./SignBlock";
export type { SignBlockParty } from "./SignBlock";
export { InitialsProvider, useInitials, outstandingOf, draftKey } from "./initials";
export type { Stamped } from "./initials";
export { railRowsFor } from "./rail-rows";
export { default as leaseLayout } from "./layout.module.css";
