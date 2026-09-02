"use client";

import { useEffect, useState } from "react";

import { useInitials } from "./initials";
import s from "./formal.module.css";

export type RailRow = { label: string; value: string };
export type RailMark = {
  n: string;
  title: string;
  /** The anchor, already slugged. Clause ids are slugged ("B.4" becomes
      "clause-b-4"), so a rail that builds its own href from the raw number
      links to nothing. */
  href: string;
};

/**
 * What a person needs while reading a clause: what they agreed, where they are,
 * and what to do next.
 *
 * Screen only. It does not print, because the printed lease is the same
 * document it has always been and a sidebar down every sheet is not how an
 * instrument reads on paper.
 *
 * On a narrow viewport it folds. Folded it still names what it holds, and the
 * document gets the height back, because persistent chrome somebody cannot
 * dismiss is the thing that has bitten before.
 */
export function ReadingRail({
  rows,
  marks,
  signed,
  pdfHref,
  gateOpen,
}: {
  rows: RailRow[];
  /** The clauses that carry an initial. Doubles as the checklist. */
  marks: RailMark[];
  signed: boolean;
  pdfHref: string;
  /** When the gate is shut there is nothing to go to, so the rail offers the
      download and no progress, exactly as the page behaves today. */
  gateOpen: boolean;
}) {
  const { stamped, outstanding, required, drafting, filed } = useInitials();
  const [here, setHere] = useState<{ n: string; group: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem("rail:open") === "1");
    } catch {
      /* storage refused; the fold simply starts closed */
    }
  }, []);

  // Position is tracked across EVERY clause, not only the marked ones, so
  // "where you are" answers the question wherever the reader actually is.
  useEffect(() => {
    const ratios = new Map<string, { r: number; group: string }>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = e.target.getAttribute("data-clause");
          if (!n) continue;
          ratios.set(n, {
            r: e.isIntersecting ? e.intersectionRatio : 0,
            group: e.target.getAttribute("data-group") ?? "",
          });
        }
        let best: string | null = null;
        let group = "";
        let top = 0;
        for (const [n, v] of ratios) {
          if (v.r > top) {
            top = v.r;
            best = n;
            group = v.group;
          }
        }
        if (best) setHere({ n: best, group });
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    for (const el of document.querySelectorAll("[data-clause]")) obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function toggle() {
    setOpen((v) => {
      try {
        window.localStorage.setItem("rail:open", v ? "0" : "1");
      } catch {
        /* fine, the fold just will not be remembered */
      }
      return !v;
    });
  }

  // Sending somebody to a disabled button is how they give up. Send them to the
  // first clause they still have to initial instead.
  const label = signed
    ? "Download the executed copy"
    : !gateOpen
      ? "Download a copy"
      : outstanding.length > 0
        ? `Go to signature, ${outstanding.length} left`
        : "Go to signature";
  const href =
    signed || !gateOpen
      ? pdfHref
      : outstanding.length > 0
        ? (marks.find((m) => m.n === outstanding[0])?.href ?? "#h-sign")
        : "#h-sign";

  const doneCount = required.length - outstanding.length;
  const folded = [
    rows[0]?.value,
    rows[1]?.value,
    required.length > 0 && !filed ? `${doneCount} of ${required.length} initialed` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside className={s.rail} aria-label="Key terms and progress">
      <button
        type="button"
        className={s.railToggle}
        onClick={toggle}
        aria-expanded={open}
        aria-controls="rail-body"
      >
        <span className={s.railToggleLabel}>Key terms</span>
        <span className={s.railToggleState}>
          {folded} {open ? "▴" : "▾"}
        </span>
      </button>

      <div className={`${s.railBody} ${open ? s.railBodyOpen : ""}`} id="rail-body">
        <span className={s.railLabel}>Key terms</span>
        {rows.map((r) => (
          <div className={s.railRow} key={r.label}>
            <span className={s.railKey}>{r.label}</span>
            <span className={s.railVal}>{r.value}</span>
          </div>
        ))}

        {here ? (
          <div className={s.railHereBlock}>
            <span className={s.railLabel}>Where you are</span>
            <span className={s.railKey}>Section {here.n}</span>
            <span className={s.railVal}>{here.group}</span>
          </div>
        ) : null}

        {marks.length > 0 ? (
          <div className={s.railNav}>
            <span className={s.railLabel}>
              {filed ? "Clauses initialed" : "Clauses to initial"}
            </span>
            {marks.map((m) => (
              <a
                className={`${s.railNavRow} ${here?.n === m.n ? s.railHere : ""}`}
                href={m.href}
                key={m.n}
              >
                <b>{m.n}</b>
                <span>{m.title}</span>
                {stamped[m.n] ? (
                  <span className={s.railTick} aria-label="initialed">
                    &#10003;
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <a className={s.railGo} href={href}>
        {label}
      </a>

      {required.length > 0 && !signed && gateOpen ? (
        <p className={s.railProgress}>
          {doneCount} of {required.length} clauses initialed
        </p>
      ) : null}

      {!drafting && gateOpen && !signed ? (
        <p className={s.railProgress}>
          This browser will not remember your initials. Finish in one sitting, or they are lost
          on reload.
        </p>
      ) : null}
    </aside>
  );
}
