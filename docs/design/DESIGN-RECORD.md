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

## Signer confirmation email (2026-11-12, round 1)

Board: docs/design/email/board/ (0, 0+, d1 The Letter, d2 The Receipt, d3 The Track).
Premise: the signer opens this email to be certain the signature counted, so status, the signed
copy and the key terms lead and the speaker comes second.

**Chosen: d3, The Track** (Jake, 2026-11-12, question board). Brand band in the business's own
dark color with its wordmark, a three-step track read by shape (You signed / Agreement complete or
Waiting on <name> / the next real date), one button to the signed copy, key terms as rows, reply
plus an inline "book a call" link in the footer.
Over: 0 (fails readability: 11px and 12px text, 3.6:1 contrast), 0+, d1 The Letter, d2 The Receipt.
Why the others lost: they answer "is it done" in words; the track answers it by shape before a
word is read, and it carries the one fact a signer wants next (what happens and when).
Open: the light field benchmark was thin (DocuSign unreachable); phone-size checks on d1 to d3
were still running at pick time.

## Signer confirmation email: The Track REJECTED (2026-11-14)

Jake saw the Track rendered across the live agreements and said "These look like complete dog shit"
and "make them look good, professional, top tier webdev ui ux and graphical design".

**The Track (round 1 pick, d3) is rejected.** Never bring it back except as option 0 (the live
incumbent) on a board. What was wrong, measured on the real renders: a heavy colored band across
the top, a cramped step track whose third step collapsed to one letter per line, a generic
two-column table for the terms, and a font stack that fell to Times New Roman where the brand face
did not load, which reads cheap. The step track as an idea (status read by shape) is also not to be
re-offered as a direction.

Round 2 board: docs/design/email/board-r2/ (option 0 = the live Track, 0+ = the same skeleton done
properly, three new directions that differ by construction: the Specimen, the Tiles, the Ledger).
The pick is recorded here when Jake makes it. Premise the set shares: the email is a letter on the
business's own paper, with what happened stated in one large sentence at the top, the logo small
and quiet, no colored header band and no step track.

Round 2 pre-screen (blind, order-swapped comparisons against 0+): the Specimen and the Tiles beat 0+
in both runs on the final renders; the Ledger lost both (the critic favored the dark band and the
step track, which Jake rejected, so it went to the board as is and says so). Gate: 0 of 25 renders
fail, type and palette declared brand-locked. Folio was
replaced by the Ledger mid-run after losing twice. A discrepancy to settle: the sun-mountain-stays
main registry still carries Cranbrook at 15% (10% on 30+ night stays) and $400 onboarding; the board
uses the 10% flat, no onboarding fee, 30 days after 90 terms from the November record.

## The Specimen is the one email design (Jake, 2026-11-14, round 2 board)

Board: docs/design/email/board-r2/ (sources; the renders are rebuilt with `node build.mjs`).
**Chosen: option 1, The Specimen**, for every signing and form email, over 0 (the live Track), 0+
(the Track done properly), 2 The Tiles and 3 The Ledger.

What it is: a tinted ground with the business's real logo centered, one large sentence saying what
happened, one full-width button, then the thing itself drawn as a sheet of paper (title, terms, one
signature line per party; a signed name sits on its line, an unsigned one says "Signature needed"),
a quiet footer. No colored header band, no step track.

Where it lives: `src/lib/signer-email-core.ts` holds the layout (`renderSpecimen`) and three ways to
describe a message to it: `renderSignerEmail` (waiting and complete), `renderOperatorEmail` (the
alert to the business inbox) and `renderReceiptEmail` (a form receipt: a sheet of what was received
and the reference, no signature lines). Sites keep a byte-for-byte copy (`pnpm emails:vendor`); the
web-kit mail framework gets a generated module (`pnpm emails:vendor-webkit`). One design, one source.

Rules the code enforces: web font first, then Iowan Old Style, Charter, Georgia (never Times New
Roman: the stack repairs itself); real hosted logo with alt text and its background painted in;
light only; 600px; 13px floor; one button; book a call is an inline link; no phone number; subject
"<place> | <document> | Signed by <name>, <date>" (Fully signed when complete).

Cranbrook (Michael Williams, 309 Cranbrook Circle) is 10% of Net Revenue flat with no onboarding
fee, the November version signed on 2026-11-11 (Jake, 2026-11-14). The sun-mountain-stays registry
still carries an older September record (15%, 10% on 30-plus nights, $400 onboarding) that Jake has
to have corrected there.

## 2026-11-23, round 3: The Certificate replaces the Specimen
Jake's ask: "make sure the email templates are DIALED. HIGHLY professional and legit", after the
Donovan lease alerts were lost to a dead inbox. Board round 3 (0 live, 0+ Specimen done properly,
1 The Counterpart, 2 The Certificate, 3 The Notice; 4 emails x 2 widths each, 40 of 40 renders).
PICKED: 2 The Certificate (DocuSign completion mail / Stripe receipt: one status line, each signer
with status and time, the signed PDF as a file row, a document ID). Rejected: 0+, 1, 3; the Track
(round 1) stays rejected. The Specimen's mail mechanics (tables, inline styles, 600 cap, VML,
light-only, preheader, plain-text twin, no phone numbers) carry over unchanged.
