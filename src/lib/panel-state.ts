import type { Agreement } from "../content/types";
import {
  currentSignatures,
  isFullyExecuted,
  outstandingParties,
  signingGate,
  type Execution,
  type GateCode,
} from "./execution";

/**
 * What a link's page shows in place of the agreement's signing step.
 *
 * One decision for every consuming app, so no app can forget a case. The order
 * matters: a party who has already signed must never be handed the form again
 * (its submit can only fail), and a finished agreement is finished for everyone.
 */
export type PanelState =
  | { kind: "complete" }
  | { kind: "signed-waiting"; line: string }
  | { kind: "closed"; reason: string; code: GateCode }
  | { kind: "form" };

/** The agreement's own zone stamp, with the seconds dropped. */
function stamp(local: string): string {
  return local.replace(/(\d{1,2}:\d{2}):\d{2}/, "$1");
}

/** "You signed on November 24, 2026 at 7:52 PM EST. Waiting on Jake Lee." */
export function signedWaitingLine(a: Agreement, ex: Execution, signingAs: string): string {
  const mine = currentSignatures(a, ex)[signingAs];
  const waiting = outstandingParties(a, ex).map((p) => p.legalName);
  const when = mine ? `You signed on ${stamp(mine.signedAtLocal)}.` : "You signed.";
  return waiting.length > 0 ? `${when} Waiting on ${waiting.join(" and ")}.` : when;
}

export function panelStateFor(
  a: Agreement,
  ex: Execution,
  signingAs: string,
  storeReady: boolean
): PanelState {
  if (isFullyExecuted(a, ex)) return { kind: "complete" };
  if (currentSignatures(a, ex)[signingAs]) {
    return { kind: "signed-waiting", line: signedWaitingLine(a, ex, signingAs) };
  }
  const gate = signingGate(a, ex, signingAs, storeReady);
  if (!gate.open) return { kind: "closed", reason: gate.reason, code: gate.code };
  return { kind: "form" };
}
