import type { Agreement } from "../src/content/types";
import { makeRecord, type Execution, type SignatureRecord } from "../src/lib/execution";

/**
 * The brands the kit's signer email has to look right on, as real token sets:
 * Sun Mountain Stays (deep green band, brass), Palisade Stays as used by the
 * Lincoln lease (steel blue), and a brand with no tokens at all, which is how
 * the Reyhan site renders until its direction is picked (the kit's fallbacks).
 */
export const BRANDS = {
  "sun-mountain": {
    name: "Sun Mountain Stays",
    role: "Managing it for the owner",
    email: "hello@sunmountainstays.com",
    tokens: {
      ground: "#f3ede1", paper: "#faf7f0", ink: "#16120c", muted: "#6b6152", rule: "#e5dac4",
      accent: "#e0b866", accentText: "#0d2318",
    },
  },
  "palisade-lincoln": {
    name: "Palisade Stays",
    role: "Managing 243 Lincoln for the owner",
    email: "jake@palisadestays.com",
    tokens: { accent: "#33566f", accentText: "#2a475c" },
  },
  "no-tokens": {
    name: "Reyhan Stays",
    role: "Managing it for the owner",
    email: "hello@example.com",
    tokens: undefined,
  },
} as const;

export type BrandKey = keyof typeof BRANDS;

export function agreementFor(brand: BrandKey, over: Partial<Agreement> = {}): Agreement {
  const b = BRANDS[brand];
  return {
    id: `fixture-${brand}`,
    kind: "lease",
    version: "2026-11-01",
    timezone: "America/Denver",
    brand: {
      name: b.name, role: b.role, phone: "719 555 0100", phoneHref: "tel:+17195550100",
      email: b.email, initials: b.name.slice(0, 2).toUpperCase(),
      tokens: b.tokens ? { ...b.tokens } : undefined,
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
        { label: "Property", value: "309 Cranbrook Circle, Colorado Springs, Colorado" },
        { label: "Start date", value: "November 1, 2026" },
        { label: "Management fee", value: "15% of Net Revenue, or 10% on stays of 30 nights or longer" },
        { label: "Onboarding fee", value: "None" },
        { label: "Term", value: "Month to month" },
        { label: "Notice to end", value: "30 days notice, after the first 90 days" },
      ],
      ifWrong: "Reply.",
    },
    body: [], attachments: [], signaturePoints: [{ id: "main", title: "Agreement" }],
    money: { lines: [], paidTo: b.name, method: "ACH" },
    esignAct: "the Colorado Uniform Electronic Transactions Act",
    ...over,
  };
}

export const record = (a: Agreement, party: string, legalName: string, email = "signer@example.com"): SignatureRecord =>
  makeRecord(
    a,
    { party, legalName, typed: legalName, email },
    { fingerprint: "abcdef0123456789abcdef", ip: null, userAgent: null },
    new Date("2026-11-12T01:59:12Z")
  );

export type Scenario = {
  name: string;
  a: Agreement;
  rec: SignatureRecord;
  ex: Execution;
  opts: { copyUrl?: string; attached?: boolean; attachmentName?: string; nextStep?: { what: string; when: string } };
};

/** Every state the email can be in, for one brand. */
export function scenarios(brand: BrandKey): Scenario[] {
  const a = agreementFor(brand);
  const owner = record(a, "owner", "Michael Williams");
  const mgr = record(a, "mgr", "Jake Lee");
  const url = "https://example.com/client/michael-williams/management-agreement";
  const three = agreementFor(brand, {
    parties: [
      { id: "owner", legalName: "Michael Williams", role: "Owner" },
      { id: "co", legalName: "Dana Williams", role: "Owner" },
      { id: "mgr", legalName: "Jake Lee", role: "Manager" },
    ],
  });
  const threeOwner = record(three, "owner", "Michael Williams");
  const longNames = agreementFor(brand, {
    subtitle: "12345 Extraordinarily Long Mountain Boulevard, Unit 204B, Colorado Springs, Colorado",
    parties: [
      { id: "owner", legalName: "Alexandra Wilhelmina Featherstonehaugh-Montgomery", role: "Owner" },
      { id: "mgr", legalName: "Jake Lee", role: "Manager" },
    ],
  });
  const longOwner = record(longNames, "owner", "Alexandra Wilhelmina Featherstonehaugh-Montgomery");
  const lease = agreementFor(brand, {
    title: "New Jersey Residential Lease",
    subtitle: "243 Lincoln Avenue, Unit 2, Cliffside Park, New Jersey 07010",
    timezone: "America/New_York",
    parties: [
      { id: "tenant", legalName: "Alexander Tenant", role: "Tenant" },
      { id: "landlord", legalName: "Jamarber Dobrushi", role: "Landlord" },
    ],
    letter: {
      fromName: "Jake Lee", fromRole: "Manager", headline: "h", paragraphs: [], ifWrong: "Reply.",
      summary: [
        { label: "The apartment", value: "243 Lincoln Avenue, Unit 2" },
        { label: "Rent, all in", value: "$3,995 a month" },
        { label: "Made up of", value: "$3,695 rent, $300 parking" },
        { label: "Due", value: "The 1st of each month" },
        { label: "Deposit, refundable", value: "$3,695 at signing" },
        { label: "Late after the 1st", value: "$250" },
      ],
    },
  });
  const tenant = record(lease, "tenant", "Alexander Tenant");
  return [
    { name: "lease-waiting", a: lease, rec: tenant, ex: { signatures: { tenant } },
      opts: { copyUrl: "https://example.com/lease/token", attached: true, attachmentName: "243-lincoln-avenue-unit-2-draft.pdf" } },
    { name: "complete-attached-next", a, rec: owner, ex: { signatures: { owner, mgr } },
      opts: { copyUrl: url, attached: true, attachmentName: "309-cranbrook-circle-executed.pdf",
        nextStep: { what: "Cranbrook goes live", when: "Friday, November 13, 2026" } } },
    { name: "complete-no-attachment", a, rec: owner, ex: { signatures: { owner, mgr } }, opts: { copyUrl: url } },
    { name: "complete-no-button", a, rec: owner, ex: { signatures: { owner, mgr } }, opts: {} },
    { name: "waiting-one", a, rec: owner, ex: { signatures: { owner } }, opts: { copyUrl: url, attached: true, attachmentName: "309-cranbrook-circle-draft.pdf" } },
    { name: "waiting-two", a: three, rec: threeOwner, ex: { signatures: { owner: threeOwner } }, opts: { copyUrl: url } },
    { name: "stress-long-names", a: longNames, rec: longOwner, ex: { signatures: { owner: longOwner } }, opts: { copyUrl: url, attached: true, attachmentName: "12345-extraordinarily-long-mountain-boulevard-unit-204b-colorado-springs-colorado-draft.pdf" } },
  ];
}
