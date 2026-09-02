"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ClauseInitial } from "../../lib/execution";

/**
 * Initials, held in the page and written once.
 *
 * The store is write-once per party and the service account cannot delete, so
 * six separate initial writes is not something this can do. They accumulate
 * here, draft to this browser so a closed tab does not cost somebody six taps,
 * and reach the server exactly once, inside the signature.
 *
 * The draft key carries the VERSION on purpose. A signature records the text it
 * covers, so initials given against an older version must not silently survive
 * a reissue: a new version means a new key, which means no restore.
 *
 * Once a signature is filed the server record is the truth and the draft is
 * not. `filed` takes over completely at that point, so a stamped box on an
 * executed copy shows what was actually written rather than what a browser
 * happens to remember.
 */

export type Stamped = Record<string, ClauseInitial>;

/** Pure, so it can be tested without a browser. */
export function outstandingOf(required: string[], stamped: Stamped): string[] {
  return required.filter((n) => !stamped[n]);
}

export function draftKey(agreementId: string, party: string, version: string): string {
  return `initials:${agreementId}:${party}:${version}`;
}

type Ctx = {
  typed: string;
  setTyped: (s: string) => void;
  stamped: Stamped;
  stamp: (clause: string) => void;
  outstanding: string[];
  required: string[];
  /** False when this browser refuses storage, so the rail can say so rather
      than letting somebody discover it by losing six taps. */
  drafting: boolean;
  /** True once a signature is filed. The boxes are then a record, not a form. */
  filed: boolean;
};

const InitialsCtx = createContext<Ctx | null>(null);

export function InitialsProvider({
  required,
  agreementId,
  party,
  version,
  filed,
  children,
}: {
  required: string[];
  agreementId: string;
  party: string;
  version: string;
  /** What the server record already holds for this party. */
  filed?: ClauseInitial[];
  children: React.ReactNode;
}) {
  const [typed, setTyped] = useState("");
  const [stamped, setStamped] = useState<Stamped>({});
  const [drafting, setDrafting] = useState(true);
  // Nothing is written until the restore has run. Without this the save effect
  // fires on mount with empty state and clobbers a good draft before the
  // restore lands, and React's double-invoked effects then read the cleared
  // value back. Six taps disappeared on every reload.
  const [restored, setRestored] = useState(false);
  const key = draftKey(agreementId, party, version);
  const isFiled = Boolean(filed && filed.length > 0);
  const effective: Stamped = isFiled
    ? Object.fromEntries((filed ?? []).map((i) => [i.clause, i]))
    : stamped;

  // Every read is wrapped. A private window throws on access rather than
  // returning null, and this surface has to work with no draft at all.
  useEffect(() => {
    if (isFiled) {
      setRestored(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const d = JSON.parse(raw) as { typed?: string; stamped?: Stamped };
        if (d.typed) setTyped(d.typed);
        if (d.stamped) setStamped(d.stamped);
      }
    } catch {
      setDrafting(false);
    }
    setRestored(true);
  }, [key, isFiled]);

  useEffect(() => {
    if (isFiled || !restored) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({ typed, stamped }));
    } catch {
      setDrafting(false);
    }
  }, [key, typed, stamped, isFiled, restored]);

  // Clearing the typed initials does not un-stamp anything. Those were given
  // deliberately, and re-typing is not a condition of keeping them.
  const stamp = useCallback(
    (clause: string) => {
      setStamped((prev) => {
        if (prev[clause]) return prev;
        const t = typed.trim();
        if (!t) return prev;
        return { ...prev, [clause]: { clause, initials: t, at: new Date().toISOString() } };
      });
    },
    [typed]
  );

  return (
    <InitialsCtx.Provider
      value={{
        typed,
        setTyped,
        stamped: effective,
        stamp,
        outstanding: outstandingOf(required, effective),
        required,
        drafting,
        filed: isFiled,
      }}
    >
      {children}
    </InitialsCtx.Provider>
  );
}

export function useInitials(): Ctx {
  const c = useContext(InitialsCtx);
  if (!c) throw new Error("useInitials used outside InitialsProvider");
  return c;
}
