// Option 0: exactly what goes out today, rendered by the live code paths.
// 1 and 2: the Specimen (src/lib/signer-email-core.ts, this worktree) fed the model that
//   xenia-direct-booking's bluebill-lease/notify.ts builds, with its subject override.
// 3: the brand alert notify.ts writes inline (it does not use the core).
// 4: the Owner Hosted Homes guest receipt, src/lib/email/stay-receipt.ts, on the web-kit email
//    frame (vendored here from web-kit origin/main). Built but switched off in production.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { composeConfirmation } from "../vendor/web-kit-email.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const core = await import(pathToFileURL(path.resolve(HERE, "../../../../../src/lib/signer-email-core.ts")).href);

const PALETTE = core.makePalette({ paper: "#ffffff", ground: "#f7f7f7", ink: "#1a1a18", muted: "#4c4c4c", rule: "#eaeaea", band: "#1a1a18", bandText: "#ffffff", accent: "#8a5e19" });
const FACES = { serif: "Georgia,'Times New Roman',serif", sans: "Helvetica,Arial,sans-serif", wordmark: "Georgia,'Times New Roman',serif" };
const LOGO = { src: "https://zx1mullwqhmgdjje.public.blob.vercel-storage.com/brand/ohh/letterhead-header-3x-4sntivRqRo3v46DYwaN0wxDRiYioXG.png", width: 900, height: 75, alt: "Owner Hosted Homes" };
const LABEL = "Lease, 11 Bluebill Ave Unit 201";
const esc = core.esc;

function lease(m) {
  const built = core.renderSignerEmail({
    palette: PALETTE, faces: FACES, brandName: "Owner Hosted Homes", logo: LOGO,
    docTitle: "Residential Lease", subjectPlace: "11 Bluebill Ave Unit 201", place: m.place,
    signedBy: m.signedBy, signedRole: m.signedRole, signedWhen: m.signedWhen,
    others: m.others, waiting: m.waiting.map((w) => ({ name: w.name })),
    completeDetail: m.attached ? "Every party has signed. The fully signed lease is attached." : "Every party has signed. Open your copy to save the PDF.",
    completion: m.completion, button: m.button, note: m.note,
    terms: [
      { label: "Property", value: "11 Bluebill Avenue, Unit 201, Naples, Florida 34108" },
      { label: "Lease number", value: "BB201-2026-12-DONOVAN" },
      { label: "Landlord", value: "Jamarber (Arber) Dobrushi" },
      { label: "Tenants", value: ["Michael Donovan", "Victoria Donovan"] },
    ],
    fineprint: [`Reference ${m.fingerprint}.`], bookUrl: "", legalLine: "Monthly stays, 30 nights or more. ownerhostedhomes.com",
  });
  const names = m.waiting.map((w) => w.name);
  return { ...built, subject: names.length === 0 ? `Signed: ${LABEL}` : `Signed, waiting on ${names.join(" and ")}: ${LABEL}` };
}

export const signer = (m) => lease(m);

export function operator(m) {
  const left = m.waiting.map((w) => w.name);
  const html = `<div style="font-family:Georgia,serif;max-width:560px;padding:20px;color:#2a2d31">
        <p style="font-size:18px;margin:0 0 10px">${esc(m.signedBy)} signed the lease.</p>
        <p style="margin:0 0 8px">${esc(m.signedWhen)} (Naples time).</p>
        <p style="margin:0 0 8px">${left.length ? `Still to sign: ${esc(left.join(", "))}.` : "Everyone has now signed."}</p>
        <p style="margin:0;font-size:13px;color:#55585e">Agreement ${esc(m.agreementId)}. Reference ${esc(m.fingerprint)}.</p></div>`;
  const text = `${m.signedBy} signed the lease.\n${m.signedWhen} (Naples time).\n${left.length ? `Still to sign: ${left.join(", ")}.` : "Everyone has now signed."}\nAgreement ${m.agreementId}. Reference ${m.fingerprint}.`;
  return { subject: `${m.signedBy} signed: ${LABEL}`, html, text };
}

const stayBrand = {
  business: "Owner Hosted Homes",
  config: {
    siteUrl: "https://ownerhostedhomes.com", wordmark: "Owner Hosted Homes", tagline: "Homes booked direct with the team that runs them.",
    displayFont: "Newsreader,'Iowan Old Style',Charter,Georgia,serif",
    bodyFont: "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif",
    ink: "#33352d", ground: "#ffffff", brand: "#8f5330", accent: "#55704a", people: [],
    letterhead: { textHeader: true, paper: "#ffffff", surround: "#f7f4ea", rule: "#8f5330", line: "#e8e4d8", soft: "#5e6055", link: "#76431f", mastheadContact: false },
  },
  person: { name: "Owner Hosted Homes", title: "Guest desk", email: "ops@xenia.host" },
  from: "Owner Hosted by Xenia <noreply@xenia.host>",
  replyTo: "ops@xenia.host",
  fontsHref: "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Instrument+Sans:wght@400;500;600;700&display=swap",
  legalLine: "Owner Hosted Homes by Xenia",
  specimen: {
    deep: "#8f5330", gold: "#55704a",
    logo: { src: "https://ownerhostedhomes.com/brand/xenia-mark.png", width: 384, height: 349, alt: "Xenia", markOnly: true },
    faces: { serif: "Newsreader,'Iowan Old Style',Charter,Georgia,serif", sans: "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif", wordmark: "Newsreader,'Iowan Old Style',Charter,Georgia,serif" },
  },
};

export function receipt(r) {
  const get = (l) => r.received.find((x) => x.label === l)?.value;
  const msg = composeConfirmation({
    brand: stayBrand, to: get("Email"), kind: "Inquiry received", recipientName: r.recipient,
    date: new Date("2026-11-23T21:12:00Z"), timeZone: "America/New_York",
    headline: "Your inquiry is in.",
    lead: `We received your inquiry about 11 Bluebill Avenue, Unit 201, Naples, Florida.`,
    sheetTitle: "Your inquiry",
    received: [["Dates", get("Dates")], ["Guests", get("Guests")]],
    reference: r.reference.value,
    nextIntro: "What happens next:",
    next: r.next,
    replyLine: "Reply to this email and the guest desk answers it.",
  });
  return { subject: msg.subject, html: msg.html, text: msg.text };
}
