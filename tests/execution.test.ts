import { describe, expect, it } from "vitest";

import type { Agreement } from "../src/content/types";
import { cents, usd, splitEvenly } from "../src/lib/money";
import { longDate, dayIn, nightsBetween } from "../src/lib/dates";
import {
  currentSignatures,
  isFullyExecuted,
  isValidRecord,
  makeRecord,
  outstandingParties,
  signingGate,
  validateSignature,
  type Execution,
  type SignatureRecord,
} from "../src/lib/execution";
import { agreementFingerprint } from "../src/lib/fingerprint";

/** A two-party agreement with an owner who signs first. The Bluebill shape. */
function fixture(over: Partial<Agreement> = {}): Agreement {
  return {
    id: "test-agreement",
    kind: "lease",
    version: "2026-08-28",
    timezone: "America/New_York",
    brand: {
      name: "Palisade Stays", role: "Managing it", phone: "201 321 5446",
      phoneHref: "tel:+12013215446", email: "jake@palisadestays.com", initials: "PS",
    },
    title: "Test lease",
    parties: [
      { id: "owner", legalName: "Jamarber Dobrushi", role: "Landlord", signsFirst: true },
      { id: "tenant", legalName: "Susan Berman", role: "Tenant" },
    ],
    letter: {
      fromName: "Jake Lee", fromRole: "Managing it", headline: "Here it is.",
      paragraphs: [], summary: [], ifWrong: "Call.",
    },
    body: [], attachments: [], signaturePoints: [{ id: "main", title: "The lease" }],
    money: { lines: [], paidTo: "the owner", method: "Zelle" },
    esignAct: "the New Jersey Uniform Electronic Transactions Act",
    ...over,
  };
}

const record = (a: Agreement, party: string, over: Partial<SignatureRecord> = {}): SignatureRecord => ({
  ...makeRecord(
    a,
    { party, legalName: a.parties.find((p) => p.id === party)!.legalName, typed: "x", email: "a@b.com" },
    { fingerprint: "f", ip: null, userAgent: null },
    new Date("2026-08-28T14:00:00Z")
  ),
  ...over,
});

/* ------------------------------------------------------------------ money -- */

describe("money", () => {
  it("formats whole cents without a float tail", () => {
    expect(usd(cents(3_995, 0))).toBe("$3,995.00");
    expect(usd(cents(0, 5))).toBe("$0.05");
  });

  it("refuses a total that will not divide evenly rather than rounding a payment", () => {
    expect(() => splitEvenly(cents(100, 1), 2)).toThrow(/does not divide/);
  });
});

/* ------------------------------------------------------------------ dates -- */

describe("dates", () => {
  it("formats a calendar day without letting a timezone move it", () => {
    // The failure this guards: parsing a lease date in local time west of UTC
    // and formatting it back a day earlier, which is a different agreement.
    expect(longDate("2026-08-28")).toBe("August 28, 2026");
    expect(longDate("2027-01-01")).toBe("January 1, 2027");
  });

  it("stamps the signing day in the agreement's zone, not the server's", () => {
    // 03:30 UTC is still the previous evening in Naples and in New Jersey.
    const at = new Date("2026-08-29T03:30:00Z");
    expect(dayIn("America/New_York", at)).toBe("2026-08-28");
    expect(dayIn("UTC", at)).toBe("2026-08-29");
  });

  it("counts nights the way a term is counted", () => {
    expect(nightsBetween("2027-01-28", "2027-03-01")).toBe(32);
  });
});

/* ------------------------------------------------------------------- gate -- */

describe("the signing gate", () => {
  it("refuses while a party has not been named", () => {
    const a = fixture({
      parties: [
        { id: "owner", legalName: "Jamarber Dobrushi", role: "Landlord" },
        { id: "tenant", legalName: "", role: "Tenant" },
      ],
    });
    const gate = signingGate(a, { signatures: {} });
    expect(gate.open).toBe(false);
    if (!gate.open) expect(gate.reason).toMatch(/no tenant named yet/i);
  });

  it("refuses until the party who signs first has signed", () => {
    const a = fixture();
    const shut = signingGate(a, { signatures: {} });
    expect(shut.open).toBe(false);
    if (!shut.open) expect(shut.reason).toMatch(/Jamarber Dobrushi has not signed/);

    const open = signingGate(a, { signatures: { owner: record(a, "owner") } });
    expect(open.open).toBe(true);
  });

  it("closes again when the agreement is re-issued", () => {
    // The rule the Bluebill lease was built around. A signature is against a
    // text. Re-issuing a version leaves the earlier signature covering the
    // earlier text, so nobody is bound to words they never saw.
    const a = fixture();
    const ex: Execution = { signatures: { owner: record(a, "owner") } };
    expect(signingGate(a, ex).open).toBe(true);

    const revised = fixture({ version: "2026-09-15" });
    expect(signingGate(revised, ex).open).toBe(false);
    expect(currentSignatures(revised, ex)).toEqual({});
  });
});

/* ------------------------------------------------------------- validation -- */

describe("taking a signature", () => {
  const a = fixture();

  it("holds a signer to their exact legal name, and forgives spacing and case", () => {
    const ok = validateSignature(a, {
      party: "tenant", typed: "  susan   BERMAN ", email: "s@example.com",
      acceptedAttachments: true, consentedToElectronicSignature: true,
    });
    expect(ok.ok).toBe(true);

    const wrong = validateSignature(a, {
      party: "tenant", typed: "S. Berman", email: "s@example.com",
      acceptedAttachments: true, consentedToElectronicSignature: true,
    });
    expect(wrong.ok).toBe(false);
  });

  it("never echoes a legal name back in an error", () => {
    // This endpoint is reachable by anyone holding the link. Echoing the name
    // turned a failed attempt into a way to read every party's legal name.
    const wrong = validateSignature(a, {
      party: "tenant", typed: "nope", email: "s@example.com",
      acceptedAttachments: true, consentedToElectronicSignature: true,
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) {
      expect(wrong.message).not.toMatch(/Susan/i);
      expect(wrong.message).not.toMatch(/Berman/i);
    }
  });

  it("refuses to take a signature for a party with no name", () => {
    const unnamed = fixture({
      parties: [{ id: "tenant", legalName: "", role: "Tenant" }],
    });
    const out = validateSignature(unnamed, {
      party: "tenant", typed: "Anybody At All", email: "s@example.com",
      acceptedAttachments: true, consentedToElectronicSignature: true,
    });
    expect(out.ok).toBe(false);
  });

  it("requires consent and a reachable address", () => {
    const noConsent = validateSignature(a, {
      party: "tenant", typed: "Susan Berman", email: "s@example.com",
      acceptedAttachments: true, consentedToElectronicSignature: false,
    });
    expect(noConsent.ok).toBe(false);
    if (!noConsent.ok) expect(noConsent.field).toBe("consentedToElectronicSignature");

    const noEmail = validateSignature(a, {
      party: "tenant", typed: "Susan Berman", email: "not-an-address",
      acceptedAttachments: true, consentedToElectronicSignature: true,
    });
    expect(noEmail.ok).toBe(false);
    if (!noEmail.ok) expect(noEmail.field).toBe("email");
  });
});

/* ----------------------------------------------------------------- records -- */

describe("stored records", () => {
  const a = fixture();
  const good = record(a, "tenant");

  it("accepts a well formed record for this agreement", () => {
    expect(isValidRecord(good, a)).toBe(true);
  });

  it("ignores a record belonging to a different agreement", () => {
    expect(isValidRecord({ ...good, agreementId: "someone-elses" }, a)).toBe(false);
  });

  it("ignores a party who is not on this agreement", () => {
    expect(isValidRecord({ ...good, party: "attacker" }, a)).toBe(false);
  });

  it("ignores a malformed date rather than letting it take the page down", () => {
    // The store cannot delete, so one bad file is permanent. It used to throw
    // while formatting this field, which 500'd every page load and every PDF.
    for (const bad of ["", "not-a-date", "2026-8-28", null, 20260828]) {
      expect(isValidRecord({ ...good, signedOn: bad }, a)).toBe(false);
    }
  });

  it("ignores junk that is not an object at all", () => {
    for (const bad of [null, undefined, "", 7, [], "signed"]) {
      expect(isValidRecord(bad, a)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------- execution -- */

describe("when an agreement is executed", () => {
  const a = fixture();

  it("is not executed while anyone named has not signed", () => {
    const ex: Execution = { signatures: { owner: record(a, "owner") } };
    expect(isFullyExecuted(a, ex)).toBe(false);
    expect(outstandingParties(a, ex).map((p) => p.id)).toEqual(["tenant"]);
  });

  it("is executed once every named party has signed this version", () => {
    const ex: Execution = {
      signatures: { owner: record(a, "owner"), tenant: record(a, "tenant") },
    };
    expect(isFullyExecuted(a, ex)).toBe(true);
    expect(outstandingParties(a, ex)).toEqual([]);
  });

  it("is never executed while a party is still unnamed", () => {
    const half = fixture({
      parties: [
        { id: "owner", legalName: "Jamarber Dobrushi", role: "Landlord" },
        { id: "tenant", legalName: "", role: "Tenant" },
      ],
    });
    const ex: Execution = { signatures: { owner: record(half, "owner") } };
    expect(isFullyExecuted(half, ex)).toBe(false);
  });
});

/* ------------------------------------------------------------ fingerprint -- */

describe("the fingerprint", () => {
  it("changes when any term changes, so a later edit is provable", () => {
    const a = fixture();
    const before = agreementFingerprint(a);
    expect(agreementFingerprint(fixture())).toBe(before);
    expect(agreementFingerprint(fixture({ title: "Test lease " }))).not.toBe(before);
  });

  it("changes when the phone number changes", () => {
    // A changed number on a page asking for a legal signature is as material
    // as a changed clause, so it is inside the hash.
    const a = fixture();
    const moved = fixture({ brand: { ...a.brand, phone: "555 555 5555" } });
    expect(agreementFingerprint(moved)).not.toBe(agreementFingerprint(a));
  });
});

describe("the party who signs first", () => {
  it("is not locked out by their own gate", () => {
    // The gate closed for everyone including the owner, so the one person who
    // could open it was shown a notice saying he had not signed. Caught by
    // driving the real form, not by a test, so here is the test.
    const a = fixture();
    const shut = signingGate(a, { signatures: {} });
    expect(shut.open).toBe(false);

    expect(signingGate(a, { signatures: {} }, "owner").open).toBe(true);
    expect(signingGate(a, { signatures: {} }, "tenant").open).toBe(false);
  });

  it("still cannot sign an agreement whose parties are not all named", () => {
    const a = fixture({
      parties: [
        { id: "owner", legalName: "Jamarber Dobrushi", role: "Landlord", signsFirst: true },
        { id: "tenant", legalName: "", role: "Tenant" },
      ],
    });
    expect(signingGate(a, { signatures: {} }, "owner").open).toBe(false);
  });
});

describe("when there is nowhere to file a signature", () => {
  it("closes the gate rather than showing a form that will fail on submit", () => {
    // The standard: an unset key must look different on screen from a working
    // page. Before this, a missing store rendered a complete, inviting form and
    // the only place the truth appeared was a health probe.
    const a = fixture({
      parties: [
        { id: "owner", legalName: "Jamarber Dobrushi", role: "Landlord" },
        { id: "tenant", legalName: "Susan Berman", role: "Tenant" },
      ],
    });
    expect(signingGate(a, { signatures: {} }, undefined, true).open).toBe(true);

    const noStore = signingGate(a, { signatures: {} }, undefined, false);
    expect(noStore.open).toBe(false);
    // It never blames the signer for our configuration.
    if (!noStore.open) expect(noStore.reason).toMatch(/on our side/);
  });
});
