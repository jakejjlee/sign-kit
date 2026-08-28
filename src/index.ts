/**
 * One signing system, many agreements.
 *
 * The document is data. The machinery, the surface, the record and the
 * evidence live here, and a consuming repo supplies only the agreement itself
 * and its own brand tokens.
 */
export * from "./content/types";
export { cents, usd, splitEvenly, total } from "./lib/money";
export type { Cents } from "./lib/money";
export { longDate, dayIn, stampIn, nightsBetween } from "./lib/dates";
export { AgreementSurface, SigningClosed } from "./surfaces/AgreementSurface";
export type { PublicSignature, SurfaceState } from "./surfaces/AgreementSurface";
