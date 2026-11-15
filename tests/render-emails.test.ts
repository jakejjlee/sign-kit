import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { lintSignerEmail } from "../src/lib/signer-email-core";
import { buildSignerEmail } from "../src/lib/signer-email";
import { BRANDS, type BrandKey, scenarios } from "./email-fixtures";

/**
 * The fast check: every email state for every brand, linted on each test run
 * (about a second), and written to files when RENDER_EMAILS names a folder:
 *
 *   pnpm emails            renders to docs/design/email/final, lints, screenshots
 *   pnpm emails:lint       lints only
 *
 * Files carry data-medium="email" data-no-hero so the page checks treat them
 * as the email they are, not a web page with no hero.
 */
const OUT = process.env.RENDER_EMAILS;

const forCheck = (html: string) => html.replace("<html lang=", '<html data-medium="email" data-no-hero lang=');

describe("every email state, every brand, passes the cheap checks", () => {
  for (const brand of Object.keys(BRANDS) as BrandKey[]) {
    describe(brand, () => {
      for (const s of scenarios(brand)) {
        it(s.name, () => {
          const built = buildSignerEmail(s.a, s.rec, s.ex, s.opts);
          expect(lintSignerEmail(built)).toEqual([]);
          if (OUT) {
            const dir = join(OUT, brand);
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, `${s.name}.html`), forCheck(built.html));
            writeFileSync(join(dir, `${s.name}.txt`), `Subject: ${built.subject}\n\n${built.text}\n`);
          }
        });
      }
    });
  }

  it("the two reference renders are written under their stable names", () => {
    if (!OUT) return;
    const lincoln = scenarios("palisade-lincoln").find((s) => s.name === "lease-waiting");
    expect(lincoln).toBeDefined();
    // biome-ignore lint/style/noNonNullAssertion: asserted above
    const s = lincoln!;
    const built = buildSignerEmail(s.a, s.rec, s.ex, s.opts);
    // sms-mike.html is written by the Sun Mountain site from its own agreement record (its pnpm emails).
    const final = join(process.cwd(), "docs/design/email/final");
    mkdirSync(final, { recursive: true });
    writeFileSync(join(final, "kit-lincoln-waiting.html"), forCheck(built.html));
  });
});
