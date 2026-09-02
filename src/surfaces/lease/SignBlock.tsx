"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useInitials } from "./initials";
import s from "./formal.module.css";

/**
 * Signature, as the last clause of the instrument.
 *
 * sign-kit ships a signing panel and this replaces it here, deliberately. The
 * kit's panel is a good form and it is a form: it opens in a host voice, it
 * repeats the exhibits list as prose inside a checkbox when that list is set as
 * a schedule three inches above, it restates the electronic-signature act the
 * execution stamp already carries, and it speaks in a third label convention
 * nothing else on the sheet uses. On a document whose rule is that every element
 * is a term, a party, a figure, a schedule or a signature, that is four kinds of
 * copy that do not belong.
 *
 * Worse, it printed. The kit's stylesheet carries no print rules, so the paper
 * copy of a signed lease ended with a live form under the real execution block:
 * an empty name box, an email box, two unticked checkboxes and two buttons. A
 * sheet presenting two competing signature apparatus is not a clerical problem.
 *
 * EVERY behavior below was earned by a defect and is carried across unchanged.
 * Read the comments before simplifying any of them.
 *
 * Lifted into sign-kit on 2026-09-01 with the rest of the lease surface. It was
 * written in a consuming repo, against SignPanel, and it won: the panel it
 * replaced is still exported for the letter surface, which is a different
 * register and a different reader.
 */

export type SignBlockParty = { id: string; legalName: string; role: string };

export function SignBlock({
  party,
  counterparty,
  token,
  endpoint,
  pdfHref,
  phone,
  alreadySigned,
  pendingPoint,
  covers,
}: {
  /** The one party this link may sign as. Each link belongs to a person. */
  party: SignBlockParty;
  /** The other party, named so this copy can say what it is not. */
  counterparty: SignBlockParty;
  /** The exhibit that is not covered by a signature given today, if any. */
  pendingPoint?: string;
  /** What one signature here does cover, named rather than pointed at. */
  covers?: string[];
  token: string;
  endpoint: string;
  pdfHref: string;
  phone: string;
  alreadySigned: boolean;
}) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [email, setEmail] = useState("");
  const [received, setReceived] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [stale, setStale] = useState(false);
  // "Email it to me", which sends only to this party's own address. The
  // destination is never in the request, so a link cannot mail a lease onward.
  const {
    typed: initialsTyped,
    setTyped: setInitialsTyped,
    stamped,
    outstanding,
  } = useInitials();
  const [mailing, setMailing] = useState(false);
  const [mailed, setMailed] = useState<string | null>(null);
  const [mailErr, setMailErr] = useState<string | null>(null);

  async function emailCopy() {
    setMailing(true); setMailErr(null); setMailed(null);
    try {
      const res = await fetch("/api/agreement/email-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; to?: string; error?: string };
      if (res.ok && d.ok && d.to) setMailed(d.to);
      else setMailErr(d.error ?? "That did not send. The download here still works.");
    } catch {
      setMailErr("The server could not be reached, so nothing was sent. The download here still works.");
    } finally {
      setMailing(false);
    }
  }

  const typedRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const receivedRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (done) doneRef.current?.focus(); }, [done]);

  // Put the failure where the tap happened. It used to render at the top of the
  // form, off screen, so a rejected signature produced no visible change.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  const missing = [
    !typed.trim() && "your full legal name",
    typed.trim() && !email.trim() && "an email address",
    !initialsTyped.trim() && "your initials",
    outstanding.length > 0 &&
      `initials on section${outstanding.length > 1 ? "s" : ""} ${outstanding.join(", ")}`,
    !received && "confirmation you have the exhibits",
    !consent && "consent to sign electronically",
  ].filter(Boolean) as string[];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!typed.trim()) { setError("Type your full legal name to sign."); typedRef.current?.focus(); return; }
    if (!email.trim()) { setError("Add an email address so your copy can reach you."); emailRef.current?.focus(); return; }
    if (!initialsTyped.trim()) {
      setError("Type your initials, then initial each marked clause.");
      return;
    }
    if (outstanding.length > 0) {
      setError(
        `Initial section${outstanding.length > 1 ? "s" : ""} ${outstanding.join(", ")} before ` +
          "signing. Each marked clause has a box beside it."
      );
      // Take them to the first one rather than leaving them to hunt for it.
      document
        .getElementById(`clause-${outstanding[0].toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (!received) { setError("Confirm you have the exhibits and disclosures scheduled above."); receivedRef.current?.focus(); return; }
    if (!consent) { setError("Agree to sign this agreement electronically."); consentRef.current?.focus(); return; }

    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          party: party.id,
          typed,
          email,
          acceptedAttachments: received,
          consentedToElectronicSignature: consent,
          initials: Object.values(stamped),
        }),
      });

      let data: {
        ok?: boolean; error?: string; alreadySigned?: boolean;
        execution?: { signatures: Record<string, unknown> } | null;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        // A non-JSON body means the request did not complete cleanly, and there
        // is no way to tell from here whether it landed. Say exactly that,
        // rather than guessing in either direction.
        setError(
          "The connection dropped before this could be confirmed. Reload to see whether the " +
            `signature was recorded, and call ${phone} if it was not.`
        );
        return;
      }

      // Not an error. Already signed is what they wanted.
      if (res.status === 409 || data.alreadySigned) {
        setError(null); setDone(true); setStale(true); return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That did not go through. Try again.");
        return;
      }
      // The write succeeded even where the read-back did not, so a null
      // execution means "signed, this view may be stale", never "not signed".
      if (!data.execution) setStale(true);
      router.refresh();
      setDone(true);
      setTyped(""); setEmail(""); setReceived(false); setConsent(false);
    } catch {
      setError(
        "The server could not be reached, so nothing was recorded. Check the connection and " +
          "try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (alreadySigned || done) {
    return (
      <section className={s.signBlock} aria-labelledby="h-sign">
        <h2 className={s.blockLabel} id="h-sign">Signature, {party.role.toLowerCase()}</h2>
        <div className={s.signDone} tabIndex={-1} ref={doneRef}>
          <p className={s.clause}>
            Signed by {party.legalName} as the {party.role.toLowerCase()}. The date and time are
            recorded on the server, with the version this signature covers.
            {pendingPoint ? ` It does not cover ${pendingPoint}, which is signed separately.` : ""}
            {stale ? " Reload this page to see the executed copy." : ""}
          </p>
          <p className={s.signWho}>
            {counterparty.legalName} signs as the {counterparty.role.toLowerCase()} on a
            separate link. This one signs for {party.legalName} and for nobody else.
          </p>
          <div className={s.signActions}>
            <a className={s.signPdf} href={pdfHref}>Download the executed copy</a>
            <button className={s.signMail} type="button" onClick={emailCopy} disabled={mailing}>
              {mailing ? "Sending" : "Email it to me"}
            </button>
          </div>
          {mailed ? (
            <p className={s.signHint} role="status">Sent to {mailed}. Check junk if it is not there in a minute.</p>
          ) : null}
          {mailErr ? <p className={s.signError} role="alert">{mailErr}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className={s.signBlock} aria-labelledby="h-sign">
      <h2 className={s.blockLabel} id="h-sign">Signature, {party.role.toLowerCase()}</h2>
      <p className={s.signWho}>
        This copy signs as the {party.role.toLowerCase()}, {party.legalName}.{" "}
        {counterparty.legalName} has a separate link and signs as the{" "}
        {counterparty.role.toLowerCase()}. Neither link can sign for the other, and either party
        may sign first.
      </p>
      <p className={s.signWho}>
        {covers && covers.length > 0
          ? `One signature here covers ${covers.length === 1 ? covers[0] : covers.slice(0, -1).join(", ") + " and " + covers[covers.length - 1]}.`
          : "One signature here covers every place in the schedule above marked as covered by it."}
        {pendingPoint ? ` It does not cover ${pendingPoint}, which is signed separately once it is completed and attached.` : ""}
      </p>
      <form onSubmit={submit} noValidate>
        <div className={s.signFields}>
          <label className={s.signField}>
            <span className={s.signLabel}>Full legal name</span>
            <input
              ref={typedRef} className={s.signInput} value={typed} autoComplete="name"
              onChange={(e) => setTyped(e.target.value)}
              placeholder={party.legalName} aria-describedby="sign-name-hint"
            />
            <span className={s.signHint} id="sign-name-hint">
              Typed exactly as it appears above: {party.legalName}
            </span>
          </label>
          <label className={s.signField}>
            <span className={s.signLabel}>Your initials</span>
            <input
              className={s.signInput}
              value={initialsTyped}
              onChange={(e) => setInitialsTyped(e.target.value.toUpperCase().slice(0, 4))}
              placeholder={party.legalName.split(" ").map((w) => w[0]).join("")}
              aria-describedby="sign-ini-hint"
            />
            <span className={s.signHint} id="sign-ini-hint">
              {outstanding.length === 0
                ? "Every marked clause is initialed."
                : `Then initial each marked clause. ${outstanding.length} still to do.`}
            </span>
          </label>
          <label className={s.signField}>
            <span className={s.signLabel}>Email</span>
            <input
              ref={emailRef} className={s.signInput} value={email} type="email" autoComplete="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
            />
          </label>
        </div>

        <label className={s.signAck}>
          <input ref={receivedRef} type="checkbox" checked={received}
            onChange={(e) => setReceived(e.target.checked)} />
          <span>I have the exhibits and disclosures scheduled above.</span>
        </label>
        <label className={s.signAck}>
          <input ref={consentRef} type="checkbox" checked={consent}
            onChange={(e) => setConsent(e.target.checked)} />
          <span>My typed name is my signature and binds me to this Agreement.</span>
        </label>

        {error ? <p className={s.signError} role="alert" ref={errorRef}>{error}</p> : null}

        <div className={s.signActions}>
          <button className={s.signGo} type="submit" disabled={busy}>
            {busy ? "Recording" : "Sign"}
          </button>
          <a className={s.signPdf} href={pdfHref}>Download a copy</a>
        </div>
        {missing.length > 0 ? (
          <p className={s.signHint}>Still needed: {missing.join(", ")}.</p>
        ) : null}
      </form>
    </section>
  );
}
