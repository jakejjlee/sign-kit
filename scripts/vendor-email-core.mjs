#!/usr/bin/env node
/**
 * Copies the signer email's design core into a site that cannot depend on the
 * kit (Sun Mountain Stays: a private git dependency would put its production
 * build at the mercy of a repo token). One design, one source: this file is
 * the kit's src/lib/signer-email-core.ts, copied byte for byte under a header
 * that records the kit commit and the content hash.
 *
 *   pnpm emails:vendor <site repo> [--check]
 *
 * Without --check it writes <site>/src/lib/agreements/vendor/signer-email-core.ts.
 * With --check it writes nothing and exits 1 if the site's copy is not exactly
 * what this command would write (hand-edited, or behind the kit).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const kit = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const site = args.find((a) => !a.startsWith("--"));
if (!site) {
  console.error("usage: pnpm emails:vendor <site repo> [--check]");
  process.exit(2);
}

const source = readFileSync(join(kit, "src/lib/signer-email-core.ts"), "utf8");
const hash = createHash("sha256").update(source).digest("hex");
let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", kit, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {}

const header =
  `// GENERATED from the sign-kit signer email core. Do not edit by hand: change the kit's\n` +
  `// src/lib/signer-email-core.ts and run \`pnpm emails:vendor <this repo>\` in the kit.\n` +
  `// kit-core-sha256: ${hash} (kit commit ${commit} when copied)\n`;
const out = header + source;
const dest = join(resolve(site), "src/lib/agreements/vendor/signer-email-core.ts");

if (check) {
  const have = existsSync(dest) ? readFileSync(dest, "utf8") : "";
  const haveBody = have.split("\n").slice(3).join("\n");
  if (haveBody !== source) {
    console.error(`DRIFT: ${dest} is not the kit's current core (kit ${commit}). Run pnpm emails:vendor ${site}`);
    process.exit(1);
  }
  console.log(`in step with the kit core (${hash.slice(0, 12)})`);
} else {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, out);
  console.log(`wrote ${dest} (${hash.slice(0, 12)}, kit ${commit})`);
}
