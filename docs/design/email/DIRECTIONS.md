# Directions: signer confirmation email, round 1, 2026-11-12

Premise the whole set shares: the signer opens this email to be certain it counted, so every
option puts the proof (complete or waiting, the signed PDF, the terms) in the first screen and
the person second.

Position: this email is a receipt for a signature, built on a familiar single-column skeleton and
authored in the business's own tokens, never the kit's.

Constraints held in all five: single column, table-based inline-styled markup, 600px max, 52px
button (VML fallback for Outlook), mark painted onto its own ground, no phone number of Jake's,
reply goes to the brand inbox, jakejjlee.com/meet as an inline text link, no exclamation marks, no
em dashes, 12-hour clock, American dates. Options 0+, 1, 2 and 3 hold body text at 16px or more
in the body paragraphs, nothing under 13px, 4.5:1 contrast. Option 0 is the current email as
written and keeps its 11px, 12px and 13px lines on purpose.

## 0 and 0+

0 is `signerEmail()` + `shell()` + `rows()` in `src/lib/notify.ts`, rendered as written with Sun
Mountain's accent and paper. Its footer still prints a phone line, shown here as a labeled unknown.
0+ keeps the same skeleton, words and order, and adds only: the real mark, Newsreader and
Instrument Sans, a 16px floor, honest contrast, one button, and reply plus book a call in place of
the phone line.

## Collapse test (one structural sentence each, nouns and structural verbs)

| Option | Sentence |
|---|---|
| d1 The Letter | A borderless page of paper carries a headline, a salutation, a prose paragraph, stacked terms, a button and a signature. |
| d2 The Receipt | A white rounded card on gray stacks a status pill, a headline, a file row, a full-width button, ruled key terms and a next box. |
| d3 The Track | A forest band over an ivory page carries a three-step track, a button and a term table, closed by a forest footer band. |

Axes each pair differs on: d1 and d2 differ on typography (serif prose against sans UI), palette
weight (all paper against white on gray) and composition (flowing text against modules). d2 and d3
differ on palette weight (neutral against two forest bands), composition (card against a
vertical track) and pacing (one scan against three beats). d1 and d3 differ on typography use,
pacing (read against scan) and material (paper against colored blocks). None differ on reading
order basics: all read top to bottom, status first, terms second, contact last.

## d1 The Letter

1) Concept: a short letter from Jake on paper. 2) Why this project: the kit's design record says a
named person speaks first; this extends it to the email. 3) Composition: one column, no card
edge, left-aligned, 24px gutters. 4) Typography: Newsreader 19px/30px for prose and terms, 40px
headline; Instrument Sans only for labels, button and footer; the sign-off name in Newsreader
italic in signature ink #1b2a52 (a few words, the one italic). Gmail shows Georgia carrying the
same voice. 5) Imagery: the real mark at 40px beside the business name, painted on #1f4a30.
6) Motion and interaction: none; the one button is 52px. 7) Distinct because: the terms are
stacked labels over values with dotted rules, and a person signs it. 8) Refuses: cards, status
colors, icons, a header band. 9) Main risk: prose is slower to scan three months later.
Mitigation: the terms block sits at the first scroll.

Mechanisms: named sender and sign-off (costs Jake his name on every client email); the event in
the first line; key terms in the body; a real next date (Friday, November 13, 2026).
Unavailable: none.

Palette (measured): paper #faf7f0, ink #16120c 17.4:1, body #3f382d 10.8:1, muted #6b6152 5.7:1,
button #8a5e12 with white 5.7:1. Material: paper. Pacing: slow. Density: low. Signature: the
sign-off line.

## d2 The Receipt

1) Concept: a product receipt. 2) Why: Jake's dossier shows the product-polish family wins
(2026-11-01 and 2026-11-06). 3) Composition: a gray ground, one white card with 16px radius,
modules in a fixed order. 4) Typography: Instrument Sans leads (16px values at 600, 15px
labels); Newsreader only on the 32px headline; Helvetica in Gmail. 5) Imagery: the mark at 40px
in the card header; the PDF tile is text, not an image. 6) Interaction: a full-width 52px ink
button. 7) Distinct because: a status pill in words, a file row that looks like the attachment, a
next box. 8) Refuses: a header band, serif body text, prose paragraphs. 9) Main risk: reads like
a platform, not the business. Mitigation: the mark, the headline face and the brass-brown tile
carry Sun Mountain.

Mechanisms: file row (costs nothing); status pill (needs two states designed, done); key terms
as rows; next box. Unavailable: a countersigner timeline, because no countersigner data exists
on the Sun Mountain agreement.

Palette (measured): ground #efece4, card #ffffff, ink #16120c, muted #6b6152 on white 6.1:1,
pill green #1c4a2d on #e1eee4 8.5:1, pill amber #5e400a on #f6e6c4 7.7:1, button white on ink
18.7:1. Material: matte card. Pacing: one scan. Density: medium. Signature: the file row.

## d3 The Track

1) Concept: the agreement as a short progress track. 2) Why: the waiting state is half the job;
a track shows where the signer stands in two seconds. 3) Composition: forest header band with the
mark and the Cinzel wordmark, ivory page, vertical three-step track, a term table, forest footer
band. 4) Typography: Cinzel only on the wordmark (Georgia caps in Gmail); Newsreader for
headline, steps and values; Instrument Sans for detail and button. 5) Imagery: the real mark at
52px on its own forest-green ground, set against the band so dark mode cannot hide it.
6) Interaction: 52px forest button, ivory label. 7) Distinct because: status reads by shape
(check, number, dashed number). 8) Refuses: gold line emblems, seals, circle badges (the step
markers are rounded squares), a lodge look. 9) Main risk: the forest bands tip toward the
heritage lodge look. Mitigation: no brass ornament, brass only as small text on forest.

Mechanisms: state as a track; dated next step; terms in a table. Unavailable: a Cranbrook photo
(none in the catalog).

Palette (measured): band #0d2318, page #faf7f0, ivory #f1ebdd on forest 13.9:1, brass #e0b866 on
forest 8.8:1, muted #6b6152 on paper 5.7:1. On the Lincoln brand the band is slate #2a475c with
ivory text 8.4:1. Material: colored blocks. Pacing: three beats. Density: medium. Signature: the
track.

## Unknowns carried visibly on every render

Tenant name and signing time (Lincoln, entered at signing), the agreement version date and the
document fingerprint (printed from the signed record), the Sun Mountain brand phone line (shown
only in option 0), and the Lincoln page link (the button points to #).

## Assumptions

1) The Sun Mountain agreement's subtitle is the property address, so the subject and the PDF
   filename use it. 2) The five key-term rows for Michael Williams use labels written here, not the
   agreement's own summary rows. 3) The sender is Sun Mountain Stays at hello@sunmountainstays.com
   and the sign-off is Jake Lee. 4) The Lincoln waiting state names Jamarber Dobrushi, the
   landlord, as the party still to sign, although the lease file marks the landlord as signing
   first; no pronoun is used for him. 5) Lincoln wears Palisade Stays with the lease site's slate
   accent #33566f, Newsreader and Schibsted Grotesk, and sends from jake@palisadestays.com, the
   brand email in the lease file.
