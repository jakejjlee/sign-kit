import fs from "node:fs";
import { SURFACES, SURFACE_ORDER, BRANDS } from "./lib.mjs";
const OPTS = [
  { id: "d0", n: "0", name: "0 Live: the Track", short: "Live", live: true },
  { id: "d0p", n: "0+", name: "0+ The Track, done properly", short: "0+" },
  { id: "d1", n: "1", name: "1 The Specimen", short: "Specimen" },
  { id: "d2", n: "2", name: "2 The Tiles", short: "Tiles" },
  { id: "d3", n: "3", name: "3 The Ledger", short: "Ledger" },
];
const letters = "abcde";
const directions = [];
for (const o of OPTS) {
  SURFACE_ORDER.forEach((k, i) => {
    const s = SURFACES[k];
    const b = BRANDS[s.brand];
    directions.push({
      n: `${o.n}${letters[i]}`,
      file: k === "waiting" ? o.id : `${o.id}-${k}`,
      name: `${o.name} / ${s.label}`,
      label: `${o.short} ${letters[i]}`,
      tag: `${s.tabBrand} · ${b.serifKey === "ebg" ? "EB Garamond" : "Newsreader"} + Instrument Sans`,
      live: o.id === "d0" && i === 0,
    });
  });
}
const cfg = {
  title: "Transactional emails, round 2",
  meta: ["five options, five emails each", "round 2 (round 1 was 12 November)", "14 November 2026"],
  basePath: "",
  typeLocked: "each brand's own locked faces (Newsreader or EB Garamond with Instrument Sans); the options differ by construction, not typeface",
  paletteLocked: "each brand's own palette tokens; the options differ by construction, not color",
  premise:
    "Every option puts what happened in one large sentence at the top and one real button under it; the three new ones also drop the colored header band and the step track, so the email reads as a page from the business, not a notification from a tool.",
  note:
    "Tabs a to e are the same five emails in every option: a) signed, waiting on others (Palisade, 36 River Road); b) fully signed, PDF attached (Sun Mountain, 309 Cranbrook Circle); c) the alert to Jake (Xenia, Roam North website agreement); d) form receipt (Palisade inquiry, Jake's approved wording); e) fully signed with no open button (Perry Lawson, Consignment Agreement). Terms, parties, wording and logos are real. Signing dates and times are stand-ins. Use the phone toggle for the 390 view.",
  directions,
};
fs.writeFileSync("board.config.json", JSON.stringify(cfg, null, 2));
console.log(directions.length, "tabs");
