import type { Agreement, Block, Section } from "../../content/types";
import type { ClauseInitial } from "../../lib/execution";
import type { SurfaceState } from "../AgreementSurface";
import { longDate } from "../../lib/dates";

import s from "./formal.module.css";

/**
 * The agreement, set as an instrument.
 *
 * sign-kit supplies the model, the gate, the record and the evidence. What it
 * also supplies, and what this replaces, is the letter-and-file reading
 * surface: a named person speaking first in plain words, with the document
 * quieter underneath. That is the right default for a stranger opening an
 * unexpected private link, and it is the wrong register for a rental agreement
 * two people who know each other will hand to an attorney.
 *
 * Server component. Nothing here needs the browser.
 */
export function FormalAgreement({
  agreement: a,
  state,
  pdfHref,
  readerPartyId,
  initialClauses,
  initialSlot,
  filedInitials,
  children,
}: {
  agreement: Agreement;
  state: SurfaceState;
  pdfHref: string;
  /** Which party's link this is. The sheet says so rather than leaving two
      identical copies for two people to mix up. */
  readerPartyId?: string;
  /** Clause numbers that carry an initial box. */
  initialClauses?: string[];
  /** Rendered in the clause gutter. Passed in so this stays a server component. */
  initialSlot?: (clause: string) => React.ReactNode;
  /** Initials already filed, by party id. Kept out of SurfaceState on purpose:
      that shape is deliberately trimmed of everything the browser does not
      need, and widening it in the kit for one consumer is the wrong trade. */
  filedInitials?: Record<string, ClauseInitial[]>;
  /** The signing panel, when the gate is open. Kept out so this stays server. */
  children?: React.ReactNode;
}) {
  const required = a.attachments.filter((x) => x.required);
  const titles = partTitles(a);

  return (
    <main id="main" className={s.page}>
      <article className={s.sheet}>
        <header className={s.docHead}>
          <h1 className={s.title}>{a.title}</h1>
          {a.subtitle ? <p className={s.subtitle}>{a.subtitle}</p> : null}
        </header>

        <p className={s.preamble}>{a.letter.headline}</p>

        {/* The parties, named as the document binds them. A party with no legal
            name reads as unresolved rather than as a blank to write in. */}
        <div className={s.parties}>
          {a.parties.map((p) => {
            const named = p.legalName.trim().length > 0;
            return (
              <div key={p.id}>
                <span className={s.partyRole}>
                  {p.role}
                  {p.id === readerPartyId ? (
                    <span className={s.partyYou}>This copy</span>
                  ) : null}
                </span>
                <div className={`${s.partyName} ${named ? "" : s.partyOpen}`}>
                  {named ? p.legalName : "To be confirmed"}
                </div>
                {p.email ? <div className={s.partyMeta}>{p.email}</div> : null}
              </div>
            );
          })}
        </div>

        {/* Basic Terms, the way a lease prints one: every operative figure on a
            single schedule so nothing has to be hunted for in the clauses. */}
        <section className={s.schedule}>
          <h2 className={s.blockLabel}>Basic terms</h2>
          {a.letter.summary.map((row) => (
            <div className={s.schedRow} key={row.label}>
              <span className={s.schedKey}>{row.label}</span>
              <span className={s.schedVal}>{row.value}</span>
            </div>
          ))}
        </section>

        {/* Twenty-three clauses over twelve printed pages. A reader checking one term
            against their memory of what was agreed should not have to scroll for it, and
            an instrument of this length prints a contents page. */}
        <nav className={s.toc} aria-label="Contents">
          <h2 className={s.blockLabel}>Contents</h2>
          <div className={s.contents}>
            {a.body.map((sec) => (
              <a className={s.tocRow} href={`#clause-${slug(sec.n)}`} key={sec.n}>
                <span className={s.tocNum}>{sec.n}</span>
                <span className={s.tocTitle}>{sec.title}</span>
              </a>
            ))}
          </div>
        </nav>

        {a.body.map((sec, i) => {
          const part = partOf(sec.n);
          const opensPart = part !== "" && partOf(a.body[i - 1]?.n ?? "") !== part;
          const marked = (initialClauses ?? []).includes(sec.n);
          // The group a reader is standing in, so the rail can name it wherever
          // they are rather than only inside the clauses that open a run.
          const group =
            a.body.slice(0, i + 1).reverse().find((x) => x.group)?.group ?? "";
          return (
            <div
              key={sec.n}
              id={`clause-${slug(sec.n)}`}
              data-clause={sec.n}
              data-group={group}
              className={marked ? s.clauseWrapMarked : s.clauseWrap}
            >
              {opensPart ? (
                <div className={s.part}>
                  <p className={s.partLabel}>Exhibit {part}</p>
                  <h2 className={s.partTitle}>{titles[part] ?? sec.title}</h2>
                </div>
              ) : null}
              {sec.group ? <p className={s.groupLabel}>{sec.group}</p> : null}
              {marked && initialSlot ? (
                <div className={s.clauseIni}>{initialSlot(sec.n)}</div>
              ) : null}
              <Clause section={sec} />
            </div>
          );
        })}

        {/* The statutory mass is never hidden and never abridged. sign-kit's
            design record is the law on that and it does not change with the
            register. */}
        {a.attachments.length > 0 ? (
          <section className={s.exhibits}>
            <h2 className={s.blockLabel}>
              Exhibits and disclosures
              {required.length > 0
                ? `, ${required.length} required by law`
                : ""}
            </h2>
            {a.attachments.map((x) => (
              <div className={s.exhibitRow} key={x.id}>
                <div className={s.exhibitTitle}>
                  <span>{x.title}</span>
                  {x.required ? <span className={s.required}>Required</span> : null}
                  {x.authority ? <span className={s.exhibitAuth}>{x.authority}</span> : null}
                </div>
                {x.note ? <p className={s.exhibitNote}>{x.note}</p> : null}
              </div>
            ))}
          </section>
        ) : null}

        <section className={s.execution}>
          <h2 className={s.blockLabel}>
            Execution, in {a.signaturePoints.length} places
          </h2>
          {a.signaturePoints.map((p) => {
            // A signature point whose exhibit is not attached yet cannot be
            // covered by a signature given today. Section 18 says so, and this
            // row has to say the same thing or the two disagree on the page.
            const ids = p.parties ?? a.parties.map((x) => x.id);
            const pending = a.attachments.some(
              (x) => x.id === p.id && /not yet attached/i.test(x.note ?? "")
            );
            const signedBy = ids.filter((id) => state.signatures[id]);
            const roles = ids.map(
              (id) => a.parties.find((x) => x.id === id)?.role ?? id
            );
            const covered = pending
              ? "Not signed here. It is signed separately once it is completed and attached, and this Agreement takes effect on that signature under section 18."
              : state.unavailable
                ? "Covered by the signature below. The record cannot be read right now, so what is already filed is unknown."
                : signedBy.length === 0
                  ? "Covered by the signature below. Neither party has signed it yet."
                  : signedBy.length === ids.length
                    ? "Covered by the signature below. Signed by both parties."
                    : `Covered by the signature below. Signed by the ${
                        a.parties.find((x) => x.id === signedBy[0])?.role.toLowerCase() ?? "one party"
                      }, waiting on the other.`;
            return (
              <div className={s.exhibitRow} key={p.id}>
                <div className={s.exhibitTitle}>
                  <span>{p.title}</span>
                  <span className={s.exhibitAuth}>{roles.join(" and ")}</span>
                </div>
                <p className={s.execCover}>{covered}</p>
              </div>
            );
          })}

          {initialClauses && initialClauses.length > 0 ? (
            <div className={s.iniSchedule}>
              <h3 className={s.blockLabel}>Clauses initialed separately</h3>
              {initialClauses.map((n) => {
                const title = a.body.find((x) => x.n === n)?.title ?? "";
                const marks = a.parties.map((p) => {
                  const m = (filedInitials?.[p.id] ?? []).find((i) => i.clause === n);
                  return `${p.role}: ${m ? m.initials : "not initialed"}`;
                });
                return (
                  <div className={s.exhibitRow} key={n}>
                    <div className={s.exhibitTitle}>
                      <span>
                        Section {n}. {title}
                      </span>
                      <span className={s.exhibitAuth}>{marks.join("  ·  ")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className={s.sigGrid}>
            {a.parties.map((p) => {
              const sig = state.signatures[p.id];
              const named = p.legalName.trim().length > 0;
              return (
                <div key={p.id}>
                  <span className={s.partyRole}>{p.role}</span>
                  <div className={`${s.sigRule} ${named ? "" : s.sigRuleOpen}`}>
                    {sig ? <span className={s.sigScript}>{sig.typed}</span> : null}
                  </div>
                  <div className={`${s.sigName} ${named ? "" : s.sigUnnamed}`}>
                    {named ? p.legalName : "To be confirmed"}
                  </div>
                  <div className={s.sigStamp}>
                    {sig
                      ? `Signed electronically ${sig.signedAtLocal ?? longDate(sig.signedOn)}`
                      : state.unavailable
                        ? "Record unreadable right now"
                        : named
                          ? "Not executed"
                          : "No party named"}
                  </div>
                </div>
              );
            })}
          </div>

          <p className={s.attest}>
            Version of {longDate(a.version)}. Document fingerprint{" "}
            <code>{state.fingerprint.slice(0, 16)}</code>. Executed electronically under{" "}
            {a.esignAct}. A signature records the version it covers; reissuing this document
            closes signing until every party has accepted the new version.
            {initialClauses && initialClauses.length > 0 ? (
              <>
                {" "}
                The clauses listed in the schedule above were initialed separately by each
                party, and each initial records its own moment.
              </>
            ) : null}
          </p>
        </section>

        {state.signingOpen ? (
          children
        ) : (
          // Unexecuted is not a state that needs announcing. The signature blocks above
          // already read "To be confirmed" and "Not executed", which is how a document
          // says it, and the endpoint refuses regardless of what this page renders.
          <div className={s.actions}>
            <a className={s.btn} href={pdfHref}>Download a copy</a>
            <a className={s.btn} href={a.brand.phoneHref}>Call {a.brand.phone}</a>
          </div>
        )}

      </article>

      {/* Repeats on every printed sheet. A signature page separated from the rest of a
          lease has to say which document it belongs to, and the fingerprint makes that
          check exact rather than a matter of matching the title. */}
      <div className={s.runningFoot} aria-hidden="true">
        <span>{`${a.title}, ${a.subtitle}`}</span>
        <span>{state.fingerprint.slice(0, 12)}</span>
      </div>
    </main>
  );
}

/** A clause number as a fragment id. "B.4" is not a valid one on its own. */
export function slug(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Which part of the instrument a clause belongs to, read off the number the document
 * prints. "17" is the Agreement; "B.4" is Exhibit B. Derived rather than configured, so
 * adding an Exhibit C is a numbering decision and nothing else.
 */
function partOf(n: string): string {
  const m = /^([A-Z])\./.exec(n);
  return m ? m[1] : "";
}

/**
 * The title an exhibit prints when its clauses begin.
 *
 * Derived from the agreement's own signature points rather than configured,
 * because a document that is signed in three places already names all three.
 * "Exhibit B: One-Time Mutual Credit and Setoff Acknowledgment" becomes B.
 */
function partTitles(a: Agreement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of a.signaturePoints) {
    const m = /^Exhibit\s+([A-Z])\s*:\s*(.+)$/.exec(p.title.trim());
    if (m) out[m[1]] = m[2].replace(/\s*\(outstanding\)\s*$/i, "").trim();
  }
  return out;
}

function Clause({ section }: { section: Section }) {
  return (
    <section className={s.section}>
      {/* The number sits on the title line, the way an instrument prints it. */}
      <h2 className={s.secTitle}>
        <span className={s.secNum}>{section.n}</span>
        <span>{section.title}</span>
      </h2>
      <div className={s.secBody}>
        {section.blocks.map((b, i) => (
          <Body key={i} block={b} />
        ))}
      </div>
    </section>
  );
}

function Body({ block }: { block: Block }) {
  if (block.k === "p") return <p className={s.clause}>{block.text}</p>;
  if (block.k === "caps") return <p className={s.caps}>{block.text}</p>;
  if (block.k === "list") {
    return (
      <ul className={s.bullets}>
        {/* Keyed by position, not by text. Section 20 has two items that share
            their first forty characters, and slicing the text collided. */}
        {block.items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    );
  }
  return (
    <div className={s.rows}>
      {block.rows.map(([k, v]) => (
        <div className={s.row} key={k}>
          <span>{k}</span>
          <span className={s.rowVal}>{v}</span>
        </div>
      ))}
      {block.total ? (
        <div className={`${s.row} ${s.rowTotal}`}>
          <span>{block.total[0]}</span>
          <span className={s.rowVal}>{block.total[1]}</span>
        </div>
      ) : null}
    </div>
  );
}
