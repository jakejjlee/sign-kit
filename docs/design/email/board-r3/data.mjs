// Round 3 email board: brand tokens and the real content of the four surfaces.
//
// Sources (xenia-direct-booking origin/main unless named):
// - the lease, parties, lease number, landlord's printed name, signature block (clause 24 order:
//   Tenant Michael, Tenant Victoria, Landlord (owner of record)), the term (check-in Wednesday,
//   December 9, 2026 from 4:00 PM, checkout Saturday, January 9, 2027 by 12:00 PM, 31 nights):
//   src/lib/bluebill-lease/agreements.ts and content/donovan-2026-12.ts
// - the document fingerprint a5c51f5d787a70d0: leaseFingerprint() over the real agreement
//   (sha256 of the parties and the lease html), first 16 of 64; the PDF prints the first 32
// - signing times: Jake's brief for this round (2026-11-23)
// - live email wording, palette and logo: src/lib/bluebill-lease/notify.ts
// - inquiry receipt wording and form labels: src/lib/email/stay-receipt.ts, src/content/copy.ts
// - OHH faces Literata and Jost, gold #8a5e19: ~/Claude/_tools/letterhead/brands/ohh/brand.json
// - OHH palette for the new options (paper, ground, ink, deep green): the round 3 brief
// - the see-through logo: the real ohh-lockup.svg rasterized with no redraw (assets/)
//
// SAMPLE, never real: the inquirer's answers on the receipt (name, email, dates, guests, message,
// time sent and reference). Signing tokens in button links are placeholders.
import { mix, readable } from "./r3lib.mjs";

const fontsHref = (fams) => `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
const SCRIPT = "'Great Vibes','Snell Roundhand','Apple Chancery',Georgia,serif";

/** Every brand reduces to the same token set, so one renderer serves all five. */
function brand(o) {
  const muted = readable(o.paper, o.muted, o.ink);
  const mutedOnGround = readable(o.ground, o.muted, o.ink);
  const onDeep = readable(o.deep, "#ffffff", o.paper);
  const link = readable(o.paper, o.gold, o.deep, o.ink);
  const tint = mix(o.gold, o.paper, 0.12);
  return { ...o, muted, mutedOnGround, onDeep, link, tint, mutedOnTint: readable(tint, o.muted, o.ink), goldText: readable(o.paper, o.gold, o.deep) };
}

export const BRANDS = {
  ohh: brand({
    key: "ohh",
    name: "Owner Hosted Homes",
    paper: "#fdfaf4", ground: "#efe6d6", ink: "#15211d", muted: "#4b5650", rule: "#e2d8c5", deep: "#21463d", gold: "#8a5e19",
    faces: { serif: "Literata,'Iowan Old Style',Charter,Georgia,serif", sans: "Jost,'Helvetica Neue',Helvetica,Arial,sans-serif", script: SCRIPT, mono: MONO },
    fontsHref: fontsHref(["family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600", "family=Jost:wght@400;500;600", "family=Great+Vibes"]),
    // The real lockup, rasterized see-through from ohh-lockup.svg. Proposed hosted address: this
    // file is not uploaded yet (an upload is Jake's call); the board points it at assets/.
    logo: { src: "https://ownerhostedhomes.com/brand/email/ohh-lockup-ink@3x.png", width: 957, height: 62, alt: "Owner Hosted Homes" },
    site: "https://ownerhostedhomes.com", siteLabel: "ownerhostedhomes.com",
    legal: "Owner Hosted Homes by Xenia",
  }),
  ps: brand({
    key: "ps", name: "Palisade Stays",
    paper: "#ffffff", ground: "#f4f3f1", ink: "#2a2d31", muted: "#55585e", rule: "#d5cdc3", deep: "#2a2d31", gold: "#b5975a",
    faces: { serif: "'EB Garamond',Garamond,'Iowan Old Style',Charter,Georgia,serif", sans: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif", script: SCRIPT, mono: MONO },
    fontsHref: fontsHref(["family=EB+Garamond:wght@400;500;600", "family=Instrument+Sans:wght@400;500;600", "family=Great+Vibes"]),
    site: "https://palisadestays.com", siteLabel: "palisadestays.com", legal: "Palisade Stays",
  }),
  sms: brand({
    key: "sms", name: "Sun Mountain Stays",
    paper: "#fbf8f0", ground: "#efe9db", ink: "#0d2318", muted: "#3a464e", rule: "#e2ddd1", deep: "#0d2318", gold: "#c8912f",
    faces: { serif: "Newsreader,'Iowan Old Style',Charter,Georgia,serif", sans: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif", script: SCRIPT, mono: MONO },
    fontsHref: fontsHref(["family=Newsreader:opsz,wght@6..72,400;6..72,500", "family=Instrument+Sans:wght@400;500;600", "family=Great+Vibes"]),
    site: "https://sunmountainstays.com", siteLabel: "sunmountainstays.com", legal: "Sun Mountain Stays LLC",
  }),
  sls: brand({
    key: "sls", name: "Streamlined Stays",
    paper: "#fbfaf6", ground: "#efe9de", ink: "#26221d", muted: "#6a635b", rule: "#e6dfd1", deep: "#26221d", gold: "#825d0d",
    faces: { serif: "Sentient,'Iowan Old Style',Charter,Georgia,serif", sans: "Switzer,'Helvetica Neue',Helvetica,Arial,sans-serif", script: SCRIPT, mono: MONO },
    site: "", siteLabel: "", legal: "Streamlined Stays",
  }),
  xenia: brand({
    key: "xenia", name: "Xenia",
    paper: "#fffef9", ground: "#efebe0", ink: "#1f1d19", muted: "#6a655e", rule: "#e0dac9", deep: "#1f1d19", gold: "#a8823a",
    faces: { serif: "Newsreader,'Iowan Old Style',Charter,Georgia,serif", sans: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif", script: SCRIPT, mono: MONO },
    fontsHref: fontsHref(["family=Newsreader:opsz,wght@6..72,400;6..72,500", "family=Instrument+Sans:wght@400;500;600", "family=Great+Vibes"]),
    site: "https://xenia.host", siteLabel: "xenia.host", legal: "Xenia LLC",
  }),
};

/* ------------------------------------------------------------ the lease -- */
const ARBER = "Jamarber (Arber) Dobrushi";
const LEASE = {
  docTitle: "Residential Lease",
  subjectPlace: "11 Bluebill Ave Unit 201",
  place: ["11 Bluebill Avenue, Unit 201", "Naples, Florida 34108"],
  terms: [
    { label: "Property", value: "11 Bluebill Avenue, Unit 201, Naples, Florida 34108" },
    { label: "Lease number", value: "BB201-2026-12-DONOVAN" },
    { label: "Term", value: "December 9, 2026 to January 9, 2027, 31 nights" },
    { label: "Landlord", value: ARBER },
    { label: "Tenants", value: ["Michael Donovan", "Victoria Donovan"] },
  ],
  // Extensions the new directions read; the core ignores them.
  leaseNo: "BB201-2026-12-DONOVAN",
  fingerprint: "a5c51f5d787a70d0",
  agreementId: "bluebill-201-donovan-2026-12",
  order: ["Michael Donovan", "Victoria Donovan", ARBER],
  pdfRole: { Tenant: "Tenant", Landlord: "Landlord (owner of record)" },
  checkIn: { what: "Check-in", when: "Wednesday, December 9, 2026, from 4:00 PM" },
  checkout: "Saturday, January 9, 2027, by 12:00 PM",
  attachmentName: "Lease-11-Bluebill-Ave-Unit-201-Donovan-signed.pdf",
  completion: { title: "We email you when it is complete", detail: "You get the fully signed lease as a PDF, from this address." },
  bookUrl: "",
};
const T_ARBER = "November 23, 2026, 9:33 AM EST";
const T_MICHAEL = "November 23, 2026, 2:00 PM EST";
const T_VICTORIA = "November 23, 2026, 2:02 PM EST";
const URL = (who) => `https://ownerhostedhomes.com/homes/bluebill/lease/${who}-sample`;

/** 1) Michael signed at 2:00 PM; Victoria has not. */
export const waiting = {
  ...LEASE,
  recipient: "Michael Donovan",
  signedBy: "Michael Donovan", signedRole: "Tenant", signedWhen: T_MICHAEL,
  others: [{ name: ARBER, role: "Landlord", when: T_ARBER }],
  waiting: [{ name: "Victoria Donovan", role: "Tenant" }],
  completeDetail: "",
  button: { url: URL("michael") },
  note: [],
  fineprint: [`Reference ${LEASE.fingerprint}.`],
};

/** 2) Victoria signed at 2:02 PM: everyone's copy, the signed PDF attached (Victoria's shown). */
export const complete = {
  ...LEASE,
  recipient: "Victoria Donovan",
  signedBy: "Victoria Donovan", signedRole: "Tenant", signedWhen: T_VICTORIA,
  others: [
    { name: ARBER, role: "Landlord", when: T_ARBER },
    { name: "Michael Donovan", role: "Tenant", when: T_MICHAEL },
  ],
  waiting: [],
  completeDetail: "Every party has signed. The fully signed lease is attached.",
  nextStep: LEASE.checkIn,
  button: { url: URL("victoria") },
  note: [`${LEASE.attachmentName} is attached.`],
  fineprint: [`Reference ${LEASE.fingerprint}.`],
  attached: true,
};

/** 3) The business inbox: Victoria signed, everyone has signed. */
export const operator = {
  ...LEASE,
  place: "11 Bluebill Avenue, Unit 201, Naples, Florida 34108",
  signedBy: "Victoria Donovan", signedRole: "Tenant", signedWhen: T_VICTORIA,
  others: complete.others,
  waiting: [],
  record: [
    { label: "Signed by", value: "Victoria Donovan, Tenant" },
    { label: "When", value: T_VICTORIA },
    { label: "Lease number", value: LEASE.leaseNo },
    { label: "Agreement", value: LEASE.agreementId },
    { label: "Fingerprint", value: LEASE.fingerprint },
  ],
  button: { url: URL("landlord"), label: "Open the signed lease" },
  note: ["The signed PDF went to all three signers and is attached here."],
  legalLine: "Owner Hosted Homes by Xenia",
};

/** 4) An inquiry receipt. Every answer below is a SAMPLE written for the board. */
export const receipt = {
  recipient: "Dana Whitfield",
  home: "11 Bluebill Avenue, Unit 201, Naples, Florida",
  sentWhen: "November 23, 2026, 4:12 PM EST",
  reference: { label: "Reference", value: "INQ-261123-K7Q4M" },
  received: [
    { label: "Home", value: "11 Bluebill Avenue, Unit 201, Naples, Florida" },
    { label: "Dates", value: "February 1, 2027 to March 3, 2027 (30 nights)" },
    { label: "Guests", value: "2" },
    { label: "Your name", value: "Dana Whitfield" },
    { label: "Email", value: "dana.whitfield@example.com" },
    { label: "Mobile", value: "not given" },
    { label: "Anything we should know", value: "A travel nurse contract in Naples. We can move the dates a few days either way. No pets." },
  ],
  next: ["We reply to this address by email with the monthly rate.", "This inquiry books nothing and charges nothing."],
};
