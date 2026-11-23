import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { isFullyExecuted, type SignatureRecord } from "../src/lib/execution";
import { shortFingerprint } from "../src/lib/fingerprint";
import { buildOperatorEmail } from "../src/lib/notify";
import { pdfFilename } from "../src/lib/pdf";
import { buildSignerEmail, signerFaces, signerPalette } from "../src/lib/signer-email";
import { type BuiltEmail, lintSignerEmail, renderReceiptEmail } from "../src/lib/signer-email-core";
import { PROOF_BRANDS, type ProofBrand, SAMPLE_INQUIRY, signingFor } from "./certificate-fixtures";

vi.mock("resend", () => ({ Resend: class {} }));

/**
 * The Certificate, round 3 (Jake, 2026-11-23): the four jobs every signing and form flow sends,
 * rendered for each of the five businesses from the kit's real builders, then checked:
 *   1) the signer, waiting on another signer
 *   2) fully signed, the PDF attached
 *   3) the alert to the business inbox
 *   4) a form receipt
 * Every fact the email states must appear in BOTH the html a reader sees and the plain-text twin.
 * With RENDER_PROOFS=<folder> each email is also written out for the proof board
 * (docs/design/email/final-r3, `node docs/design/email/final-r3/build.mjs`).
 */
const OUT = process.env.RENDER_PROOFS;

type Job = { id: string; label: string; email: BuiltEmail; facts: string[] };

/** What a reader sees: tags gone, entities decoded, the zero-width joiners we add removed. */
export function visibleText(html: string): string {
  return html
    .replace(/<head>[\s\S]*?<\/head>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<div style="display:none[^"]*"[^>]*>[\s\S]*?<\/div>/, "")
    .replace(/<wbr>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&zwnj;/g, "")
    .replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
}

const hm = (at: string) => {
  const m = /(\d{1,2}:\d{2})(?::\d{2})? (AM|PM) ([A-Z]{2,5})/.exec(at);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : "";
};
const day = (at: string) => /^[A-Z][a-z]+ \d{1,2}, \d{4}/.exec(at)?.[0] ?? "";

function jobsFor(pb: ProofBrand): Job[] {
  const s = signingFor(pb);
  const { a } = s;
  const pdf = pdfFilename(a, s.complete.ex);
  const signerFacts = (rec: SignatureRecord, signed: SignatureRecord[]) => [
    a.title,
    a.subtitle ?? "",
    `${rec.legalName} signed at ${hm(rec.signedAtLocal)}.`,
    day(rec.signedAtLocal),
    ...a.parties.map((p) => p.legalName),
    ...a.parties.map((p) => p.role),
    ...signed.map((r) => hm(r.signedAtLocal)),
    ...a.letter.summary.flatMap((r) => [r.label, r.value]),
    shortFingerprint(rec.fingerprint ?? ""),
    s.url,
  ];

  const waitingSigned = Object.values(s.waiting.ex.signatures) as SignatureRecord[];
  const left = a.parties.filter((p) => !s.waiting.ex.signatures[p.id]).map((p) => p.legalName);
  const waiting = buildSignerEmail(a, s.waiting.rec, s.waiting.ex, { copyUrl: s.url, attached: true, attachmentName: pdfFilename(a, s.waiting.ex) });
  const complete = buildSignerEmail(a, s.complete.rec, s.complete.ex, { copyUrl: s.url, attached: true, attachmentName: pdf });
  const operator = buildOperatorEmail(a, s.complete.rec, s.complete.ex, { attached: true, attachmentName: pdf, copyUrl: s.url });
  const q = SAMPLE_INQUIRY;
  const receipt = renderReceiptEmail({
    palette: signerPalette(a),
    faces: signerFaces(a),
    brandName: pb.brand.name,
    logo: pb.brand.logo,
    fontsHref: pb.brand.fontsHref,
    subject: `${pb.brand.name} | Inquiry | Received from ${q.name}, ${day(q.receivedWhen)}`,
    headline: `${q.name}, your inquiry arrived at ${hm(q.receivedWhen)}.`,
    receivedWhen: q.receivedWhen,
    about: pb.key === "ohh" ? "11 Bluebill Avenue, Unit 201, Naples, Florida" : undefined,
    lead:
      pb.key === "ohh"
        ? ["We reply to this address by email with the monthly rate.", "This inquiry books nothing and charges nothing."]
        : ["We reply to this address by email.", "Sending it commits you to nothing."],
    sheetTitle: "Your answers",
    caption: "Check them; reply to this email to correct anything.",
    received: q.received,
    reference: { label: "Reference", value: q.reference },
    replyLine: `Reply to this email and it reaches ${pb.brand.name}.`,
    legalLine: pb.legal,
  });

  return [
    {
      id: "waiting",
      label: "Signer, waiting on another signer",
      email: waiting,
      facts: [...signerFacts(s.waiting.rec, waitingSigned), `Waiting on ${left.join(" and ")}`, "signed yet"],
    },
    {
      id: "complete",
      label: "Fully signed, PDF attached",
      email: complete,
      facts: [...signerFacts(s.complete.rec, s.recs), "Completed", pdf, `${s.recs.length} of ${s.recs.length} signed`],
    },
    {
      id: "operator",
      label: "Alert to the business inbox",
      email: operator,
      facts: [
        ...signerFacts(s.complete.rec, s.recs).filter((f) => !a.letter.summary.some((r) => r.label === f || r.value === f)),
        "Completed. Nothing waits on you.",
        pdf,
        s.complete.rec.email ?? "not given",
        "Signature record",
      ],
    },
    {
      id: "receipt",
      label: "Form receipt",
      email: receipt,
      facts: [q.name, hm(q.receivedWhen), day(q.receivedWhen), q.reference, ...q.received.flatMap((r) => [r.label, r.value])],
    },
  ];
}

describe("The Certificate: four jobs, five businesses", () => {
  for (const pb of PROOF_BRANDS) {
    describe(pb.label, () => {
      const jobs = jobsFor(pb);
      for (const j of jobs) {
        it(`${j.label}: passes the cheap checks and states every fact in the html and the plain text`, () => {
          expect(lintSignerEmail(j.email)).toEqual([]);
          const seen = visibleText(j.email.html);
          // A link is a fact the reader reaches through the button, so it is looked for in the markup.
          const missingHtml = j.facts.filter((f) => f && !(f.startsWith("https://") ? j.email.html.includes(f) : seen.includes(f)));
          const missingText = j.facts.filter((f) => f && !j.email.text.includes(f));
          expect(missingHtml).toEqual([]);
          expect(missingText).toEqual([]);
          if (OUT) {
            mkdirSync(OUT, { recursive: true });
            writeFileSync(join(OUT, `${pb.key}-${j.id}.html`), j.email.html);
            writeFileSync(join(OUT, `${pb.key}-${j.id}.txt`), `Subject: ${j.email.subject}\n\n${j.email.text}\n`);
            writeFileSync(
              join(OUT, `${pb.key}-${j.id}.facts.json`),
              JSON.stringify({ brand: pb.label, job: j.label, subject: j.email.subject, facts: j.facts.filter(Boolean), missingHtml, missingText }, null, 2)
            );
          }
        });
      }
    });
  }
});

describe("The Certificate: what each job says", () => {
  const ohh = PROOF_BRANDS.find((b) => b.key === "ohh") as ProofBrand;
  const [waiting, complete, operator, receipt] = jobsFor(ohh).map((j) => j.email) as [BuiltEmail, BuiltEmail, BuiltEmail, BuiltEmail];

  it("1) the waiting signer: subject is place | document | what happened, heading has the name and time", () => {
    expect(waiting.subject).toBe("11 Bluebill Avenue, Unit 201, Naples, Florida 34108 | Residential Lease | Signed by Michael Donovan, November 23, 2026");
    expect(waiting.text.split("\n")[0]).toBe("Waiting on Victoria Donovan");
    expect(waiting.text).toContain("Michael Donovan signed at 2:00 PM EST.");
    expect(waiting.text).toContain("Jamarber (Arber) Dobrushi, Landlord (owner of record): signed November 23, 2026 at 9:33 AM EST");
    expect(waiting.text).toContain("Victoria Donovan, Tenant: has not signed yet");
    expect(waiting.text).toContain("Signers, 2 of 3 signed");
    expect(waiting.text).toContain("Residential-Lease-partly-signed.pdf: As signed so far, attached");
  });

  it("2) fully signed: Completed, the PDF as a file row, every signer with a time, the document ID", () => {
    expect(complete.subject).toBe("11 Bluebill Avenue, Unit 201, Naples, Florida 34108 | Residential Lease | Fully signed, November 23, 2026");
    expect(complete.text.split("\n")[0]).toBe("Completed");
    expect(complete.text).toContain("Victoria Donovan signed at 2:02 PM EST.");
    expect(complete.html).toContain(">PDF</td>");
    expect(complete.text).toContain("Signers, 3 of 3 signed");
    expect(complete.text).toContain("Document ID: a5c51f5d787a70d0");
    // The signers read in the lease's own order (clause 24): tenants, then the landlord.
    const order = ["Michael Donovan, Tenant", "Victoria Donovan, Tenant", "Jamarber (Arber) Dobrushi, Landlord"].map((n) => complete.text.indexOf(n));
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });

  it("3) the operator alert: names who signed last in the subject and lists the record", () => {
    expect(operator.subject).toBe(
      "11 Bluebill Avenue, Unit 201, Naples, Florida 34108 | Residential Lease | Fully signed, Victoria Donovan last, November 23, 2026"
    );
    expect(operator.text).toContain("Their email: donovan1victoria@gmail.com");
    // The address is printed as a fact, broken up so Gmail cannot draw it as a blue link.
    expect(operator.html).toContain("donovan1victoria@&zwnj;<wbr>gmail&zwnj;.com");
    expect(operator.html).not.toContain("mailto:");
  });

  it("4) the form receipt: their answers back, a reference, no signers", () => {
    expect(receipt.subject).toBe("Owner Hosted Homes | Inquiry | Received from Dana Whitfield, November 23, 2026");
    expect(receipt.text).toContain("Dana Whitfield, your inquiry arrived at 4:12 PM EST.");
    expect(receipt.text).toContain("Reference: INQ-261123-K7Q4M");
    expect(receipt.html).not.toContain("Signers");
  });

  it("the logo is the see-through mark on its own ground, never an opaque letterhead header", () => {
    for (const e of [waiting, complete, operator, receipt]) {
      expect(e.html).toMatch(/<img src="https:\/\/ownerhostedhomes\.com\/brand\/email\/ohh-lockup-ink@3x\.png"[^>]*alt="Owner Hosted Homes"[^>]*bgcolor="#efe6d6"/);
    }
    const header = { ...waiting, html: waiting.html.replace("brand/email/ohh-lockup-ink@3x.png", "brand/ohh/letterhead-header-3x.png") };
    expect(lintSignerEmail(header).join()).toMatch(/opaque letterhead header/);
  });

  it("lint refuses a time with no zone, a 24-hour time and a second heading", () => {
    const plant = (extra: string, text = waiting.text) => lintSignerEmail({ ...waiting, text, html: waiting.html.replace("</body>", `${extra}</body>`) }).join();
    expect(plant("<p>at 2:00 PM</p>")).toMatch(/a time with no zone/);
    expect(plant("<p>x</p>", `${waiting.text}\nat 2:00 PM`)).toMatch(/no zone in the plain text/);
    expect(plant("<p>at 14:00</p>")).toMatch(/24-hour/);
    expect(plant("<h1>again</h1>")).toMatch(/not one <h1>/);
  });

  it("is executed only when every party has signed", () => {
    const s = signingFor(ohh);
    expect(isFullyExecuted(s.a, s.waiting.ex)).toBe(false);
    expect(isFullyExecuted(s.a, s.complete.ex)).toBe(true);
  });
});
