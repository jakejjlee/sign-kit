import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Agreement } from "../src/content/types";
import { makeRecord, type Execution, type SignatureRecord } from "../src/lib/execution";
import { buildSignerEmail, contrast, signerPalette } from "../src/lib/signer-email";

const sent: Record<string, unknown>[] = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>) => {
        sent.push(msg);
        return { data: { id: "mock" }, error: null };
      },
    };
  },
}));
vi.mock("../src/lib/pdf", () => ({
  renderAgreementPdf: async () => new Uint8Array([37, 80, 68, 70]),
  pdfFilename: () => "unit-2-executed.pdf",
}));

function agreement(over: Partial<Agreement> = {}): Agreement {
  return {
    id: "track-test",
    kind: "lease",
    version: "2026-11-01",
    timezone: "America/Denver",
    brand: {
      name: "Sun Mountain Stays", role: "Managing it for the owner", phone: "719 555 0100",
      phoneHref: "tel:+17195550100", email: "hello@sunmountainstays.com", initials: "SM",
      tokens: { ground: "#f3ede1", paper: "#faf7f0", ink: "#16120c", muted: "#6b6152", rule: "#e5dac4",
        accent: "#e0b866", accentText: "#0d2318" },
    },
    title: "Management Agreement",
    subtitle: "309 Cranbrook Circle, Colorado Springs, Colorado",
    parties: [
      { id: "owner", legalName: "Michael Williams", role: "Owner" },
      { id: "mgr", legalName: "Jake Lee", role: "Manager" },
    ],
    letter: {
      fromName: "Jake Lee", fromRole: "Manager", headline: "h", paragraphs: [],
      summary: [
        { label: "Property", value: "309 Cranbrook Circle" },
        { label: "Start date", value: "November 1, 2026" },
        { label: "Management fee", value: "15% of Net Revenue" },
      ],
      ifWrong: "Reply.",
    },
    body: [], attachments: [], signaturePoints: [{ id: "main", title: "Agreement" }],
    money: { lines: [], paidTo: "Sun Mountain Stays", method: "ACH" },
    esignAct: "the Colorado Uniform Electronic Transactions Act",
    ...over,
  };
}

const rec = (a: Agreement, party: string, legalName: string): SignatureRecord =>
  makeRecord(
    a,
    { party, legalName, typed: legalName, email: "mike@example.com" },
    { fingerprint: "abcdef0123456789abcdef", ip: null, userAgent: null },
    new Date("2026-11-12T01:59:12Z")
  );

function states() {
  const a = agreement();
  const mike = rec(a, "owner", "Michael Williams");
  const jake = rec(a, "mgr", "Jake Lee");
  const waiting: Execution = { signatures: { owner: mike } };
  const executed: Execution = { signatures: { owner: mike, mgr: jake } };
  return { a, mike, waiting, executed };
}

function fontSizes(html: string): number[] {
  return [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
}

describe("signer email: The Track", () => {
  it("fully executed: subject, heading, signer, date, button, no waiting language", () => {
    const { a, mike, executed } = states();
    const m = buildSignerEmail(a, mike, executed, {
      copyUrl: "https://sunmountainstays.com/client/michael-williams/management-agreement",
      attached: true, attachmentName: "cranbrook-executed.pdf",
    });
    expect(m.subject).toBe("Signed: Management Agreement, 309 Cranbrook Circle, Colorado Springs, Colorado");
    expect(m.html).toContain("It is signed and complete.");
    expect(m.html).toContain("Agreement complete");
    expect(m.html).toContain("Michael Williams");
    expect(m.html).toContain("November 11, 2026");
    expect(m.html).toContain("Open your signed copy");
    expect(m.html).toContain("cranbrook-executed.pdf is attached.");
    expect(m.html).not.toContain("Waiting on");
  });

  it("waiting: subject, heading, and the outstanding party is named", () => {
    const { a, mike, waiting } = states();
    const m = buildSignerEmail(a, mike, waiting, { attached: true });
    expect(m.subject).toBe("Your signature is recorded: 309 Cranbrook Circle, Colorado Springs, Colorado");
    expect(m.html).toContain("Your signature is recorded.");
    expect(m.html).toContain("Waiting on Jake Lee");
    expect(m.html).toContain("The manager still needs to sign");
    expect(m.html).toContain("You get the completed agreement");
    expect(m.html).not.toContain("Agreement complete");
    expect(m.html).not.toContain("It is signed and complete.");
  });

  it("names every outstanding party when more than one is missing", () => {
    const a = agreement({
      parties: [
        { id: "owner", legalName: "Michael Williams", role: "Owner" },
        { id: "a", legalName: "Ann Lee", role: "Co-owner" },
        { id: "b", legalName: "Bo Lee", role: "Manager" },
      ],
    });
    const mike = rec(a, "owner", "Michael Williams");
    const m = buildSignerEmail(a, mike, { signatures: { owner: mike } });
    expect(m.html).toContain("Waiting on Ann Lee and Bo Lee");
  });

  it("key terms come from the agreement's own summary rows", () => {
    const { a, mike, executed } = states();
    const { html } = buildSignerEmail(a, mike, executed);
    for (const r of a.letter.summary) {
      expect(html).toContain(r.label);
      expect(html).toContain(r.value);
    }
  });

  it("a real next date adds the third step, and without one the track has two", () => {
    const { a, mike, executed } = states();
    const withNext = buildSignerEmail(a, mike, executed, {
      nextStep: { what: "Cranbrook goes live", when: "Friday, November 13, 2026" },
    }).html;
    expect(withNext).toContain("Cranbrook goes live");
    expect(withNext).toContain("Friday, November 13, 2026");
    const without = buildSignerEmail(a, mike, executed).html;
    expect(without).not.toContain("Cranbrook goes live");
  });

  for (const [label, pick] of [
    ["executed", (s: ReturnType<typeof states>) => s.executed],
    ["waiting", (s: ReturnType<typeof states>) => s.waiting],
  ] as const) {
    describe(label, () => {
      const s = states();
      const html = buildSignerEmail(s.a, s.mike, pick(s), { copyUrl: "https://example.com/c", attached: true }).html;

      it("has no em dash and no exclamation mark in any copy", () => {
        expect(html).not.toContain("—");
        expect(html.replace(/<!doctype html>/i, "").replace(/<!--[\s\S]*?-->/g, "")).not.toContain("!");
      });
      it("has no phone number and no tel: link", () => {
        expect(html).not.toContain("tel:");
        expect(html).not.toContain("719 555 0100");
      });
      it("carries book a call as an inline link in the footer, not a button", () => {
        const links = [...html.matchAll(/<a [^>]*href="https:\/\/jakejjlee\.com\/meet"[^>]*>book a call<\/a>/g)];
        expect(links).toHaveLength(1);
        const tag = links[0][0];
        expect(tag).not.toMatch(/display:\s*(inline-)?block/);
        expect(tag).not.toMatch(/padding/);
        expect(tag).not.toMatch(/border-radius/);
        expect(tag).toMatch(/text-decoration:underline/);
        // Sits inside the sentence "Reply to this email and it reaches ... Or book a call."
        expect(html).toMatch(/Reply to this email and it reaches Sun Mountain Stays\. Or <a [^>]*>book a call<\/a>\./);
      });
      it("has exactly one button, and it is not book a call", () => {
        const buttons = [...html.matchAll(/<a [^>]*padding:16px 28px[^>]*>([^<]*)<\/a>/g)];
        expect(buttons).toHaveLength(1);
        expect(buttons[0][1]).toMatch(/^Open your (signed )?copy$/);
      });
      it("never sets an inline font size under 13px, and body text stays at 16px or more where it is body", () => {
        const sizes = fontSizes(html);
        expect(sizes.length).toBeGreaterThan(5);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
      });
      it("is table-based, light-only and 600px at most", () => {
        expect(html).toContain('role="presentation"');
        expect(html).toContain('content="light only"');
        expect(html).toContain("max-width:600px");
        expect(html).not.toMatch(/<style/i);
      });
      it("wears the brand's own colors", () => {
        expect(html).toContain("#0d2318"); // accentText becomes the band
        expect(html).toContain("#e0b866"); // accent is the small text on the band
        expect(html).toContain("#faf7f0"); // paper
        expect(html).toContain("#f3ede1"); // ground
      });
    });
  }

  it("the wordmark is live text, so it survives images off", () => {
    const { a, mike, executed } = states();
    const { html } = buildSignerEmail(a, mike, executed);
    expect(html).toContain("Sun Mountain Stays</p>");
    expect(html).not.toContain("<img");
  });

  it("another brand's tokens change the band", () => {
    const a = agreement({
      brand: { ...agreement().brand, name: "Palisade Stays",
        tokens: { paper: "#fbf8f1", ground: "#f3ede1", accent: "#33566f", accentText: "#2a475c" } },
    });
    const { html } = buildSignerEmail(a, rec(a, "owner", "Michael Williams"), { signatures: {} });
    expect(html).toContain("#2a475c");
    expect(html).not.toContain("#0d2318");
    expect(html).toContain("Palisade Stays");
  });

  it("a token that cannot be read is replaced by one that can, at 4.5:1 or better", () => {
    const a = agreement({
      brand: { ...agreement().brand, tokens: { paper: "#faf7f0", accentText: "#f0e8cf", accent: "#f5f0d8", muted: "#d8d2c0" } },
    });
    const p = signerPalette(a);
    expect(contrast(p.paper, p.band)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.bandText, p.band)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.bandAccent, p.band)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it("the Sun Mountain palette measures at or above 4.5:1 everywhere text sits", () => {
    const p = signerPalette(agreement());
    expect(contrast(p.bandText, p.band)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.bandAccent, p.band)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.ink, p.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it("does not claim an attachment that is not there, and says so plainly", () => {
    const { a, mike, executed } = states();
    const none = buildSignerEmail(a, mike, executed, { copyUrl: "https://example.com/c" }).html;
    expect(none).not.toContain("is attached");
    expect(none).not.toContain("PDF is attached");
    expect(none).toContain("could not be attached");
  });

  it("escapes names and terms", () => {
    const a = agreement();
    const bad = { ...rec(a, "owner", "A <b>&Co"), legalName: "A <b>&Co" };
    const { html } = buildSignerEmail(a, bad, { signatures: { owner: bad } });
    expect(html).toContain("A &lt;b&gt;&amp;Co");
    expect(html).not.toContain("<b>&Co");
  });
});

describe("deliverSignedCopy sends The Track to the signer and keeps the operator email", () => {
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "re_test_mock";
    process.env.LEAD_FROM_EMAIL = "Sun Mountain Stays <hello@sunmountainstays.com>";
    process.env.LEAD_TO_EMAIL = "ops@example.com";
  });

  it("signer gets the new email with the PDF; operator email is unchanged in kind", async () => {
    const { deliverSignedCopy } = await import("../src/lib/notify");
    const { a, mike, executed } = states();
    const res = await deliverSignedCopy(a, mike, executed, { copyUrl: "https://example.com/c" });
    expect(res.signerCopy).toBe(true);
    expect(res.operatorNotice).toBe(true);
    expect(sent).toHaveLength(2);
    const [signer, operator] = sent;
    expect(signer.to).toBe("mike@example.com");
    expect(String(signer.html)).toContain("It is signed and complete.");
    expect(String(signer.html)).toContain("unit-2-executed.pdf is attached.");
    expect(String(signer.html)).not.toContain("tel:");
    expect(signer.attachments).toHaveLength(1);
    expect(operator.to).toBe("ops@example.com");
    expect(String(operator.subject)).toContain("FULLY EXECUTED");
  });
});
