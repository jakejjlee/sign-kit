"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import s from "./agreement.module.css";

/**
 * Taking the signature.
 *
 * Ported from the Bluebill panel, where every behavior here exists because
 * something went wrong without it. The ones worth naming: a failure renders at
 * the tap rather than off screen, a 409 is treated as success because already
 * signed is what the signer wanted, and a write that succeeded while the
 * read-back failed is never reported as a failure to sign.
 */

export type PanelParty = { id: string; legalName: string; role: string };

export type Props = {
  /** Who may sign on this link. Often one party, because each link is theirs. */
  parties: PanelParty[];
  /**
   * Every party on the agreement, for status.
   *
   * Kept separate from `parties` because a link that may only sign as the
   * landlord still has to know the tenant exists. Without it the panel counted
   * only the party it could sign as, so the landlord signing alone was
   * announced as "signed by everyone named on it" while the tenant had not.
   */
  everyone: PanelParty[];
  /** Who has already signed, keyed by party id. */
  signed: Record<string, boolean>;
  token: string;
  /** Where the POST goes. The consuming repo owns its own route path. */
  endpoint: string;
  pdfHref: string;
  /** What they are confirming receipt of, in the document's own words. */
  attachmentTitles: string[];
  esignAct: string;
  /** Whether this environment can actually deliver mail to a signer. */
  canEmailSigner: boolean;
  brandName: string;
  phone: string;
  phoneHref: string;
};

export function SignPanel({
  parties,
  everyone,
  signed: signedIn,
  token,
  endpoint,
  pdfHref,
  attachmentTitles,
  esignAct,
  canEmailSigner,
  brandName,
  phone,
  phoneHref,
}: Props) {
  const router = useRouter();
  const [signed, setSigned] = useState<Record<string, boolean>>(signedIn);
  const [party, setParty] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [copied, setCopied] = useState(false);
  const [delivery, setDelivery] = useState<{ signerCopy: boolean; sentTo: string } | null>(null);

  const typedRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const acceptRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const firstRadio = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const remaining = parties.filter((p) => !signed[p.id]);
  const selected = parties.find((p) => p.id === party) ?? null;

  // One decision fewer when only one person is left to sign.
  useEffect(() => {
    if (!party && remaining.length === 1) setParty(remaining[0].id);
  }, [party, remaining]);

  useEffect(() => {
    if (justSigned) doneRef.current?.focus();
  }, [justSigned]);

  // Put the failure where the tap happened. It used to render at the top of the
  // form, off screen, so a rejected signature produced no visible change.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  const missing = [
    !selected && "choose who is signing",
    selected && !typed.trim() && "type your full legal name",
    selected && typed.trim() && !email.trim() && "add your email address",
    !accepted && "confirm you have everything attached",
    !consent && "agree to sign electronically",
  ].filter(Boolean) as string[];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt("Copy this link and send it on:", window.location.href);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) { setError("Please choose who is signing."); firstRadio.current?.focus(); return; }
    if (!typed.trim()) { setError("Please type your full legal name to sign."); typedRef.current?.focus(); return; }
    if (!email.trim()) { setError("Please add an email address so we can send you your copy."); emailRef.current?.focus(); return; }
    if (!accepted) { setError("Please confirm you have everything attached to this agreement."); acceptRef.current?.focus(); return; }
    if (!consent) { setError("Please agree to sign this agreement electronically."); consentRef.current?.focus(); return; }

    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          party: selected.id,
          typed,
          email,
          acceptedAttachments: accepted,
          consentedToElectronicSignature: consent,
        }),
      });

      let data: {
        ok?: boolean; error?: string; alreadySigned?: boolean;
        execution?: { signatures: Record<string, unknown> } | null;
        delivery?: { signerCopy: boolean; sentTo: string } | null;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        // A non-JSON body means the request did not complete cleanly, and we
        // cannot tell from here whether it landed. Say exactly that rather than
        // guessing in either direction.
        setError(
          "We lost the connection before we could confirm. Reload this page to see whether " +
            `your signature was recorded, and call ${phone} if it was not.`
        );
        return;
      }

      if (res.status === 409 || data.alreadySigned) {
        // Not an error. It is already done, which is what they wanted.
        setError(null);
        setJustSigned(selected.legalName);
        setNeedsReload(true);
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // The write succeeded even if the read-back did not, so a null execution
      // means "signed, view may be stale", never "not signed".
      if (data.execution) {
        setSigned(
          Object.fromEntries(
            Object.entries(data.execution.signatures).map(([k, v]) => [k, Boolean(v)])
          )
        );
      } else {
        setNeedsReload(true);
      }
      router.refresh();
      setJustSigned(selected.legalName);
      setDelivery(data.delivery ?? null);
      setTyped(""); setEmail(""); setAccepted(false); setConsent(false); setParty(null);
    } catch {
      setError(
        "We could not reach the server, so your signature has not been recorded. " +
          "Please check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------- confirmed -- */

  if (justSigned) {
    const stillOut = everyone.filter((p) => !signed[p.id]);
    return (
      <div className={s.panel} ref={doneRef} tabIndex={-1}>
        <h2 className={s.panelTitle}>
          {stillOut.length === 0 ? "Agreement complete" : "Signature recorded"}
        </h2>
        <p className={s.panelIntro}>
          {stillOut.length === 0
            ? "This agreement has been signed by everyone named on it."
            : `Thank you, ${justSigned}. Your signature is on file. ` +
              `${stillOut.map((p) => p.legalName).join(" and ")} still needs to sign, and can do ` +
              `it from this same page.`}
        </p>

        {delivery?.signerCopy ? (
          <p className={s.panelIntro}>A copy is on its way to {delivery.sentTo}, with the PDF attached.</p>
        ) : delivery && canEmailSigner ? (
          <p className={s.panelIntro}>
            We could not email your copy just now. Your signature is filed either way. Download it
            below, and call {phone} if you would like it sent again.
          </p>
        ) : null}

        <div className={s.actions}>
          <a className={`${s.btn} ${s.btnPrimary}`} href={pdfHref}>Download your copy</a>
          {stillOut.length > 0 && parties.some((p) => !signed[p.id]) ? (
            <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={() => setJustSigned(null)}>
              {stillOut[0].legalName} is here, sign now
            </button>
          ) : null}
          {stillOut.length > 0 ? (
            <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={copyLink}>
              {copied ? "Link copied" : "Copy the link to send"}
            </button>
          ) : null}
        </div>

        {needsReload ? (
          <p className={s.panelIntro} style={{ marginTop: "1rem" }}>
            Reload this page to see the up-to-date signature status.
          </p>
        ) : null}
      </div>
    );
  }

  if (everyone.every((p) => signed[p.id])) {
    return (
      <div className={s.panel}>
        <h2 className={s.panelTitle}>Agreement complete</h2>
        <p className={s.panelIntro}>
          This agreement has been signed by everyone named on it and is locked. No further
          signature is needed.
        </p>
        <div className={s.actions}>
          <a className={`${s.btn} ${s.btnPrimary}`} href={pdfHref}>Download the signed agreement</a>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- form -- */

  return (
    <form className={s.panel} onSubmit={submit} id="sign" noValidate>
      <h2 className={s.panelTitle}>Sign the agreement</h2>
      <p className={s.panelIntro}>
        Each party signs separately, in their own name. Read the document above first. Your
        signature is stamped with the date and time when it is recorded, and the agreement locks
        once everyone named on it has signed.
      </p>
      <p className={s.panelIntro}>
        {canEmailSigner
          ? `When you sign we file your signature, email you a copy with the PDF attached, and tell ${brandName}. It takes a few seconds, so give it a moment after you tap.`
          : `When you sign we file your signature and tell ${brandName}. Download your copy on the next screen, and it stays available here whenever you need it.`}
      </p>

      {parties.length > 1 ? (
        <fieldset className={s.fieldset}>
          <legend className={s.label}>Who is signing?</legend>
          <div className={s.who}>
            {parties.map((p, i) => (
              <label key={p.id} className={`${s.whoOption} ${party === p.id ? s.whoSelected : ""}`}>
                <input
                  type="radio" name="signer" value={p.id}
                  checked={party === p.id} disabled={signed[p.id]}
                  ref={i === 0 ? firstRadio : undefined}
                  onChange={() => { setParty(p.id); setError(null); }}
                />
                <span>{p.legalName}{signed[p.id] ? " (already signed)" : ""}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className={s.field}>
        <label className={s.label} htmlFor="sk-typed">Type your full legal name to sign</label>
        <input
          id="sk-typed" ref={typedRef}
          className={`${s.input} ${error ? s.inputError : ""}`}
          value={typed} onChange={(e) => setTyped(e.target.value)}
          placeholder={selected ? selected.legalName : "Choose who is signing first"}
          autoComplete="name" autoCapitalize="words" spellCheck={false}
          required aria-required="true" aria-invalid={error ? true : undefined}
          aria-describedby={`sk-typed-hint${error ? " sk-error" : ""}`}
        />
        <span className={s.hint} id="sk-typed-hint">
          {selected
            ? `Type it exactly as it appears on the agreement: ${selected.legalName}.`
            : "Choose a name above, then type it here."}
        </span>
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="sk-email">Your email address</label>
        <input
          id="sk-email" ref={emailRef} type="email" inputMode="email"
          className={s.inputPlain}
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" spellCheck={false}
          required aria-required="true" aria-describedby="sk-email-hint"
        />
        <span className={s.hint} id="sk-email-hint">
          {canEmailSigner
            ? "We send your signed copy here, with the PDF attached. Each signer gets their own."
            : "Recorded with your signature so we can reach you about this agreement."}
        </span>
      </div>

      <label className={s.check}>
        <input type="checkbox" ref={acceptRef} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          I have received and read everything attached to this agreement:{" "}
          {attachmentTitles.join(", ")}.
        </span>
      </label>

      <label className={s.check}>
        <input type="checkbox" ref={consentRef} checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I agree to sign this agreement electronically, and I understand my typed name is my
          signature and is legally binding under {esignAct}.
        </span>
      </label>

      {error ? <p className={s.error} role="alert" id="sk-error" ref={errorRef}>{error}</p> : null}

      <div className={s.actions}>
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} aria-busy={busy} aria-describedby="sk-outstanding">
          {busy ? "Filing your signature" : "Sign the agreement"}
        </button>
        <a className={`${s.btn} ${s.btnQuiet}`} href={pdfHref}>Download a copy</a>
      </div>

      <p className={missing.length ? s.outstanding : s.ready} id="sk-outstanding" aria-live="polite">
        {missing.length ? `Still needed: ${missing.join(", ")}.` : "Ready to sign."}
      </p>
    </form>
  );
}
