import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import { renderAgreementPdf } from "../src/lib/pdf";
import type { Agreement } from "../src/content/types";
import type { Execution } from "../src/lib/execution";

/**
 * A section can open a group, and a signature can carry the clauses it
 * initialed. Both are optional and both have to reach the paper, because the
 * PDF is the artifact that gets filed.
 */

const a: Agreement = {
  id: "t", kind: "lease", version: "2026-01-01", timezone: "America/New_York",
  brand: { name: "T", role: "R", phone: "1", phoneHref: "tel:1", email: "a@b.c", initials: "T" },
  title: "T", subtitle: "S",
  parties: [{ id: "one", legalName: "One Person", role: "Landlord", email: "a@b.c" }],
  letter: { fromName: "x", fromRole: "y", headline: "h", paragraphs: [], summary: [], ifWrong: "" },
  money: { lines: [], paidTo: "", method: "" },
  body: [
    { n: "1", group: "First group", title: "Alpha", blocks: [{ k: "p", text: "alpha text" }] },
    { n: "2", title: "Beta", blocks: [{ k: "p", text: "beta text" }] },
  ],
  attachments: [], signaturePoints: [], esignAct: "the Act",
};

const signed = {
  agreementId: "t", party: "one", legalName: "One Person", typed: "One Person",
  version: "2026-01-01", signedOn: "2026-01-02", signedAt: "2026-01-02T00:00:00Z",
  signedAtLocal: "January 2, 2026", acceptedAttachments: true,
  consentedToElectronicSignature: true, ip: null, userAgent: null,
};

const ex: Execution = {
  signatures: {
    one: { ...signed, initials: [{ clause: "1", initials: "OP", at: "2026-01-02T00:00:00Z" }] },
  },
};

describe("the pdf carries what the screen collected", () => {
  it("renders when a section has a group and a record has initials", async () => {
    const bytes = await renderAgreementPdf(a, ex);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(0);
  });

  it("grows when initials are present, because it draws them", async () => {
    const withInitials = await renderAgreementPdf(a, ex);
    const without = await renderAgreementPdf(a, { signatures: { one: { ...signed } } });
    expect(withInitials.length).toBeGreaterThan(without.length);
  });

  it("still renders an agreement that uses neither", async () => {
    const plain: Agreement = { ...a, body: [{ n: "1", title: "Alpha", blocks: [{ k: "p", text: "x" }] }] };
    const bytes = await renderAgreementPdf(plain, { signatures: {} });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
  });
});

describe("the record carries initials only when they are real", () => {
  it("keeps a well-formed set and drops a malformed one", async () => {
    const { validateSignature } = await import("../src/lib/execution");
    const ok = validateSignature(a, {
      party: "one", typed: "One Person", email: "a@b.c",
      acceptedAttachments: true, consentedToElectronicSignature: true,
      initials: [
        { clause: "1", initials: "OP", at: "2026-01-02T00:00:00Z" },
        { clause: "", initials: "OP", at: "x" },
        { clause: "2", initials: "  ", at: "x" },
      ],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.initials?.map((i) => i.clause)).toEqual(["1"]);
  });

  it("leaves initials absent when none were given", async () => {
    const { validateSignature, makeRecord } = await import("../src/lib/execution");
    const ok = validateSignature(a, {
      party: "one", typed: "One Person", email: "a@b.c",
      acceptedAttachments: true, consentedToElectronicSignature: true,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    const rec = makeRecord(a, ok, { fingerprint: "f", ip: null, userAgent: null }, new Date());
    expect("initials" in rec).toBe(false);
  });

  it("still accepts a record with no initials as valid", async () => {
    const { isValidRecord } = await import("../src/lib/execution");
    expect(isValidRecord(signed, a)).toBe(true);
  });
});
