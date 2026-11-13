# RESUME: signer confirmation email (/create, route a, --light)

Branch: design/signer-confirmation-email in ~/Claude/sign-kit. Started 2026-11-12.

1) Brief written: docs/design/email/BRIEF.md.
2) Board built and committed (048064a), served at 127.0.0.1:8731, opened in Safari.
3) PICKED 2026-11-12: d3 "The Track". BUILT: kit 7e521e3 (pushed), SMS PR #311 (e9280b4). Waiting on "ship it" + whether to send Mike his copy.
   kit notify.ts + SMS worktree ~/Claude/.claude-worktrees/sms-signer-email on
   feat/signer-confirmation-email, final renders in docs/design/email/final/.
4) After the pick: lift the picked markup into src/lib/notify.ts signerEmail()/shell(), wire Sun
   Mountain's sign route (sun-mountain-stays src/app/api/agreements/sign/route.ts) to send the
   signer copy, test, preview. No merge or prod without "ship it". Never send a real email.
5) Also pending in chat: WhatsApp to "Xenia | Sun Mountain Stays" about Cranbrook (approved
   wording awaiting Jake's "approved").
6) Jake 2026-11-12 board: signer email address is filled in by us on each agreement record
   (new `signerEmail` var in the registry), the client types nothing extra.
7) Mike Williams's address, from the To line of Jake's two "309 Cranbrook Circle | Your agreement"
   emails out of hello@sunmountainstays.com (Gmail ids 1a196c33de5edab3, 1a1c825990e80f39):
   eagle99@netzero.net. Goes on his registry entry as signerEmail at build time.
