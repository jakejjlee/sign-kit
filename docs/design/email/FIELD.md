# Field benchmark: signing-confirmation and transactional emails

Round 1, 2026-11-12. Light tier, one pass, capped at about ten minutes by the coordinator.

## What was actually opened, and what was not

| Source | Date opened | Result |
|---|---|---|
| Dropbox DocSend eSignature help (via web search result text) | 2026-11-12 | Read the summary only: owner and signer are each emailed when everyone has signed, with a link to download the signed document and a signature certificate. No sample email body was available. |
| Dropbox Sign callback-events help and developer docs | 2026-11-12 | Confirms the completed state is its own event ("all signed"), separate from one person signing. Matches our two states. |
| Transactional email best-practice roundups (Litmus, Mailjet, Brevo, SendLayer, Tabular, Tajo) | 2026-11-12 | Search summaries only: single column, event named in the subject and the first line, one button, restrained brand, sender is a name. Category median, not ceiling. |
| DocuSign completed-envelope help page | 2026-11-12 | Could not be reached (host did not resolve). Not used as evidence. |
| Stripe receipts, Linear, Apple, Airbnb, Aesop, high-end hotel confirmations | not opened | No live access to a real sent email in this pass. The ceiling entries below are from memory of how those emails are built, and every one is marked "from memory". A later pass should open real sent copies. |

The honest limit: the category median below rests on search summaries, and the ceiling rests on
memory. Neither is a measurement. Nothing in the directions depends on a figure from this file.

## Steal list (mechanisms, each with the direction that uses it)

1) The event is the subject and the first line. "Signed: ..." then "This agreement is complete".
   Median across the category. Used by every option.
2) Completed and waiting are two designs, not one design with a changed sentence. Dropbox Sign
   separates the events. Used by every option; d3 makes the difference visible as a track.
3) A document row that looks like the file: icon tile, filename, "Attached". Stripe receipts and
   Dropbox attachments do this (from memory). Used by d2.
4) One primary button, 48px or taller, full width on a phone. Receipts from Stripe and Airbnb
   (from memory). Used by d2, d0+, d1, d3.
5) Key terms as grouped rows the reader can scan without opening the PDF. Airbnb itinerary
   emails (from memory). Used by all directions; this is job 2 in BRIEF.md.
6) A short "what happens next" with a real date. Hotel confirmations give check-in day and time
   (from memory). Used by d1, d2, d3 for Friday, November 13, 2026.
7) A human sign-off in the letter layer. The kit's own design record argues for a named person
   speaking first. Used by d1.
8) A status marker that survives images off: words ("Complete", "Waiting on 1 signature"), not a
   colored dot. Used by d2 and d3.
9) The mark painted onto its own ground so forced dark mode cannot hide it. Brief constraint,
   used wherever the mark appears.
10) A preheader that finishes the sentence the subject starts, so the inbox row reads in full.
    Used by every option.

## Avoid list (category tells)

1) A full-width colored header bar carrying a generic "Document completed" banner with a check
   icon the size of a coin. The DocuSign and Dropbox Sign median (from memory).
2) Image-only layouts, or a large hero photo whose alt text carries the words.
3) Two or three equal buttons ("View document", "Download", "Sign another").
4) A footer of legal boilerplate in 11px gray, social icons, an unsubscribe line on a message the
   person must keep.
5) "Congratulations" language and exclamation marks on a legal act.
6) Small caps label, hairline rows, one accent, centered sheet. The design standard names this as
   Claude's default look; it survives only in option 0 and 0+ because those are the same skeleton.
7) A seal, circle badge, monogram or gold line emblem on a Sun Mountain surface (rejection list).
8) A phone number of Jake's anywhere. Reply and the booking link only.
9) Monospace values in the key terms. Reads like a log file, not a signed deal.

## Type and material in the field

Apple Mail and iOS Mail load web faces; Gmail does not, so a design has to hold up in Georgia and
Helvetica as well as Newsreader and Instrument Sans. The three directions lean on the fallback
differently: d1 relies on Georgia carrying the voice, d2 on Helvetica being quiet, d3 on color
blocks that do not depend on a face.
