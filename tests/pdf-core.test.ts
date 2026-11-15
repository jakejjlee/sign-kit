import { describe, expect, it } from "vitest";
import { renderPdf, type PdfModel } from "../src/lib/pdf-core";

const base: PdfModel = {
  eyebrow: "Management Agreement",
  heading: "309 Cranbrook Circle",
  preparedBy: "Prepared by Sun Mountain Stays.",
  parties: ["Owner: Michael Williams"],
  body: [{ n: "1", title: "Scope", blocks: [{ k: "p", text: "Text." }] }],
  signatures: [{ caption: "Michael Williams, Owner", named: true, status: "Awaiting signature" }],
  closing: "Version 2026-11-01.",
  footerLabel: "309 Cranbrook Circle",
};

describe("pdf core", () => {
  it("renders a valid PDF from plain data", async () => {
    const bytes = await renderPdf(base);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("does not fail when a signer types a name the standard fonts cannot draw", async () => {
    const bytes = await renderPdf({
      ...base,
      signatures: [{ caption: "李 Zoë, Owner", named: true, typed: "李 Zoë", status: "Signed" }],
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("draws the optional front matter, closing paragraphs and signature note", async () => {
    const bytes = await renderPdf({
      ...base,
      intro: ["Standfirst."],
      front: [{ n: "", title: "At a glance", blocks: [{ k: "rows", rows: [["Fee", "15%"]] }] }],
      afterBody: ["Callout."],
      signatureNote: "Sign below.",
    });
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
