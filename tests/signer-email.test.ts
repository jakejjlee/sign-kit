import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Agreement } from "../src/content/types";
import { makeRecord, type Execution, type SignatureRecord } from "../src/lib/execution";
import { buildSignerEmail, contrast, signerPalette } from "../src/lib/signer-email";
import { DEFAULT_FACES, lintSignerEmail, renderOperatorEmail, renderReceiptEmail } from "../src/lib/signer-email-core";

const sent: Record<string, unknown>[] = [];
/** Lets a test make the signer's own send hang forever, like a stalled mail service. */
const hang = { signer: false };
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>) => {
        sent.push(msg);
        if (hang.signer && msg.to === "mike@example.com") return new Promise(() => {});
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
        { label: "Management fee", value: "10% of Net Revenue" },
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

describe("signer email: The Specimen", () => {
  it("fully executed: subject, heading, signer, date, button, no waiting language", () => {
    const { a, mike, executed } = states();
    const m = buildSignerEmail(a, mike, executed, {
      copyUrl: "https://sunmountainstays.com/client/michael-williams/management-agreement",
      attached: true, attachmentName: "cranbrook-executed.pdf",
    });
    expect(m.subject).toBe("309 Cranbrook Circle, Colorado Springs, Colorado | Management Agreement | Fully signed, November 11, 2026");
    expect(m.html).toContain("Your agreement is signed and complete.");
    expect(m.html).toContain("Every party has signed.");
    expect(m.html).toContain("Michael Williams");
    expect(m.html).toContain("Jake Lee");
    expect(m.html).toContain("Complete");
    expect(m.html).toContain("November 11, 2026");
    expect(m.html).toContain("Open your signed copy");
    expect(m.html).toContain("cranbrook-executed.pdf is attached.");
    expect(m.html).not.toContain("Signature needed");
    expect(m.html).not.toContain("Has not signed yet");
  });

  it("waiting: subject, heading, and the outstanding party is named", () => {
    const { a, mike, waiting } = states();
    const m = buildSignerEmail(a, mike, waiting, { attached: true });
    // The state leads the subject, so a phone list that cuts at about 40 characters still shows it.
    expect(m.subject).toBe("309 Cranbrook Circle, Colorado Springs, Colorado | Management Agreement | Signed by Michael Williams, November 11, 2026");
    expect(m.html).toContain("Your signature is recorded.");
    expect(m.html).toContain("Signed 1 of 2");
    expect(m.html).toContain("Signature needed");
    expect(m.html).toContain("Jake Lee, Manager. Has not signed yet");
    expect(m.html).toContain("The manager still needs to sign");
    expect(m.html).not.toContain("Your agreement is signed and complete.");
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
    expect(m.html).toContain("Ann Lee, Co-owner. Has not signed yet");
    expect(m.html).toContain("Bo Lee, Manager. Has not signed yet");
    expect(m.html).toContain("Signed 1 of 3");
  });

  it("reads three or more parties as a list, one role word per role, with the right verb", () => {
    const a = agreement({
      parties: [
        { id: "owner", legalName: "Michael Williams", role: "Owner" },
        { id: "a", legalName: "Ann Lee", role: "Co-owner" },
        { id: "b", legalName: "Bo Lee", role: "Co-owner" },
        { id: "c", legalName: "Cy Lee", role: "Manager" },
      ],
    });
    const mike = rec(a, "owner", "Michael Williams");
    const m = buildSignerEmail(a, mike, { signatures: { owner: mike } });
    expect(m.html).toContain("The co-owner and manager still need to sign");
    expect(m.html).toContain("Cy Lee, Manager. Has not signed yet");
    expect(m.subject).toContain(" | Signed by Michael Williams, ");
  });

  it("keeps the time and zone on one line, so a receipt never breaks as 6:59 / PM MST", () => {
    const { a, mike, executed } = states();
    const { html } = buildSignerEmail(a, mike, executed);
    expect(html).toMatch(/\d{1,2}:\d{2}\u00a0(AM|PM)\u00a0[A-Z]{3}/);
    expect(html).not.toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it("every painted background sits on a table cell that also carries bgcolor (Outlook, dark modes)", () => {
    const { a, mike, waiting } = states();
    const { html } = buildSignerEmail(a, mike, waiting, { copyUrl: "https://example.com/c", attached: true });
    const bare = [...html.matchAll(/<(\w+)\b([^>]*style="[^"]*background:[^"]*"[^>]*)>/g)].filter(
      ([, tag, attrs]) => !["a", "img"].includes(tag) && !/bgcolor=/.test(attrs)
    );
    expect(bare.map((b) => b[0])).toEqual([]);
  });

  it("phone and inbox details: format-detection off, padded preheader, empty-alt decoration, plain text part", () => {
    const { a, mike, executed } = states();
    const m = buildSignerEmail(a, mike, executed, { copyUrl: "https://example.com/c" });
    expect(m.html).toContain('name="format-detection"');
    expect(m.html).toContain("xmlns:v=");
    expect(m.html.match(/&zwnj;&nbsp;/g)?.length ?? 0).toBeGreaterThanOrEqual(60);
    expect(m.text).toContain("Michael Williams, Owner: signed November 11, 2026");
    expect(m.text).toContain("Open your signed copy: https://example.com/c");
    expect(m.text).toContain("Management fee: 10% of Net Revenue");
    expect(m.text).not.toMatch(/<|&nbsp;| /);
    expect(m.html.length).toBeLessThan(40_000); // Gmail clips a message at about 102KB
  });

  it("key terms come from the agreement's own summary rows", () => {
    const { a, mike, executed } = states();
    const { html } = buildSignerEmail(a, mike, executed);
    for (const r of a.letter.summary) {
      expect(html).toContain(r.label);
      expect(html).toContain(r.value);
    }
  });

  it("a real next date is said under the headline, and without one nothing is invented", () => {
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
        expect(html.replace(/<!doctype html>/i, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<style>[\s\S]*?<\/style>/g, "")).not.toContain("!");
      });
      it("has no phone number and no tel: link", () => {
        expect(html).not.toContain("tel:");
        expect(html).not.toContain("719 555 0100");
      });
      it("carries the booking address alone in its own paragraph under a colon, not a button", () => {
        const links = [...html.matchAll(/<a [^>]*href="https:\/\/jakejjlee\.com\/meet"[^>]*>[^<]*<\/a>/g)];
        expect(links).toHaveLength(1);
        const tag = links[0][0];
        expect(tag).not.toMatch(/display:\s*(inline-)?block/);
        expect(tag).not.toMatch(/padding/);
        expect(tag).not.toMatch(/border-radius/);
        expect(tag).toMatch(/text-decoration:underline/);
        // The ask sentence ends in a colon; the address is the only thing in its own <p>.
        expect(html).toMatch(/Reply to this email and it reaches Sun Mountain Stays\. To talk anything through, pick a time here:<\/p>/);
        expect(html).toMatch(/<p [^>]*><a [^>]*href="https:\/\/jakejjlee\.com\/meet"[^>]*>https:\/\/jakejjlee\.com\/meet<\/a><\/p>/);
      });
      it("puts the booking address alone on its own line in the plain text", () => {
        const text = buildSignerEmail(s.a, s.mike, pick(s), { copyUrl: "https://example.com/c", attached: true }).text;
        const lines = text.split("\n");
        const i = lines.indexOf("https://jakejjlee.com/meet");
        expect(i).toBeGreaterThan(1);
        expect(lines[i - 1]).toBe("");
        expect(lines[i + 1]).toBe("");
        expect(lines[i - 2]).toMatch(/pick a time here:$/);
        expect(text.match(/jakejjlee\.com\/meet/g)).toHaveLength(1);
      });
      it("has exactly one button, and it is not book a call", () => {
        const buttons = [...html.matchAll(/<a [^>]*height:56px;line-height:56px[^>]*>([^<]*)<\/a>/g)];
        expect(buttons).toHaveLength(1);
        expect(buttons[0][1]).toMatch(/^Open your (signed )?copy$/);
      });
      it("never sets an inline font size under 13px, and body text stays at 16px or more where it is body", () => {
        // Empty spacer cells (a 2px track line holding one non-breaking space) carry no readable text.
        const sizes = fontSizes(html.replace(/<td[^>]*>&nbsp;<\/td>/g, "")).filter((n) => n > 2);
        expect(sizes.length).toBeGreaterThan(5);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
      });
      it("is table-based, light-only and 600px at most", () => {
        expect(html).toContain('role="presentation"');
        expect(html).toContain('content="light only"');
        expect(html).toContain("max-width:600px");
        expect(html).not.toContain("Times New Roman");
      });
      it("wears the brand's own colors", () => {
        expect(html).toContain("#0d2318"); // accentText becomes the button and the signed name
        expect(html).toContain("#e0b866"); // accent is the gold rule
        expect(html).toContain("#faf7f0"); // paper (the sheet)
        expect(html).toContain("#f3ede1"); // ground
      });
    });
  }

  it("the wordmark is live text, so it survives images off", () => {
    const { a, mike, executed } = states();
    const { html } = buildSignerEmail(a, mike, executed);
    expect(html).toContain("Sun Mountain Stays</span>");
    expect(html).not.toContain("<img");
  });

  it("a real logo is a hosted image with alt text and its background painted in", () => {
    const base = agreement();
    const a = agreement({
      brand: { ...base.brand, logo: { src: "https://sunmountainstays.com/brand/sun-mountain-mark-256.png", width: 256, height: 256, alt: "Sun Mountain Stays", markOnly: true } },
    });
    const { html } = buildSignerEmail(a, rec(a, "owner", "Michael Williams"), { signatures: {} });
    expect(html).toMatch(/<img src="https:\/\/sunmountainstays\.com\/brand\/sun-mountain-mark-256\.png"[^>]*alt="Sun Mountain Stays"/);
    expect(html).toMatch(/<img [^>]*bgcolor="#f3ede1"/);
    expect(lintSignerEmail({ subject: "x | y | Signed by z", html, text: "t".repeat(100) })).not.toContain("an image with no alt attribute");
  });

  it("another brand's tokens change the button", () => {
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

describe("deliverSignedCopy sends The Specimen to the signer and to the business inbox", () => {
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "re_test_mock";
    process.env.LEAD_FROM_EMAIL = "Sun Mountain Stays <hello@sunmountainstays.com>";
    process.env.LEAD_TO_EMAIL = "ops@example.com";
  });

  it("signer gets the Specimen with the PDF; the business inbox gets the Specimen alert", async () => {
    const { deliverSignedCopy } = await import("../src/lib/notify");
    const { a, mike, executed } = states();
    const res = await deliverSignedCopy(a, mike, executed, { copyUrl: "https://example.com/c" });
    expect(res.signerCopy).toBe(true);
    expect(res.operatorNotice).toBe(true);
    // Mike, Jake (an earlier signer with an address is owed the completed copy too) and the operator.
    expect(sent).toHaveLength(3);
    const signer = sent.find((m) => m.to === "mike@example.com") as Record<string, unknown>;
    const operator = sent.find((m) => m.to === "ops@example.com") as Record<string, unknown>;
    expect(String(signer.html)).toContain("Your agreement is signed and complete.");
    expect(String(signer.html)).toContain("unit-2-executed.pdf is attached.");
    expect(String(signer.html)).not.toContain("tel:");
    expect(String(signer.text)).toContain("Michael Williams, Owner: signed");
    expect(signer.from).toBe("Sun Mountain Stays <hello@sunmountainstays.com>");
    expect(signer.attachments).toHaveLength(1);
    expect(String(operator.subject)).toBe("309 Cranbrook Circle, Colorado Springs, Colorado | Management Agreement | Fully signed, November 11, 2026");
    expect(String(operator.html)).toContain("Michael Williams signed. It is complete.");
    expect(String(operator.html)).toContain("Signature record");
    expect(String(operator.html)).toContain("Open the signed agreement");
    expect(String(operator.text)).toContain("Every party has signed. The executed agreement is attached.");
  });

  it("an earlier signer gets the completed copy when the last party signs, and only if they left an address", async () => {
    const { deliverSignedCopy } = await import("../src/lib/notify");
    const { a, mike } = states();
    const jake = { ...rec(a, "mgr", "Jake Lee"), email: "jake@example.com" };
    await deliverSignedCopy(a, jake, { signatures: { owner: mike, mgr: jake } });
    expect(sent.map((m) => m.to).sort()).toEqual(["jake@example.com", "mike@example.com", "ops@example.com"]);
    sent.length = 0;
    const jakeNoAddress = { ...jake, email: undefined };
    await deliverSignedCopy(a, jakeNoAddress, { signatures: { owner: mike, mgr: jakeNoAddress } });
    expect(sent.map((m) => String(m.to)).sort()).toEqual(["mike@example.com", "ops@example.com", "ops@example.com"]);
    expect(sent.some((m) => String(m.subject).startsWith("[NO SIGNER ADDRESS]"))).toBe(true);
    expect(sent.some((m) => String(m.subject).includes("SIGNER COPY FAILED"))).toBe(false);
  });

  it("a waiting signature emails only the signer who just signed", async () => {
    const { deliverSignedCopy } = await import("../src/lib/notify");
    const { a, mike, waiting } = states();
    await deliverSignedCopy(a, mike, waiting);
    expect(sent.map((m) => m.to).sort()).toEqual(["mike@example.com", "ops@example.com"]);
  });

  it("a hung mail service cannot hold the signing response past the limit, and the operator is still told", async () => {
    vi.useFakeTimers();
    try {
      const { deliverSignedCopy, STEP_TIMEOUT_MS } = await import("../src/lib/notify");
      const { a, mike, waiting } = states();
      hang.signer = true;
      const started = deliverSignedCopy(a, mike, waiting);
      await vi.advanceTimersByTimeAsync(STEP_TIMEOUT_MS + 50);
      const res = await started;
      expect(res.signerCopy).toBe(false);
      expect(res.operatorNotice).toBe(true);
      expect(res.detail).toContain("took over");
      expect(sent.some((m) => String(m.subject).startsWith("[SIGNER COPY FAILED]"))).toBe(true);
    } finally {
      hang.signer = false;
      vi.useRealTimers();
    }
  });
});

describe("searchable names", () => {
  it("names the PDF by place and document, and says partly signed or signed, never draft", async () => {
    const { pdfFilename } = await vi.importActual<typeof import("../src/lib/pdf")>("../src/lib/pdf");
    const { a, waiting, executed } = states();
    expect(pdfFilename(a, waiting)).toBe("309-Cranbrook-Circle-Colorado-Springs-Colorado-Management-Agreement-partly-signed.pdf");
    expect(pdfFilename(a, executed)).toBe("309-Cranbrook-Circle-Colorado-Springs-Colorado-Management-Agreement-signed.pdf");
  });
});

describe("the operator alert and the form receipt wear the same Specimen", () => {
  const palette = signerPalette(agreement());
  const faces = DEFAULT_FACES;

  it("the operator alert names who signed, who is left, and the record, and passes the cheap checks", () => {
    const m = renderOperatorEmail({
      palette, faces, brandName: "Sun Mountain Stays", docTitle: "Management Agreement",
      subjectPlace: "309 Cranbrook Circle", place: "309 Cranbrook Circle, Colorado Springs, Colorado",
      signedBy: "Michael Williams", signedWhen: "November 11, 2026, 6:59 PM MST",
      waiting: [{ name: "Jake Lee", role: "Manager" }],
      record: [{ label: "Version", value: "November 1, 2026" }],
      button: { url: "https://example.com/c" },
      note: ["The signature record is filed on the shared drive."],
      legalLine: "Sun Mountain Stays LLC",
    });
    expect(m.subject).toBe("309 Cranbrook Circle | Management Agreement | Signed by Michael Williams, November 11, 2026");
    expect(m.html).toContain("Michael Williams signed.");
    expect(m.html).toContain("Jake Lee has not signed yet.");
    expect(m.html).toContain("Signature needed");
    expect(m.html).toContain("Open the signed agreement");
    expect(lintSignerEmail(m)).toEqual([]);
  });

  it("the form receipt is a sheet of what was received and a reference, with no signature lines", () => {
    const m = renderReceiptEmail({
      palette, faces, brandName: "Palisade Stays",
      subject: "Palisade Stays | Inquiry received | Full-Service Management, November 14, 2026",
      headline: "Your inquiry has arrived.",
      lead: ["Thank you for writing in. Your inquiry arrived, and I review every one personally."],
      sheetTitle: "Your inquiry", caption: "For your records, here is what you sent:",
      received: [{ label: "Reason", value: "Full-Service Management" }],
      reference: { label: "Reference", value: "INQ-261114-7K3QX" },
      after: ["To choose a time to talk, book a call with me here:", "[https://jakejjlee.com/meet](https://jakejjlee.com/meet)"],
      signoff: { name: "Jake Lee", title: "Founder, Palisade Stays" },
      legalLine: "Palisade Stays LLC.",
    });
    expect(m.html).toContain("INQ-261114-7K3QX");
    expect(m.html).toContain("Received");
    expect(m.html).not.toContain("Signature needed");
    expect(m.text).toContain("Reference: INQ-261114-7K3QX");
    const lines = m.text.split("\n");
    const i = lines.indexOf("https://jakejjlee.com/meet");
    expect(i).toBeGreaterThan(1);
    expect(lines[i - 1]).toBe("");
    expect(lines[i + 1]).toBe("");
    expect(lines[i - 2]).toBe("To choose a time to talk, book a call with me here:");
    expect(lintSignerEmail(m)).toEqual([]);
  });

  it("a Times New Roman stack is repaired, never shipped", () => {
    const m = renderReceiptEmail({
      palette, faces: { serif: "Georgia,'Times New Roman',serif", sans: "Arial,sans-serif", wordmark: "Georgia,'Times New Roman',serif" },
      brandName: "Palisade Stays", subject: "Palisade Stays | Inquiry received | x, November 14, 2026",
      headline: "h", lead: ["l"], sheetTitle: "t", received: [], legalLine: "L",
    });
    expect(m.html).not.toContain("Times New Roman");
  });
});
