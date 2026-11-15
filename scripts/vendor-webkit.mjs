#!/usr/bin/env node
/**
 * Writes the Specimen into the web-kit mail framework as a generated module, so the framework and
 * every kit consumer draw one design from one source (src/lib/signer-email-core.ts).
 *
 *   pnpm emails:vendor-webkit <web-kit repo> [--check]
 *
 * Writes <web-kit>/src/email/specimen.mjs (the layout, types stripped) and specimen.d.mts (its
 * types), each under a header with the kit commit and the content hash. With --check it writes
 * nothing and exits 1 if either file is not exactly what this command would write.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const kit = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: pnpm emails:vendor-webkit <web-kit repo> [--check]");
  process.exit(2);
}

const sourcePath = join(kit, "src/lib/signer-email-core.ts");
const source = readFileSync(sourcePath, "utf8");
const hash = createHash("sha256").update(source).digest("hex");
let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", kit, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {}

const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, newLine: ts.NewLineKind.LineFeed, removeComments: false };
const js = ts.transpileModule(source, { compilerOptions: options, fileName: "specimen.ts" }).outputText;
const dts = ts.transpileDeclaration(source, { compilerOptions: { ...options, declaration: true }, fileName: "specimen.ts" }).outputText;

const header =
  `// GENERATED from the sign-kit src/lib/signer-email-core.ts (the Specimen). Do not edit by hand:\n` +
  `// change the kit's file and run \`pnpm emails:vendor-webkit <this repo>\` in the kit.\n` +
  `// kit-core-sha256: ${hash} (kit commit ${commit} when generated)\n`;

const out = join(resolve(target), "src/email");
const files = { "specimen.mjs": header + js, "specimen.d.mts": header + dts };
let drift = false;
for (const [name, body] of Object.entries(files)) {
  const dest = join(out, name);
  if (check) {
    const have = existsSync(dest) ? readFileSync(dest, "utf8") : "";
    // The hash line is the identity; the commit in parentheses may differ without meaning drift.
    const norm = (t) => t.replace(/\(kit commit [^)]*\)/, "");
    if (norm(have) !== norm(body)) {
      console.error(`DRIFT: ${dest} is not what the kit would generate (kit ${commit}). Run pnpm emails:vendor-webkit ${target}`);
      drift = true;
    } else console.log(`${name}: in step with the kit (${hash.slice(0, 12)})`);
  } else {
    mkdirSync(out, { recursive: true });
    writeFileSync(dest, body);
    console.log(`wrote ${dest} (${hash.slice(0, 12)}, kit ${commit})`);
  }
}
if (drift) process.exit(1);
