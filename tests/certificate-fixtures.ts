import type { Agreement, Brand } from "../src/content/types";
import { makeRecord, type Execution, type SignatureRecord } from "../src/lib/execution";

/**
 * The five businesses the Certificate has to look right on, with their real tokens, faces and
 * see-through logos (every logo below is the business's own file, already published on its site),
 * and one document each, so the proofs show all four jobs per brand.
 *
 * REAL: the Owner Hosted Homes Donovan lease (parties, clause 24 signature order, lease number,
 * term, signing times, document ID a5c51f5d787a70d0) and the Sun Mountain Cranbrook agreement
 * (Michael Williams signed November 11, 2026, 6:59 PM MST; 10% of Net Revenue, no onboarding fee).
 * SAMPLE, never real: the Palisade tenant, the Streamlined and Xenia documents, Jake's Cranbrook
 * signing time, and every inquiry receipt's answers (Dana Whitfield is fictional).
 */

const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
const fonts = (fams: string[]) => `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;

export type ProofBrand = { key: string; label: string; brand: Brand; timezone: string; legal: string };

export const PROOF_BRANDS: ProofBrand[] = [
  {
    key: "ohh",
    label: "Owner Hosted Homes",
    timezone: "America/New_York",
    legal: "Owner Hosted Homes by Xenia",
    brand: {
      name: "Owner Hosted Homes", role: "monthly stays, 30 nights or more", phone: "", phoneHref: "",
      email: "hello@ownerhostedhomes.com", initials: "OH",
      tokens: { paper: "#fdfaf4", ground: "#efe6d6", ink: "#15211d", muted: "#4b5650", rule: "#e2d8c5", accent: "#8a5e19", accentText: "#21463d" },
      faces: { serif: "Literata,'Iowan Old Style',Charter,Georgia,serif", sans: "Jost,'Helvetica Neue',Helvetica,Arial,sans-serif", wordmark: "Literata,'Iowan Old Style',Georgia,serif", mono: MONO },
      fontsHref: fonts(["family=Literata:opsz,wght@7..72,400;7..72,500", "family=Jost:wght@400;500;600"]),
      logo: { src: "https://ownerhostedhomes.com/brand/email/ohh-lockup-ink@3x.png", width: 957, height: 62, alt: "Owner Hosted Homes" },
      bookUrl: "",
    },
  },
  {
    key: "palisade",
    label: "Palisade Stays",
    timezone: "America/New_York",
    legal: "Palisade Stays",
    brand: {
      name: "Palisade Stays", role: "managing 243 Lincoln for the owner", phone: "", phoneHref: "",
      email: "hello@palisadestays.com", initials: "PS",
      tokens: { paper: "#ffffff", ground: "#f4f3f1", ink: "#2a2d31", muted: "#55585e", rule: "#d5cdc3", accent: "#b5975a", accentText: "#2a2d31" },
      faces: { serif: "'EB Garamond',Garamond,'Iowan Old Style',Charter,Georgia,serif", sans: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif", wordmark: "'EB Garamond',Garamond,Georgia,serif", mono: MONO },
      fontsHref: fonts(["family=EB+Garamond:wght@400;500;600", "family=Instrument+Sans:wght@400;500;600"]),
      logo: { src: "https://palisadestays.com/assets/ps-logo-horizontal.png", width: 957, height: 236, alt: "Palisade Stays" },
      // Palisade shows no booking link in any email (Jake, 2026-11-14).
      bookUrl: "",
    },
  },
  {
    key: "sun-mountain",
    label: "Sun Mountain Stays",
    timezone: "America/Denver",
    legal: "Sun Mountain Stays LLC",
    brand: {
      name: "Sun Mountain Stays", role: "managing it for the owner", phone: "", phoneHref: "",
      email: "hello@sunmountainstays.com", initials: "SM",
      tokens: { paper: "#fbf8f0", ground: "#efe9db", ink: "#0d2318", muted: "#3a464e", rule: "#e2ddd1", accent: "#c8912f", accentText: "#0d2318" },
      faces: { serif: "Newsreader,'Iowan Old Style',Charter,Georgia,serif", sans: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif", wordmark: "Newsreader,'Iowan Old Style',Georgia,serif", mono: MONO },
      fontsHref: fonts(["family=Newsreader:opsz,wght@6..72,400;6..72,500", "family=Instrument+Sans:wght@400;500;600"]),
      logo: { src: "https://sunmountainstays.com/brand/sun-mountain-mark-256.png", width: 256, height: 256, alt: "Sun Mountain Stays", markOnly: true },
    },
  },
  {
    key: "streamlined",
    label: "Streamlined Stays",
    timezone: "America/Denver",
    legal: "Streamlined Stays",
    brand: {
      name: "Streamlined Stays", role: "managing it for the owner", phone: "", phoneHref: "",
      email: "jake@streamlinedstr.com", initials: "SS",
      tokens: { paper: "#fbfaf6", ground: "#efe9de", ink: "#26221d", muted: "#6a635b", rule: "#e6dfd1", accent: "#825d0d", accentText: "#26221d" },
      faces: { serif: "Sentient,'Iowan Old Style',Charter,Georgia,serif", sans: "Switzer,'Helvetica Neue',Helvetica,Arial,sans-serif", wordmark: "Sentient,'Iowan Old Style',Georgia,serif", mono: MONO },
      logo: { src: "https://streamlinedstr.com/logo/logo-main.png", width: 2400, height: 682, alt: "Streamlined Stays", displayWidth: 220 },
    },
  },
  {
    key: "xenia",
    label: "Xenia",
    timezone: "America/New_York",
    legal: "Xenia LLC",
    brand: {
      name: "Xenia", role: "remote operations for the owner", phone: "", phoneHref: "",
      email: "jake@xenia.host", initials: "X",
      tokens: { paper: "#fffef9", ground: "#efebe0", ink: "#1f1d19", muted: "#6a655e", rule: "#e0dac9", accent: "#a8823a", accentText: "#1f1d19" },
      faces: { serif: "Newsreader,'Iowan Old Style',Charter,Georgia,serif", sans: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif", wordmark: "Newsreader,'Iowan Old Style',Georgia,serif", mono: MONO },
      fontsHref: fonts(["family=Newsreader:opsz,wght@6..72,400;6..72,500", "family=Instrument+Sans:wght@400;500;600"]),
      logo: { src: "https://xenia.host/brand/xenia-horizontal.png", width: 660, height: 139, alt: "Xenia", displayWidth: 240 },
    },
  },
];

function base(pb: ProofBrand, over: Partial<Agreement>): Agreement {
  return {
    id: `proof-${pb.key}`,
    kind: "lease",
    version: "2026-11-01",
    timezone: pb.timezone,
    brand: pb.brand,
    title: "Management Agreement",
    subtitle: "",
    parties: [],
    letter: { fromName: "Jake Lee", fromRole: "Manager", headline: "h", paragraphs: [], summary: [], ifWrong: "Reply." },
    body: [], attachments: [], signaturePoints: [{ id: "main", title: "Agreement" }],
    money: { lines: [], paidTo: pb.brand.name, method: "ACH" },
    esignAct: "the Uniform Electronic Transactions Act",
    ...over,
  };
}

type Sig = { party: string; name: string; email: string; at: string };

/** One document per brand: the agreement, who signs in what order, and when. */
function documentFor(pb: ProofBrand): { a: Agreement; fingerprint: string; sigs: Sig[]; url: string } {
  switch (pb.key) {
    case "ohh":
      return {
        a: base(pb, {
          title: "Residential Lease",
          subtitle: "11 Bluebill Avenue, Unit 201, Naples, Florida 34108",
          parties: [
            { id: "michael", legalName: "Michael Donovan", role: "Tenant" },
            { id: "victoria", legalName: "Victoria Donovan", role: "Tenant" },
            { id: "owner", legalName: "Jamarber (Arber) Dobrushi", role: "Landlord (owner of record)" },
          ],
          letter: {
            fromName: "Jake Lee", fromRole: "Manager", headline: "h", paragraphs: [], ifWrong: "Reply.",
            summary: [
              { label: "Lease number", value: "BB201-2026-12-DONOVAN" },
              { label: "Term", value: "December 9, 2026 to January 9, 2027, 31 nights" },
              { label: "Check-in", value: "Wednesday, December 9, 2026, from 4:00 PM EST" },
              { label: "Checkout", value: "Saturday, January 9, 2027, by 12:00 PM EST" },
            ],
          },
        }),
        fingerprint: "a5c51f5d787a70d0",
        url: "https://ownerhostedhomes.com/homes/bluebill/lease/sample-token",
        sigs: [
          { party: "owner", name: "Jamarber (Arber) Dobrushi", email: "", at: "2026-11-23T14:33:35Z" },
          { party: "michael", name: "Michael Donovan", email: "michael.donovan@helixhs.com", at: "2026-11-23T19:00:15Z" },
          { party: "victoria", name: "Victoria Donovan", email: "donovan1victoria@gmail.com", at: "2026-11-23T19:02:29Z" },
        ],
      };
    case "palisade":
      return {
        a: base(pb, {
          title: "New Jersey Residential Lease",
          subtitle: "243 Lincoln Avenue, Unit 2, Cliffside Park, New Jersey 07010",
          parties: [
            { id: "tenant", legalName: "Alexander Tenant", role: "Tenant" },
            { id: "landlord", legalName: "Jamarber Dobrushi", role: "Landlord" },
          ],
          letter: {
            fromName: "Jake Lee", fromRole: "Manager", headline: "h", paragraphs: [], ifWrong: "Reply.",
            summary: [
              { label: "Rent, all in", value: "$3,995 a month" },
              { label: "Made up of", value: "$3,695 rent, $300 parking" },
              { label: "Due", value: "The 1st of each month" },
              { label: "Deposit, refundable", value: "$3,695 at signing" },
            ],
          },
        }),
        fingerprint: "7c1e94b20d5a3f68",
        url: "https://palisadestays.com/lease/sample-token",
        sigs: [
          { party: "tenant", name: "Alexander Tenant", email: "tenant@example.com", at: "2026-11-20T15:41:00Z" },
          { party: "landlord", name: "Jamarber Dobrushi", email: "", at: "2026-11-21T14:05:00Z" },
        ],
      };
    case "sun-mountain":
      return {
        a: base(pb, {
          title: "Management Agreement",
          subtitle: "309 Cranbrook Circle, Colorado Springs, Colorado",
          parties: [
            { id: "owner", legalName: "Michael Williams", role: "Owner" },
            { id: "mgr", legalName: "Jake Lee", role: "Manager" },
          ],
          letter: {
            fromName: "Jake Lee", fromRole: "Manager", headline: "h", paragraphs: [], ifWrong: "Reply.",
            summary: [
              { label: "Management fee", value: "10% of Net Revenue" },
              { label: "Onboarding fee", value: "None" },
              { label: "Notice to end", value: "30 days, after the first 90 days" },
            ],
          },
        }),
        fingerprint: "3e9b0c4417fa52d1",
        url: "https://sunmountainstays.com/client/michael-williams/management-agreement",
        sigs: [
          { party: "owner", name: "Michael Williams", email: "owner@example.com", at: "2026-11-12T01:59:12Z" },
          { party: "mgr", name: "Jake Lee", email: "", at: "2026-11-12T02:31:00Z" },
        ],
      };
    case "streamlined":
      return {
        a: base(pb, {
          title: "Management Agreement",
          subtitle: "1450 Sample Ridge Road, Manitou Springs, Colorado",
          parties: [
            { id: "owner", legalName: "Sample Owner", role: "Owner" },
            { id: "mgr", legalName: "Jake Lee", role: "Manager" },
          ],
          letter: {
            fromName: "Jake Lee", fromRole: "Manager", headline: "h", paragraphs: [], ifWrong: "Reply.",
            summary: [
              { label: "Management fee", value: "20% of Net Revenue" },
              { label: "Start date", value: "December 1, 2026" },
            ],
          },
        }),
        fingerprint: "b0d2e61a9c7f4835",
        url: "https://streamlinedstr.com/client/sample/management-agreement",
        sigs: [
          { party: "owner", name: "Sample Owner", email: "owner@example.com", at: "2026-11-23T17:10:00Z" },
          { party: "mgr", name: "Jake Lee", email: "", at: "2026-11-23T18:45:00Z" },
        ],
      };
    default:
      return {
        a: base(pb, {
          title: "Operations Agreement",
          subtitle: "58 Sample Street, Columbus, Ohio",
          parties: [
            { id: "owner", legalName: "Sample Owner", role: "Owner" },
            { id: "mgr", legalName: "Jake Lee", role: "Xenia" },
          ],
          letter: {
            fromName: "Jake Lee", fromRole: "Xenia", headline: "h", paragraphs: [], ifWrong: "Reply.",
            summary: [
              { label: "Service", value: "Remote operations desk" },
              { label: "Start date", value: "December 1, 2026" },
            ],
          },
        }),
        fingerprint: "e47a19c3b5d20f86",
        url: "https://xenia.host/client/sample/operations-agreement",
        sigs: [
          { party: "owner", name: "Sample Owner", email: "owner@example.com", at: "2026-11-23T16:20:00Z" },
          { party: "mgr", name: "Jake Lee", email: "", at: "2026-11-23T16:52:00Z" },
        ],
      };
  }
}

export type ProofSigning = {
  a: Agreement;
  url: string;
  /** Records in signing order. */
  recs: SignatureRecord[];
  /** The record and execution when the second-to-last party signs (someone still waits). */
  waiting: { rec: SignatureRecord; ex: Execution };
  /** The record and execution when the last party signs. */
  complete: { rec: SignatureRecord; ex: Execution };
};

export function signingFor(pb: ProofBrand): ProofSigning {
  const d = documentFor(pb);
  const recs = d.sigs.map((s) =>
    makeRecord(d.a, { party: s.party, legalName: s.name, typed: s.name, email: s.email }, { fingerprint: d.fingerprint, ip: null, userAgent: null }, new Date(s.at))
  );
  const upTo = (n: number): Execution => ({ signatures: Object.fromEntries(recs.slice(0, n).map((r) => [r.party, r])) });
  const last = recs.length - 1;
  return {
    a: d.a,
    url: d.url,
    recs,
    waiting: { rec: recs[last - 1] as SignatureRecord, ex: upTo(last) },
    complete: { rec: recs[last] as SignatureRecord, ex: upTo(recs.length) },
  };
}

/** A SAMPLE inquiry, the same fictional person for every brand. */
export const SAMPLE_INQUIRY = {
  name: "Dana Whitfield",
  receivedWhen: "November 23, 2026, 4:12 PM EST",
  reference: "INQ-261123-K7Q4M",
  received: [
    { label: "Dates", value: "February 1, 2027 to March 3, 2027 (30 nights)" },
    { label: "Guests", value: "2" },
    { label: "Your name", value: "Dana Whitfield" },
    { label: "Email", value: "dana.whitfield@example.com" },
    { label: "Mobile", value: "not given" },
    { label: "Anything we should know", value: "A travel nurse contract nearby. We can move the dates a few days either way. No pets." },
  ],
};
