import type { Agreement, Block, BrandToken, Section } from "../content/types";
import { usd } from "../lib/money";
import { longDate } from "../lib/dates";
import s from "./agreement.module.css";

/**
 * The letter and the file.
 *
 * A stranger opening an unexpected private link and being asked to sign
 * something binding has a belief problem before they have a comprehension
 * problem. So a named person speaks first, in plain words, with a number that
 * can be called, and the instrument appears underneath, quieter and denser and
 * looking like the legal thing it is.
 *
 * Server component. Nothing here needs the browser, and the signature panel is
 * the only interactive piece.
 */

/** Who has signed, and nothing else. Never the IP, never the device. */
export type PublicSignature = {
  party: string;
  legalName: string;
  typed: string;
  signedOn: string;
  signedAtNaples?: string;
  /** The stamp in the agreement's own zone, whatever zone that is. */
  signedAtLocal?: string;
};

export type SurfaceState = {
  signatures: Record<string, PublicSignature | undefined>;
  /** False while a party who signs first has not. The endpoint refuses too. */
  signingOpen: boolean;
  /** Why, in the signer's words, when it is closed. */
  closedReason?: string;
  /**
   * Set when the store could not be read. An empty signature set then means
   * "unknown", and a surface must not render it as "nobody has signed".
   */
  unavailable?: boolean;
  /** Hash of the exact text on screen, so a later edit is provable. */
  fingerprint: string;
};

export function AgreementSurface({
  agreement: a,
  state,
  pdfHref,
  children,
}: {
  agreement: Agreement;
  state: SurfaceState;
  pdfHref: string;
  /** The signing panel. Passed in so this surface stays a server component. */
  children?: React.ReactNode;
}) {
  const signed = (id: string) => state.signatures[id];
  const required = a.attachments.filter((x) => x.required);

  // The document wears the business's own tokens. A Palisade lease and a Sun
  // Mountain lease are the same instrument in different clothes, and a kit that
  // imposed its own palette would make every business look like one product.
  const tokens = a.brand.tokens ?? {};
  const style = Object.fromEntries(
    (Object.keys(tokens) as BrandToken[]).map((k) => [
      `--sign-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`,
      tokens[k] as string,
    ])
  ) as React.CSSProperties;

  return (
    <main id="main" className={s.shell} style={style}>
      {/* ------------------------------------------------------- the letter */}
      <div className={s.letter}>
        <div className={s.wrap}>
          <div className={s.from}>
            <span className={s.mark} aria-hidden="true">{a.brand.initials}</span>
            <div>
              <div className={s.fromName}>
                {a.letter.fromName}, {a.brand.name}
              </div>
              <div className={s.fromRole}>{a.letter.fromRole}</div>
            </div>
          </div>

          <h1 className={s.headline}>{a.letter.headline}</h1>

          {a.letter.paragraphs.map((p) => (
            <p className={s.para} key={p.slice(0, 40)}>{p}</p>
          ))}

          <div className={s.summary}>
            {a.letter.summary.map((row) => (
              <div className={s.sumRow} key={row.label}>
                <span className={s.sumKey}>{row.label}</span>
                <span className={s.sumVal}>{row.value}</span>
              </div>
            ))}
          </div>

          <p className={s.callout}>
            <span>{a.letter.ifWrong}</span>
            <a className={s.callLink} href={a.brand.phoneHref}>{a.brand.phone}</a>
          </p>
        </div>
      </div>

      {/* --------------------------------------------------------- the file */}
      <div className={s.wrap}>
        <div className={s.fileHead}>
          <span className={s.fileTitle}>{a.title}</span>
          <span className={s.fileMeta}>
            {a.attachments.length > 0
              ? `${a.body.length} sections, ${a.attachments.length} attachments`
              : `${a.body.length} sections`}
            {" · version of "}{longDate(a.version)}
          </span>
        </div>

        <article className={s.file}>
          {a.body.map((sec) => (
            <SectionBlock key={sec.n} section={sec} />
          ))}

          {/* What the state adds. Named, never hidden behind a disclosure. */}
          {a.attachments.length > 0 ? (
            <div className={s.attached}>
              <p className={s.attachedNote}>
                {required.length > 0
                  ? `${required.length} of these are disclosures the state requires a landlord to give you. They are here in full and they are part of what you sign. Most people do not read them, and that is fine. We are not going to pretend they are not in the document.`
                  : "These are bound into the agreement and are part of what you sign."}
              </p>
              {a.attachments.map((x) => (
                <div className={s.attachRow} key={x.id}>
                  <span>
                    {x.title}
                    {x.required ? <> {" "}<span className={s.required}>required</span></> : null}
                  </span>
                  {x.authority ? <span className={s.attachAuth}>{x.authority}</span> : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Where the signature actually lands. Told before they start. */}
          {a.signaturePoints.length > 1 ? (
            <div className={s.points}>
              <div className={s.pointsTitle}>You are signing in {a.signaturePoints.length} places</div>
              {a.signaturePoints.map((p) => (
                <div className={s.pointRow} key={p.id}>
                  <span>{p.title}</span>
                  <span className={s.pointState}>one signature</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* --------------------------------------------------- signatures */}
          <div className={s.sigs}>
            <div className={s.sigsTitle}>Signatures</div>
            <div className={s.sigGrid}>
              {a.parties.map((p) => {
                const sig = signed(p.id);
                // A party with no legal name is not awaiting a signature, it is
                // awaiting a person. Showing a blank rule under "Tenant" invites
                // someone to write any name on a lease that binds nobody yet.
                const named = p.legalName.trim().length > 0;
                return (
                  <div key={p.id}>
                    <span className={s.sigRole}>{p.role}</span>
                    <div className={`${s.sigMark} ${named ? "" : s.sigMarkEmpty}`}>
                      {sig ? <span className={s.sigScript} aria-hidden="true">{sig.typed}</span> : null}
                    </div>
                    <div className={`${s.sigName} ${named ? "" : s.sigUnnamed}`}>
                      {named ? p.legalName : "To be named"}
                    </div>
                    <div className={`${s.sigStamp} ${sig || !named ? "" : s.sigPending}`}>
                      {sig
                        ? `Signed electronically ${sig.signedAtLocal ?? longDate(sig.signedOn)}`
                        : state.unavailable
                          ? "Record unreadable right now"
                          : named
                            ? "Awaiting signature"
                            : "No tenant named yet"}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={s.fingerprint}>
              Version {longDate(a.version)}. Fingerprint {state.fingerprint.slice(0, 16)}. Signed
              electronically under {a.esignAct}.
            </p>
          </div>
        </article>

        {children}

        {/* The closed panel carries its own download, so a second one here is
            the same button twice. Only render it when nothing else offers it. */}
        {state.signingOpen ? (
          <div className={s.actions}>
            <a className={`${s.btn} ${s.btnQuiet}`} href={pdfHref}>Download a copy</a>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <section className={s.section}>
      {/* The number sits on the title, the way a lease prints it. A stacked
          uppercase label above every clause is a website habit, not a
          document one, and seven of them down a page read as decoration. */}
      <h2 className={s.secTitle}>
        <span className={s.secNum}>{section.n}</span>
        {section.title}
      </h2>
      {section.blocks.map((b, i) => (
        <BlockBody key={i} block={b} />
      ))}
    </section>
  );
}

function BlockBody({ block }: { block: Block }) {
  if (block.k === "p") return <p className={s.clause}>{block.text}</p>;
  if (block.k === "caps") return <p className={s.caps}>{block.text}</p>;
  if (block.k === "list") {
    return (
      <ul className={s.bullets}>
        {block.items.map((it) => <li key={it.slice(0, 40)}>{it}</li>)}
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

/** Rendered instead of the panel when a party who signs first has not. */
export function SigningClosed({ reason, phone, phoneHref, pdfHref }: {
  reason: string; phone: string; phoneHref: string; pdfHref: string;
}) {
  return (
    <div className={s.closed}>
      <h2 className={s.closedTitle}>Not ready for signature yet</h2>
      <p className={s.closedBody}>{reason}</p>
      <div className={s.actions}>
        <a className={`${s.btn} ${s.btnQuiet}`} href={pdfHref}>Download a copy to review</a>
        <a className={`${s.btn} ${s.btnQuiet}`} href={phoneHref}>Call {phone}</a>
      </div>
    </div>
  );
}

export { usd };
