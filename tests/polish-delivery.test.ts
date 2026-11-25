import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeRecord, type Execution } from "../src/lib/execution";
import { agreementFor } from "./email-fixtures";

const sent: { to: string; html: string; text: string }[] = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (m: { to: string; html: string; text: string }) => {
        sent.push(m);
        return { data: { id: "mock" }, error: null };
      },
    };
  },
}));
vi.mock("../src/lib/pdf", () => ({
  renderAgreementPdf: async () => new Uint8Array([37, 80, 68, 70]),
  pdfFilename: () => "x.pdf",
}));

import { deliverSignedCopy } from "../src/lib/notify";

const a = agreementFor("palisade-lincoln", {
  parties: [
    { id: "owner", legalName: "Michael Williams", role: "Owner" },
    { id: "mgr", legalName: "Jake Lee", role: "Manager" },
  ],
});
const rec = (party: string, name: string, email: string) =>
  makeRecord(a, { party, legalName: name, typed: name, email }, { fingerprint: "f", ip: null, userAgent: null }, new Date("2026-11-24T20:00:00Z"));

beforeEach(() => {
  sent.length = 0;
  process.env.RESEND_API_KEY = "re_test";
  process.env.AGREEMENT_FROM_EMAIL = "Palisade <leads@palisadestays.com>";
  process.env.AGREEMENT_ALERT_EMAIL = "alerts@palisadestays.com";
});

describe("SG-4 each recipient's email carries only that recipient's own link", () => {
  it("maps party to link, so the first signer's mail never holds the last signer's token", async () => {
    const owner = rec("owner", "Michael Williams", "owner@example.com");
    const mgr = rec("mgr", "Jake Lee", "mgr@example.com");
    const ex: Execution = { signatures: { owner, mgr } };
    const links: Record<string, string> = {
      owner: "https://palisadestays.com/x/OWNERTOKEN/pdf",
      mgr: "https://palisadestays.com/x/MGRTOKEN/pdf",
    };
    await deliverSignedCopy(a, mgr, ex, { copyUrl: (party) => links[party] });
    const toOwner = sent.find((m) => m.to === "owner@example.com");
    const toMgr = sent.find((m) => m.to === "mgr@example.com");
    expect(toOwner?.html).toContain("OWNERTOKEN");
    expect(toOwner?.html).not.toContain("MGRTOKEN");
    expect(toOwner?.text).not.toContain("MGRTOKEN");
    expect(toMgr?.html).toContain("MGRTOKEN");
    expect(toMgr?.html).not.toContain("OWNERTOKEN");
  });

  it("still accepts a plain string for a single link", async () => {
    const owner = rec("owner", "Michael Williams", "owner@example.com");
    await deliverSignedCopy(a, owner, { signatures: { owner } }, { copyUrl: "https://palisadestays.com/x/ONE/pdf" });
    expect(sent.find((m) => m.to === "owner@example.com")?.html).toContain("/x/ONE/pdf");
  });
});

describe("SG-5 the sign path logs loudly when mail cannot reach signers", () => {
  it("logs an error naming the cause when the sender is Resend's shared address", async () => {
    process.env.AGREEMENT_FROM_EMAIL = "onboarding@resend.dev";
    delete process.env.LEAD_FROM_EMAIL;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const owner = rec("owner", "Michael Williams", "owner@example.com");
    await deliverSignedCopy(a, owner, { signatures: { owner } });
    const logged = err.mock.calls.map((c) => String(c[0])).join("\n");
    err.mockRestore();
    expect(logged).toMatch(/CANNOT REACH SIGNERS/);
  });

  it("logs the same when there is no API key", async () => {
    delete process.env.RESEND_API_KEY;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const owner = rec("owner", "Michael Williams", "owner@example.com");
    await deliverSignedCopy(a, owner, { signatures: { owner } });
    const logged = err.mock.calls.map((c) => String(c[0])).join("\n");
    err.mockRestore();
    expect(logged).toMatch(/CANNOT REACH SIGNERS/);
  });
});
