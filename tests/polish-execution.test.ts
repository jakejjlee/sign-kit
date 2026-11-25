import { describe, expect, it } from "vitest";

import type { Agreement } from "../src/content/types";
import {
  makeRecord,
  signingGate,
  unfilledPlaceholder,
  validateSignature,
  type Execution,
  type SignInput,
} from "../src/lib/execution";
import { panelStateFor, signedWaitingLine } from "../src/lib/panel-state";
import { agreementFor } from "./email-fixtures";

const EM_DASH = String.fromCharCode(8212);
const base = (over: Partial<Agreement> = {}) => agreementFor("palisade-lincoln", over);
const sign = (a: Agreement, party: string, name: string): Execution["signatures"] => ({
  [party]: makeRecord(
    a,
    { party, legalName: name, typed: name, email: "x@example.com" },
    { fingerprint: "f", ip: null, userAgent: null },
    new Date("2026-11-25T04:59:00Z") // 11:59 PM on Nov 24 in New York
  ),
});
const input = (over: Partial<SignInput> = {}): SignInput => ({
  party: "owner",
  typed: "Michael Williams",
  email: "m@example.com",
  acceptedAttachments: true,
  consentedToElectronicSignature: true,
  ...over,
});
const ny = (over: Partial<Agreement> = {}) => base({ timezone: "America/New_York", ...over });

describe("SG-3 signing stays closed while the text has an unfilled placeholder", () => {
  const withBlank = base({
    body: [{ n: "1", title: "Title", blocks: [{ k: "p", text: "The Owner holds title as [BLANK: how the Owner holds title]." }] }],
  });

  it("closes the gate on [BLANK, with the plain reading notice", () => {
    const gate = signingGate(withBlank, { signatures: {} }, "owner", true);
    expect(gate.open).toBe(false);
    if (!gate.open) {
      expect(gate.code).toBe("placeholder");
      expect(gate.reason).toBe("Ready to read. Signing opens once the details marked BLANK are filled in.");
      expect(gate.reason).not.toContain("!");
      expect(gate.reason).not.toContain(EM_DASH);
    }
  });

  it("closes the gate on {{ in a table row and in the letter", () => {
    const row = base({ body: [{ n: "1", title: "T", blocks: [{ k: "rows", rows: [["Fee", "{{fee}}"]] }] }] });
    expect(unfilledPlaceholder(row)).toContain("{{fee}}");
    const letter = base();
    letter.letter = { ...letter.letter, paragraphs: ["Dear {{name}}"] };
    expect(signingGate(letter, { signatures: {} }, "owner", true).open).toBe(false);
  });

  it("leaves a body with no placeholder open (other apps are unaffected)", () => {
    expect(unfilledPlaceholder(base())).toBeNull();
    expect(signingGate(base(), { signatures: {} }, "owner", true).open).toBe(true);
  });
});

describe("SG-2 a party who signed sees the signed-and-waiting panel, never the form", () => {
  const a = ny();
  const ex: Execution = { signatures: sign(a, "owner", "Michael Williams") };

  it("says when they signed in the agreement's zone and who it waits on", () => {
    expect(signedWaitingLine(a, ex, "owner")).toBe(
      "You signed on November 24, 2026 at 11:59 PM EST. Waiting on Jake Lee."
    );
  });

  it("is the panel state for the signed party, form for the other, complete when all signed", () => {
    expect(panelStateFor(a, ex, "owner", true).kind).toBe("signed-waiting");
    expect(panelStateFor(a, ex, "mgr", true).kind).toBe("form");
    const all: Execution = { signatures: { ...ex.signatures, ...sign(a, "mgr", "Jake Lee") } };
    expect(panelStateFor(a, all, "owner", true).kind).toBe("complete");
  });

  it("a closed gate still shows the closed state to someone who has not signed", () => {
    expect(panelStateFor(base(), { signatures: {} }, "owner", false).kind).toBe("closed");
  });
});

describe("SG-9 free text is capped before any permanent write", () => {
  const a = base();
  const mail = (n: number) => "a".repeat(n - "@b.co".length) + "@b.co";

  it("accepts an email of 254 characters and refuses 255", () => {
    expect(validateSignature(a, input({ email: mail(254) })).ok).toBe(true);
    const r = validateSignature(a, input({ email: mail(255) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("email");
  });

  it("refuses a typed name over 200 characters before comparing it", () => {
    const r = validateSignature(a, input({ typed: "x".repeat(201) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("typed");
  });

  it("drops initials entries with oversized fields", () => {
    const r = validateSignature(
      a,
      input({ initials: [{ clause: "c".repeat(500), initials: "MW", at: "t" }, { clause: "ok", initials: "MW", at: "t" }] })
    );
    expect(r.ok && r.initials?.map((i) => i.clause)).toEqual(["ok"]);
  });
});

describe("SG-10 API wording names only the link's own party", () => {
  it("says 'This link signs for <own party> only.' and never the other party's name", () => {
    const a = base();
    const r = validateSignature(a, input({ party: "mgr", typed: "Jake Lee" }), "owner");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toBe("This link signs for Michael Williams only.");
      expect(r.message).not.toContain("Jake");
    }
    const empty = validateSignature(a, input({ party: "" }), "owner");
    expect(!empty.ok && empty.message).toBe("This link signs for Michael Williams only.");
  });
});
