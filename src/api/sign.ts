import type { Agreement } from "../content/types";
import {
  makeRecord,
  signingGate,
  validateSignature,
  type Execution,
  type SignInput,
} from "../lib/execution";
import { readExecution, storeKind, writeSignature } from "../lib/store";
import { agreementFingerprint } from "../lib/fingerprint";

/**
 * Filing a signature, as a route handler any repo can mount.
 *
 * This is the most consequential thing the kit does, and it is write-once
 * against a store that cannot delete, so it is gated on the same token as the
 * agreement itself. The Bluebill version was not, at first: every other route
 * checked the token and this one did not, which meant anyone on the internet
 * could file a binding signature, and because a filed signature can never be
 * removed, doing so would have locked the real signer out permanently.
 */
export function createSignHandler(opts: {
  agreement: Agreement;
  /** The unguessable path segment the signers were given. */
  token: string;
  /**
   * The one party this link may sign as, when a link belongs to a party.
   *
   * Without it, anyone holding the tenant's link could file a signature as the
   * landlord and open their own gate.
   */
  signingAs?: string;
  /** Called after the write lands. Never allowed to fail the signature. */
  onSigned?: (
    rec: ReturnType<typeof makeRecord>,
    ex: Execution
  ) => Promise<{ signerCopy: boolean } | null>;
  /** Where to tell someone to call when something goes wrong. */
  phone: string;
}) {
  const { agreement, token, signingAs, onSigned, phone } = opts;

  return async function POST(req: Request): Promise<Response> {
    let body: SignInput & { token?: string };
    try {
      body = (await req.json()) as SignInput & { token?: string };
    } catch {
      return json({ error: "Invalid request." }, 400);
    }

    const url = new URL(req.url);
    if ((body.token ?? url.searchParams.get("k")) !== token) {
      // Same shape as an unknown route, so this does not confirm an agreement
      // exists here to anyone who was not given the link.
      return new Response("Not found", { status: 404 });
    }

    // Read the store before anything else. The gate is a fact about what has
    // been filed, never a constant, so it opens the moment a party who signs
    // first has signed, with no deploy in between. A store that cannot be read
    // is treated as closed, which delays a signature rather than binding
    // somebody to a version nobody can prove the other party accepted.
    let ex: Execution;
    try {
      ex = await readExecution(agreement);
    } catch (err) {
      console.error("[sign-kit] could not read the store to check the gate:", err);
      return json(
        {
          error:
            "We could not check this agreement's status just now, so nothing was recorded. " +
            `Please try again in a moment, or call ${phone}.`,
        },
        503
      );
    }

    const gate = signingGate(agreement, ex, signingAs ?? body.party, storeKind() !== "none");
    if (!gate.open) {
      return json({ error: gate.reason, field: "form" }, 409);
    }

    const check = validateSignature(agreement, body, signingAs);
    if (!check.ok) return json({ error: check.message, field: check.field }, 400);

    const record = makeRecord(
      agreement,
      check,
      {
        fingerprint: agreementFingerprint(agreement),
        ip:
          req.headers.get("x-vercel-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null,
        userAgent: req.headers.get("user-agent"),
      },
      new Date()
    );

    const written = await writeSignature(agreement, record);

    if (!written.ok && written.reason === "already-signed") {
      return json(
        { error: "That signature is already on file for this agreement.", alreadySigned: true },
        409
      );
    }

    if (!written.ok) {
      // Fail closed. A signer is never told their signature landed when it did
      // not. The record itself is deliberately NOT logged: it carries a legal
      // name, an IP and a device string, and runtime logs are far more widely
      // readable than the signature store is.
      console.error(`[sign-kit] store unavailable for party=${record.party}: ${written.detail}`);
      return json(
        {
          error:
            "We could not file your signature just now, so it has not been recorded. " +
            `Nothing was lost on your side. Please try again in a moment, or call ${phone}.`,
        },
        503
      );
    }

    // The write succeeded. Reading back is a convenience, so a failure here must
    // never be reported as a failure to sign: it once threw, which surfaced to
    // the signer as "your signature has not been recorded" moments after it had.
    let after: Execution;
    try {
      after = await readExecution(agreement);
    } catch {
      return json({ ok: true, execution: null, staleView: true, delivery: null }, 200);
    }

    // Delivery happens after the signature is filed and can never undo it. A
    // failure here is a delivery problem, never a signing problem, and the
    // download on the page remains the guaranteed route to the document.
    let delivery: { signerCopy: boolean } | null = null;
    if (onSigned) {
      try {
        delivery = await onSigned(record, after);
      } catch (err) {
        console.error("[sign-kit] delivery threw:", err);
        delivery = { signerCopy: false };
      }
    }

    return json(
      {
        ok: true,
        execution: publicView(after),
        delivery: delivery ? { signerCopy: delivery.signerCopy, sentTo: check.email } : null,
      },
      200
    );
  };
}

/** Who has signed, and nothing else. Never the IP, never the device. */
function publicView(ex: Execution) {
  return {
    signatures: Object.fromEntries(
      Object.entries(ex.signatures).map(([party, sig]) => [
        party,
        sig
          ? {
              party: sig.party,
              legalName: sig.legalName,
              typed: sig.typed,
              signedOn: sig.signedOn,
              signedAtLocal: sig.signedAtLocal,
            }
          : undefined,
      ])
    ),
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
