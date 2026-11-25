import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Agreement } from "../src/content/types";
import type { Execution } from "../src/lib/execution";
import { agreementFor } from "./email-fixtures";

const state: { ex: Execution; kind: "drive" | "local" | "none"; wrote: number } = {
  ex: { signatures: {} },
  kind: "local",
  wrote: 0,
};
vi.mock("../src/lib/store", () => ({
  readExecution: async () => state.ex,
  storeKind: () => state.kind,
  writeSignature: async () => {
    state.wrote += 1;
    return { ok: true };
  },
  probeStore: async () => ({ ok: true, kind: state.kind, detail: "ok" }),
}));
vi.mock("resend", () => ({ Resend: class {} }));

import { createHealthHandler } from "../src/api/health";
import { createSignHandler } from "../src/api/sign";

const a: Agreement = agreementFor("palisade-lincoln");
const TOKEN = "owner-token-1";
const post = (h: (r: Request) => Promise<Response>, body: Record<string, unknown>) =>
  h(
    new Request("http://localhost/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: TOKEN, ...body }),
    })
  );
const good = {
  party: "owner",
  typed: "Michael Williams",
  email: "m@example.com",
  acceptedAttachments: true,
  consentedToElectronicSignature: true,
};

beforeEach(() => {
  state.ex = { signatures: {} };
  state.kind = "local";
  state.wrote = 0;
});

describe("SG-1 a closed gate has its own status and is never 'already signed'", () => {
  it("answers 503 (not 409) with no alreadySigned flag when the store is unreadable", async () => {
    state.ex = { signatures: {}, unavailable: "drive timed out" };
    const h = createSignHandler({ agreement: a, token: TOKEN, signingAs: "owner", phone: "x" });
    const res = await post(h, good);
    const data = (await res.json()) as { alreadySigned?: boolean; error: string };
    expect(res.status).toBe(503);
    expect(data.alreadySigned).toBeUndefined();
    expect(data.error).toMatch(/cannot be read right now/);
    expect(state.wrote).toBe(0);
  });

  it("answers 503 while the text has a placeholder, and writes nothing", async () => {
    const blank = agreementFor("palisade-lincoln", {
      body: [{ n: "1", title: "T", blocks: [{ k: "p", text: "[BLANK: permit number]" }] }],
    });
    const h = createSignHandler({ agreement: blank, token: TOKEN, signingAs: "owner", phone: "x" });
    const res = await post(h, good);
    expect(res.status).toBe(503);
    expect(state.wrote).toBe(0);
  });
});

describe("SG-6 a signing token can never be the ops key", () => {
  const url = (k: string) => new Request(`http://localhost/health?k=${k}`);
  it("returns 404 when no ops key is set, even for a signing token", async () => {
    delete process.env.AGREEMENT_OPS_KEY;
    const h = createHealthHandler({ agreement: a, fallbackKey: TOKEN, signingTokens: [TOKEN] });
    expect((await h(url(TOKEN))).status).toBe(404);
  });
  it("returns 404 when the ops key equals a signing token", async () => {
    process.env.AGREEMENT_OPS_KEY = TOKEN;
    const h = createHealthHandler({ agreement: a, signingTokens: [TOKEN] });
    expect((await h(url(TOKEN))).status).toBe(404);
    delete process.env.AGREEMENT_OPS_KEY;
  });
});

describe("SG-5 health is 503 until mail can reach signers", () => {
  const url = new Request("http://localhost/health?k=ops-key-1");
  beforeEach(() => {
    process.env.AGREEMENT_OPS_KEY = "ops-key-1";
    delete process.env.LEAD_FROM_EMAIL;
  });

  it("503 with no API key", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.AGREEMENT_FROM_EMAIL = "Palisade <leads@palisadestays.com>";
    const res = await createHealthHandler({ agreement: a })(url);
    const data = (await res.json()) as { canBeSigned: boolean };
    expect(res.status).toBe(503);
    expect(data.canBeSigned).toBe(false);
  });

  it("503 with Resend's shared sender", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.AGREEMENT_FROM_EMAIL = "onboarding@resend.dev";
    expect((await createHealthHandler({ agreement: a })(url)).status).toBe(503);
  });

  it("503 with a sender that is not on the brand's domain", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.AGREEMENT_FROM_EMAIL = "Someone <leads@elsewhere.com>";
    expect((await createHealthHandler({ agreement: a })(url)).status).toBe(503);
  });

  it("200 with a key and a sender on the brand domain", async () => {
    const branded = agreementFor("palisade-lincoln");
    process.env.RESEND_API_KEY = "re_test";
    process.env.AGREEMENT_FROM_EMAIL = `Palisade Stays <leads@${branded.brand.email.split("@")[1]}>`;
    expect((await createHealthHandler({ agreement: branded })(url)).status).toBe(200);
  });
});
