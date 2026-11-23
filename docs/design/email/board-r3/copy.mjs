// The words every new option shares, derived from the model so no option can drift on a fact.
// Subject: the core's searchable convention (Jake, 2026-11-14), news with the name.
// Preheader: the next fact, never the subject again.
import { joinNames, keep, parties, splitWhen } from "./r3lib.mjs";

const day = (w) => splitWhen(w).day;

export function signerWords(m) {
  const all = parties(m);
  const signed = all.filter((p) => p.signed).length;
  const complete = m.waiting.length === 0;
  const left = joinNames(m.waiting.map((w) => w.name));
  const w = splitWhen(m.signedWhen);
  return {
    complete,
    all,
    signedCount: signed,
    total: all.length,
    left,
    when: w,
    subject: complete
      ? `${m.subjectPlace} | ${m.docTitle} | Fully signed, ${day(m.signedWhen)}`
      : `${m.subjectPlace} | ${m.docTitle} | Signed by ${m.signedBy}, ${day(m.signedWhen)}`,
    preheader: complete
      ? `The signed PDF is attached. ${m.nextStep ? `${m.nextStep.what} is ${m.nextStep.when}.` : ""}`.trim()
      : `${left} still needs to sign. You get the fully signed lease as a PDF from this address when ${m.waiting.length > 1 ? "they do" : "she does"}.`,
    whatLeft: complete ? "" : `${left} still needs to sign.`,
    promise: complete ? "" : `When ${m.waiting.length > 1 ? "they do" : "she does"}, every signer gets the fully signed lease as a PDF from this address.`,
    stamp: keep(m.signedWhen),
  };
}

export function operatorWords(m) {
  const complete = m.waiting.length === 0;
  const left = joinNames(m.waiting.map((w) => w.name));
  return {
    complete,
    left,
    when: splitWhen(m.signedWhen),
    subject: `${m.subjectPlace} | ${m.docTitle} | ${m.signedBy} signed${complete ? ", fully signed" : ""}, ${day(m.signedWhen)}`,
    preheader: complete
      ? `All ${parties(m).length} signers are done. The signed PDF went to each of them and is attached.`
      : `${left} has not signed yet.`,
  };
}

export function receiptWords(r, b) {
  return {
    subject: `${b.name} | Your inquiry | Received ${day(r.sentWhen)}`,
    preheader: `${r.next[0]} Reference ${r.reference.value}.`,
    when: splitWhen(r.sentWhen),
  };
}

/** Breaks Gmail's auto-linking of an address we print as a fact (the plain text keeps it whole). */
export const neutral = (html) =>
  html.replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+)\.([a-z]{2,})/g, "$1@&zwnj;<wbr>$2&zwnj;.$3");
