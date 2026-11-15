# Transactional email system: BRIEF, round 2 (2026-11-14)

Route: /create, one component system, up to and including the direction board. Branch
feat/searchable-signer-subject (worktree sign-kit-subject).

## Who
Four readers: 1) a signer (owner, tenant, artist, client) who has just signed on a phone;
2) Jake, getting the business-inbox alert when someone signs; 3) a person who has just sent an
inquiry form and wants proof it arrived. Brands: Xenia (and Roam North through it), Sun Mountain
Stays, Palisade Stays, Perry Lawson Fine Art.

## Job
Say what happened in the first screen, in words, and give the one next thing (open the signed copy,
or wait for a named person, or reply).

## Jobs to walk
1) Michael Williams, 6:59 PM on his iPhone: sees in two seconds that the agreement is complete and
   the PDF is attached.
2) Ismail Canseven, same night: understands Jake Lee still has to sign and that he gets the
   finished PDF when Jake does.
3) Jake at his desk: sees who signed what, when, and whether anything is left for him, without
   opening the document.
4) A Palisade inquirer: knows the inquiry arrived and when to expect a reply.

## Preserved
Subject convention "<place or client> | <document> | Signed by <name>, <date>" (Fully signed when
complete); no phone number; reply plus an inline "book a call" link; light only; the business's
own logo and faces; Jake's approved Palisade receipt wording; delivery rules in notify.ts.

## Mode / stack ceiling
Product mail with a brand surface. Table layout, inline styles, 600px, light only, real logos as
hosted images with alt text, web font then a deliberate system fallback, under Gmail's 102KB clip
(largest render 14KB), words survive with images off.

## Rejected (do not re-offer)
The Track as a direction (round 1 pick, rejected 2026-11-14). Heavy colored header band, step track,
generic table, Times New Roman fallback.
