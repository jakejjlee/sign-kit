# sign-kit

One signing system, many agreements.

An agreement is data. The surface, the record, the evidence and the machinery live
here, and a consuming repo supplies only the agreement itself plus its own brand
tokens. A Palisade lease and a Sun Mountain lease are the same instrument in
different clothes.

**Before drafting any new agreement, read `~/.claude/docs/client-agreement-standard.md`** (set
2026-11-24 from the Phil Berger polish run): what the text must carry, what this kit now enforces
(signing stays closed while a `[BLANK` or `{{` remains, a failed store never shows a confirmation,
a signed party sees a waiting panel, each email carries only its own link, health needs a real
sender and an ops key that is never a signing token, capped free-text fields), and the checks
before a link goes out.

## Why it exists

The Bluebill agreement was built inside one property. It works, it has been signed
against, and none of it could be reused. This is that engine, taken out and made
general enough to carry a furnished-stay agreement, a twenty-four page New Jersey
residential lease, an owner management agreement, a vendor contract, or a one-off
document, for any of the businesses.

## The direction

**The letter and the file.** A stranger opening an unexpected private link and being
asked to sign something binding has a belief problem before they have a comprehension
problem. So a named person speaks first, in plain words, with a number that can be
called, and the instrument appears underneath, quieter and denser and looking like the
legal thing it is.

Two rules follow from that and are not negotiable:

1) The statutory mass is never hidden. Twelve pages of state-required disclosure bound
   into the rental of one apartment is a fact about the document, not a detail, and a
   signer should never have to expand something to learn it exists.
2) What is abridged on screen is never abridged in what gets signed. The reading
   surface may shorten a clause; the executed document may not.

## Consuming it

Pin it by git ref in the consuming repo's `package.json`, the same way `stay-kit` and
`web-kit` are consumed. A repo takes an upgrade by bumping the ref, never by editing
files here from there.

```json
"@iserlabs/sign-kit": "github:jakejjlee/sign-kit#<sha>"
```

Then add it to `transpilePackages` in `next.config.mjs`, because it is consumed as
TypeScript source.

## What is here today

- `src/content/types.ts`, the agreement model, derived from two real signed documents
- `src/lib/money.ts`, integer cents, ported from the Bluebill agreement
- `src/lib/dates.ts`, calendar days and server-stamped signature times
- `src/surfaces/`, the letter-and-file reading surface

## What is not here yet

The signing endpoint, the Drive record store, the PDF renderer and the delivery mails
still live in `clients/bluebill` and are ported next. Until they land, a consuming repo
can render an agreement and cannot collect a signature.

## Rules the kit enforces (signing polish, 2026-11-24)

- A 409 is "already signed" only when the response carries `alreadySigned`. A closed gate answers 503.
- Signing stays closed while the text holds `[BLANK` or `{{`; the page still shows the agreement to read.
- `panelStateFor` decides what a link's page shows: complete, signed and waiting, closed, or the form.
- `deliverSignedCopy` takes `copyUrl` as a function of the party, so each email holds only its own link.
- The health route is 404 without `AGREEMENT_OPS_KEY` (never a signing token) and 503 until mail can reach signers from a sender on the brand domain.
- Drive writes re-list after create and defer to an earlier record.
- Email is capped at 254 and the typed name at 200 before any permanent write.
