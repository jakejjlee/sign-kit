# sign-kit design record

Written 28 August 2026, at the end of the Throughline pass that created this kit.
This file is the project's own memory of what its brand is and why. Nothing here
should need to be recalled from a global memory or re-argued in a later session.

## The direction: the letter and the file

Chosen over three alternatives at Gate 1. Board:
`docs/design/2026-08-27-direction-board.html`

A named person speaks first, in plain words, with a number that can be called,
and the instrument appears underneath in a different face, quieter and denser,
looking like the legal thing it is.

**Why the others lost.** A, the instrument, and C, the register, both assumed the
signer's problem is comprehension of the document. It is not. A signer is a
stranger opening an unexpected private link on a phone and being asked to sign
something binding, which is the exact shape of a phishing attempt. The first
problem is belief. A solves legibility with typography and C solves it with
evidence, and neither answers who sent this in the first two seconds. B leads
with a person, the six facts and a callable number, and only then shows the
instrument, so nothing about A's craft is lost: B's file layer can be set exactly
like A.

## The rules that follow, and are not negotiable

1) **Two layers, typographically distinct.** The letter is set in the interface
   face, the file in the document face. A signer must never be unsure whether
   they are reading our words or the contract's, because only one of them binds
   them.

2) **The statutory mass is never hidden.** No "show more", no accordion, no
   "view full terms". Twelve pages of state-required disclosure bound into the
   rental of one apartment is a fact about the document, not a detail, and a
   signer should not have to expand something to learn it exists. Each
   attachment carries the authority that compels it.

3) **What is abridged on screen is never abridged in what gets signed.** The
   reading surface may shorten a clause. The executed document may not. This is
   the one thing the kit must never quietly reverse.

4) **A party with no legal name gets no signature rule.** A blank line under a
   role invites a name that binds nobody. It reads "To be named" against a
   dashed rule, and the gate is closed.

5) **The document wears the business's tokens, never the kit's.** A Palisade
   lease and a Sun Mountain lease are the same instrument in different clothes.
   Every business looking like one product is the enterprise version of a
   template. Tokens are set per agreement through `brand.tokens`; anything
   omitted falls back to the consuming site's own palette, which is the normal
   and preferred case.

6) **The clause number sits on the title line**, the way an instrument prints
   it. A stacked uppercase label above every clause is a website habit, and
   seven of them down a page read as decoration rather than as numbering.

7) **No tabular figures in prose.** They are for aligned columns only. In a
   sentence, tabular punctuation puts a visible gap either side of every comma
   and decimal point, so "$3,695.00 rent, $300.00 parking" renders spaced out.

## Type

The kit sets no faces of its own. It reads `--font-display`, `--font-schibsted`
and `--font-mono` from the consuming site and falls back to Newsreader, Schibsted
Grotesk and a system mono. On 243 Lincoln that resolves to the site's own
Newsreader and Schibsted Grotesk with the slate accent `#33566f`.

The direction board was drawn in EB Garamond and Instrument Sans, which are
Palisade's locked faces. That was a board placeholder, not a decision: a repo's
own type lock beats any list, and Lincoln's is what shipped.

## The PDF is deliberately set in Times

It uses the fonts every PDF reader already has rather than embedding the brand
faces. The Bluebill PDF embeds its own, and the failure mode of that route is a
serverless bundle that silently drops the font file, which turns a legal copy
into a 500 at the moment somebody tries to download what they just signed. A
document that always renders beats a better-set one that sometimes does not. A
consuming repo that wants its own faces in the PDF can pass font bytes later.

## Rulings settled here, so they are not re-argued

- **Beauty against the persistent phone number.** The number stays, in the
  letter, as a real touch target. A signing surface that hides the way to ask a
  question is not restrained, it is evasive.
- **The signature is a typed name, not a drawn one.** A drawn signature looks
  more like signing and proves less. What carries evidential weight is the typed
  name matched against the record, the explicit consent, the server-stamped
  time, the IP, the device and the fingerprint of the exact text.
- **Every figure is derived, never typed twice.** Money is integer cents and the
  page, the PDF and the tests read the same record.

## What was left undone, deliberately

- Delivery mails are not wired. Until they are, the panel says so rather than
  implying a copy is on its way.
- Bluebill has not been migrated onto the kit. It has an affirmation on file and
  two tenants about to sign, and swapping the engine under a half-executed lease
  is not a risk worth taking. It moves after they have signed.
