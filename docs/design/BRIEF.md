# Signer confirmation email: BRIEF (UNDERSTAND block)

Run: /create route (a), --light tier, 2026-11-12. Round 1. Branch design/signer-confirmation-email.

## Who
A property owner or tenant who has just signed one of Jake's agreements on a phone or laptop,
seconds ago, on a private link. First real case: Michael Williams, owner of 309 Cranbrook Circle,
Colorado Springs, signed the Sun Mountain Stays Management Agreement on November 11, 2026 at
6:59 PM MST. He received nothing by email (the Sun Mountain site emails only the operator).

## Job
Give the signer a copy of what they signed, and the certainty that it counted, in the first
two seconds of opening the email.

## Jobs to walk
1) Mike, the evening he signs, on his iPhone: opens the email and knows within two seconds that
   the agreement is complete and the signed PDF is attached.
2) Mike, three months later, searching his inbox for "Sun Mountain agreement": finds it by
   subject, sees the key terms (property, start date, fee) without opening the PDF, and opens
   the signed copy in one tap.
3) A tenant on a two-party lease (the kit's Lincoln lease): signs first, and understands the
   agreement is NOT complete yet, who still has to sign, and that the final copy will follow.

## World (concrete nouns from the subject's own materials)
The signed PDF with its fingerprint, the signature line ("Michael Williams"), 309 Cranbrook
Circle, Pikes Peak / Garden of the Gods sandstone (the Sun Mountain mark), the agreement's
start date (November 1, 2026), the brass on forest green of the Sun Mountain brand.

## Preserved
1) The kit's design record (docs/design/DESIGN-RECORD.md): the business's tokens, never the
   kit's; the letter layer and the file layer typographically distinct.
2) Sun Mountain brand lock: Newsreader + Instrument Sans, Cinzel for the wordmark only; real mark
   files in sun-mountain-stays/public (sun-mountain-mark*.png). Never redrawn.
3) Delivery rules in src/lib/notify.ts: email never decides whether a signature counts; a failure
   is never silent.

## Mode
Product (transactional email), with brand surface.

## Conversion goal
None to sell. The one action is "Open your signed copy". Secondary: reply to reach a person.

## Stack ceiling
"The most ambitious thing this exact stack can do well is a table-based, 600px, bulletproof HTML
email with a painted-in logo, live text in a web-safe fallback face, and one VML-safe button,
that survives Gmail clipping, images off and forced dark mode."

## Commercial reality
The signer is buying certainty that the deal they agreed to is the deal on file. The one action is
opening the signed copy. In the five minutes after, they forward it to a spouse, accountant or
lender, or file it.

## Hard constraints
1) Email clients: Gmail strips webfonts and <style> in some views; Outlook needs tables and VML.
   Render the board in the faces the reader will actually see (Newsreader in Apple Mail; the
   Georgia / Helvetica fallback in Gmail), never a webfont the inbox will not load.
2) Never image-only; the words survive with images off. Logo background painted in for dark mode.
3) No Jake cell number anywhere (memory: everyone must email me). Contact = reply to the email or
   hello@sunmountainstays.com.
4) Client emails carry jakejjlee.com/meet as an INLINE text link, never a button.
5) No exclamation marks, no em dashes, American English, 12-hour clock, American dates.
