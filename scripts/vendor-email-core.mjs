#!/usr/bin/env node
/**
 * Copies the kit's shared cores into a site that cannot depend on the kit (a
 * private git dependency would put its production build at the mercy of a
 * repo token, or the site is not a sign-kit site at all). One design, one
 * source: each file is copied byte for byte under a header that records the
 * kit commit and the content hash.
 *
 *   pnpm emails:vendor <site repo> [--dir src/lib/agreements/vendor] [--only signer-email-core] [--check]
 *
 * The cores: signer-email-core.ts (the signer's confirmation email, "The Track")
 * and pdf-core.ts (the signed PDF layout). Without --check it writes
 * <site>/<dir>/<core>.ts. With --check it writes nothing and exits 1 if a copy
 * is not exactly what this command would write (hand-edited, or behind the kit).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const kit = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const check = args.includes("--check");
const dir = flag("--dir") ?? "src/lib/agreements/vendor";
const only = flag("--only");
const valued = new Set([flag("--dir"), flag("--only")]);
const site = args.find((a) => !a.startsWith("--") && !valued.has(a));
if (!site) {
  console.error("usage: pnpm emails:vendor <site repo> [--dir <dir>] [--only <core>] [--check]");
  process.exit(2);
}

const CORES = ["signer-email-core", "pdf-core"].filter((c) => !only || c === only);
let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", kit, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {}

let drift = false;
for (const core of CORES) {
  const source = readFileSync(join(kit, `src/lib/${core}.ts`), "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  const header =
    `// GENERATED from the sign-kit ${core}. Do not edit by hand: change the kit's\n` +
    `// src/lib/${core}.ts and run \`pnpm emails:vendor <this repo>\` in the kit.\n` +
    `// kit-core-sha256: ${hash} (kit commit ${commit} when copied)\n`;
  const dest = join(resolve(site), dir, `${core}.ts`);

  if (check) {
    const have = existsSync(dest) ? readFileSync(dest, "utf8") : "";
    const haveBody = have.split("\n").slice(3).join("\n");
    if (haveBody !== source) {
      console.error(`DRIFT: ${dest} is not the kit's current ${core} (kit ${commit}). Run pnpm emails:vendor ${site}`);
      drift = true;
    } else {
      console.log(`${core}: in step with the kit (${hash.slice(0, 12)})`);
    }
  } else {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, header + source);
    console.log(`wrote ${dest} (${hash.slice(0, 12)}, kit ${commit})`);
  }
}
if (drift) process.exit(1);
