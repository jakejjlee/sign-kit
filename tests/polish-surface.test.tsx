import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SignedWaiting, SigningClosed } from "../src/surfaces/AgreementSurface";
import { classifySignResponse, fieldAria } from "../src/surfaces/sign-response";

describe("SG-1 a 409 is 'signed' only when the response says alreadySigned", () => {
  it("treats 409 with alreadySigned as already signed", () => {
    expect(classifySignResponse(409, { alreadySigned: true, error: "on file" }).kind).toBe("already-signed");
  });
  it("treats a 409 without alreadySigned as an error carrying its message", () => {
    const r = classifySignResponse(409, { error: "The signature record cannot be read right now." });
    expect(r).toEqual({ kind: "error", message: "The signature record cannot be read right now.", field: undefined });
  });
  it("treats a closed-gate 503 as an error, never the confirmation", () => {
    expect(classifySignResponse(503, { error: "held" }).kind).toBe("error");
  });
  it("treats ok:true as recorded", () => {
    expect(classifySignResponse(200, { ok: true }).kind).toBe("recorded");
  });
  it("keeps 412 as an error with the server wording", () => {
    expect(classifySignResponse(412, { error: "updated" })).toMatchObject({ kind: "error", message: "updated" });
  });
});

describe("SG-13 the field the API names is marked invalid and described by the error", () => {
  it("marks only the named field", () => {
    expect(fieldAria("email", "email", "Please add an email", "sk-email-hint")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "sk-email-hint sk-error",
    });
    expect(fieldAria("typed", "email", "Please add an email", "sk-typed-hint")).toEqual({
      "aria-invalid": undefined,
      "aria-describedby": "sk-typed-hint",
    });
    expect(fieldAria("typed", undefined, null, "sk-typed-hint")["aria-invalid"]).toBeUndefined();
  });
});

describe("SG-2 the signed-and-waiting panel", () => {
  it("renders the line and the download button, and no form", () => {
    const html = renderToStaticMarkup(
      <SignedWaiting line="You signed on November 24, 2026 at 7:52 PM EST. Waiting on Jake Lee." pdfHref="/x/pdf" />
    );
    expect(html).toContain("You signed on November 24, 2026 at 7:52 PM EST. Waiting on Jake Lee.");
    expect(html).toContain('href="/x/pdf"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });
});

describe("SG-3 the reading notice", () => {
  it("shows the plain notice and no form for a placeholder gate", () => {
    const html = renderToStaticMarkup(
      <SigningClosed
        code="placeholder"
        reason="Ready to read. Signing opens once the details marked BLANK are filled in."
        phone="x"
        phoneHref="tel:1"
        pdfHref="/p"
      />
    );
    expect(html).toContain("Ready to read. Signing opens once the details marked BLANK are filled in.");
    expect(html).not.toContain("<form");
  });
});
