import type { Agreement } from "../content/types";
import { currentSignatures, isFullyExecuted, signingGate } from "../lib/execution";
import { probeStore, readExecution, storeKind } from "../lib/store";
import { deliveryConfig } from "../lib/notify";

/**
 * Is this agreement actually ready to be signed?
 *
 * Answers the question a rendered page cannot: whether a signature written
 * right now would be stored. A page that renders is not evidence that signing
 * works, and the first time anyone finds out otherwise must not be the moment
 * a signer taps sign.
 *
 * It sits behind an operator key when one is configured, because the probe
 * writes to the store and leaving it on a signer-facing token indefinitely
 * hands anyone with the link a way to burn the store's quota.
 */
export function createHealthHandler(opts: {
  agreement: Agreement;
  /** @deprecated Ignored. A signing token is never an ops key; set AGREEMENT_OPS_KEY. */
  fallbackKey?: string;
  /** Every signing token this app mints. The ops key may never be one of them. */
  signingTokens?: string[];
}) {
  const { agreement, signingTokens = [] } = opts;

  return async function GET(req: Request): Promise<Response> {
    // The ops key is its own secret. It used to fall back to a signing link's
    // token, which put a signer's private token in query strings and request
    // logs and let it write probe files to the shared drive. No key, no endpoint.
    const expected = process.env.AGREEMENT_OPS_KEY;
    if (!expected || signingTokens.includes(expected)) {
      return new Response("Not found", { status: 404 });
    }
    if (new URL(req.url).searchParams.get("k") !== expected) {
      return new Response("Not found", { status: 404 });
    }

    const probe = await probeStore(agreement);

    // Reporting unavailability must not itself fail when the store is down.
    let ex: Awaited<ReturnType<typeof readExecution>> = { signatures: {} };
    let readOk = true;
    try {
      ex = await readExecution(agreement);
    } catch {
      readOk = false;
    }

    const gate = readOk
      ? signingGate(agreement, ex, undefined, storeKind() !== "none")
      : { open: false as const, reason: "The store could not be read." };
    const current = currentSignatures(agreement, ex);
    const delivery = deliveryConfig(agreement.brand.email);
    const canBeSigned = probe.ok && readOk && gate.open && delivery.canReachSigners;

    return new Response(
      JSON.stringify(
        {
          // The store being writable is not enough. This is what gets checked
          // before a link is sent, so it must not report a green light the
          // endpoint will refuse.
          canBeSigned,
          // Mail is part of "ready": a link sent while mail cannot reach the
          // signers means nobody gets their copy and nobody is told.
          canReachSigners: delivery.canReachSigners,
          gate: gate.open ? "open" : gate.reason,
          canBeRead: readOk,
          store: storeKind(),
          delivery,
          detail: probe.detail,
          version: agreement.version,
          parties: agreement.parties.map((p) => ({
            party: p.id,
            name: p.legalName || "not named yet",
            signsFirst: Boolean(p.signsFirst),
            signed: Boolean(current[p.id]),
          })),
          fullyExecuted: isFullyExecuted(agreement, ex),
        },
        null,
        2
      ),
      {
        status: probe.ok && readOk && delivery.canReachSigners ? 200 : 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  };
}
