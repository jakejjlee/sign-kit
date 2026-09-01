import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { Agreement, Block, Section } from "../content/types";
import { longDate } from "./dates";
import { currentSignatures, isFullyExecuted, type ClauseInitial, type Execution } from "./execution";
import { shortFingerprint } from "./fingerprint";

/**
 * The agreement as a downloadable PDF.
 *
 * Laid out from the same record the page renders, so the file a signer keeps
 * cannot say something different from the document they read and signed. Only
 * the typography differs.
 *
 * It uses the fonts every PDF reader already has rather than embedding the
 * brand faces. That is a deliberate trade. The Bluebill PDF embeds its own
 * fonts and the failure mode is a serverless bundle that silently drops the
 * font file, which turns a legal copy into a 500 at the moment somebody tries
 * to download what they just signed. A document set in Times that always
 * renders beats a document set in Newsreader that sometimes does not.
 */

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 64;
const MARGIN_TOP = 66;
const MARGIN_BOTTOM = 62;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const INK = rgb(0.09, 0.11, 0.1);
const MUTED = rgb(0.36, 0.38, 0.36);
const RULE = rgb(0.82, 0.8, 0.75);

type Fonts = { body: PDFFont; bold: PDFFont; italic: PDFFont; ui: PDFFont };

type Draw = {
  page: PDFPage;
  y: number;
  text: (s: string, o?: { font?: PDFFont; size?: number; lead?: number; color?: typeof INK; indent?: number }) => void;
  gap: (n: number) => void;
  rule: () => void;
  need: (n: number) => void;
  pages: PDFPage[];
};

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function makeDraw(doc: PDFDocument, f: Fonts): Draw {
  const pages: PDFPage[] = [];
  const newPage = () => {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    return p;
  };
  const d: Draw = {
    page: newPage(),
    y: PAGE_H - MARGIN_TOP,
    pages,
    need(n) {
      if (this.y - n < MARGIN_BOTTOM) {
        this.page = newPage();
        this.y = PAGE_H - MARGIN_TOP;
      }
    },
    gap(n) {
      this.y -= n;
    },
    rule() {
      this.need(10);
      this.page.drawLine({
        start: { x: MARGIN_X, y: this.y },
        end: { x: PAGE_W - MARGIN_X, y: this.y },
        thickness: 0.6,
        color: RULE,
      });
      this.y -= 6;
    },
    text(s, o = {}) {
      const font = o.font ?? f.body;
      const size = o.size ?? 10.5;
      const lead = o.lead ?? size * 1.45;
      const indent = o.indent ?? 0;
      for (const line of wrap(s, font, size, CONTENT_W - indent)) {
        this.need(lead);
        this.page.drawText(line, {
          x: MARGIN_X + indent,
          y: this.y - size,
          size,
          font,
          color: o.color ?? INK,
        });
        this.y -= lead;
      }
    },
  };
  return d;
}

function drawBlock(d: Draw, f: Fonts, b: Block) {
  if (b.k === "p") {
    d.text(b.text);
    d.gap(4);
    return;
  }
  if (b.k === "caps") {
    d.text(b.text.toUpperCase(), { font: f.bold, size: 9.6 });
    d.gap(5);
    return;
  }
  if (b.k === "list") {
    for (const item of b.items) {
      d.text(`•  ${item}`, { indent: 10 });
      d.gap(2);
    }
    d.gap(3);
    return;
  }
  for (const [k, v] of b.rows) {
    d.need(14);
    d.page.drawText(k, { x: MARGIN_X, y: d.y - 10, size: 10, font: f.body, color: MUTED });
    const w = f.body.widthOfTextAtSize(v, 10);
    d.page.drawText(v, { x: PAGE_W - MARGIN_X - w, y: d.y - 10, size: 10, font: f.body, color: INK });
    d.y -= 15;
  }
  if (b.total) {
    d.need(16);
    d.page.drawText(b.total[0], { x: MARGIN_X, y: d.y - 10, size: 10, font: f.bold, color: INK });
    const w = f.bold.widthOfTextAtSize(b.total[1], 10);
    d.page.drawText(b.total[1], { x: PAGE_W - MARGIN_X - w, y: d.y - 10, size: 10, font: f.bold, color: INK });
    d.y -= 16;
  }
  d.gap(4);
}

function drawSection(d: Draw, f: Fonts, sec: Section, initials?: ClauseInitial[]) {
  if (sec.group) {
    d.need(46);
    d.gap(10);
    d.rule();
    d.gap(2);
    d.text(sec.group.toUpperCase(), { font: f.bold, size: 8.5, color: MUTED });
    d.gap(2);
  }
  d.need(40);
  d.gap(6);
  const mark = (initials ?? [])
    .filter((i) => i.clause === sec.n)
    .map((i) => i.initials)
    .join(" ");
  d.text(`${sec.n}  ${sec.title}`, { font: f.bold, size: 11.5 });
  if (mark) {
    // In the margin beside the clause, which is where a paper lease puts it.
    d.page.drawText(mark, {
      x: Math.max(6, MARGIN_X - 34), y: d.y + 11, size: 8.5, font: f.bold, color: INK,
    });
  }
  d.gap(3);
  for (const b of sec.blocks) drawBlock(d, f, b);
}

export async function renderAgreementPdf(a: Agreement, ex: Execution): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f: Fonts = {
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    ui: await doc.embedFont(StandardFonts.Helvetica),
  };

  const d = makeDraw(doc, f);
  const signatures = currentSignatures(a, ex);
  const executed = isFullyExecuted(a, ex);

  /* ---- masthead ---- */
  d.text(a.title.toUpperCase(), { font: f.ui, size: 8.5, color: MUTED });
  d.gap(6);
  if (a.subtitle) {
    d.text(a.subtitle, { font: f.bold, size: 16, lead: 20 });
    d.gap(4);
  }
  d.text(
    `Prepared by ${a.brand.name}, ${a.brand.role}. ${a.brand.phone}.`,
    { size: 9.5, color: MUTED }
  );
  d.gap(6);
  d.rule();
  d.gap(8);

  /* ---- parties ---- */
  d.text("Parties", { font: f.bold, size: 11.5 });
  d.gap(3);
  for (const p of a.parties) {
    d.text(`${p.role}: ${p.legalName.trim() || "to be named"}`, { size: 10.5 });
  }
  d.gap(8);

  /* ---- money ---- */
  if (a.money.lines.length > 0) {
    d.text("What is payable", { font: f.bold, size: 11.5 });
    d.gap(3);
    for (const line of a.money.lines) {
      d.need(14);
      const label = line.refundable ? `${line.label}, refundable` : line.label;
      d.page.drawText(label, { x: MARGIN_X, y: d.y - 10, size: 10, font: line.isTotal ? f.bold : f.body, color: line.isTotal ? INK : MUTED });
      const v = usdish(line.amount);
      const w = (line.isTotal ? f.bold : f.body).widthOfTextAtSize(v, 10);
      d.page.drawText(v, { x: PAGE_W - MARGIN_X - w, y: d.y - 10, size: 10, font: line.isTotal ? f.bold : f.body, color: INK });
      d.y -= 15;
    }
    d.gap(3);
    d.text(`Paid to ${a.money.paidTo}, by ${a.money.method}.`, { size: 9.5, color: MUTED });
    d.gap(8);
  }

  /* ---- body ---- */
  const allInitials = Object.values(ex.signatures).flatMap((s) => s?.initials ?? []);
  for (const sec of a.body) drawSection(d, f, sec, allInitials);

  /* ---- attachments ---- */
  if (a.attachments.length > 0) {
    d.need(60);
    d.gap(8);
    d.rule();
    d.gap(8);
    d.text("Attached to and part of this agreement", { font: f.bold, size: 11.5 });
    d.gap(4);
    for (const x of a.attachments) {
      const auth = x.authority ? `  (${x.authority})` : "";
      const req = x.required ? "  Required by law." : "";
      d.text(`•  ${x.title}${auth}${req}`, { size: 10, indent: 8, color: MUTED });
      d.gap(1);
    }
    d.gap(8);
  }

  /* ---- initials schedule ---- */
  const initialed = a.parties.flatMap((p) => {
    const sig = ex.signatures[p.id];
    return (sig?.initials ?? []).map((i) => ({ role: p.role, ...i }));
  });
  if (initialed.length > 0) {
    d.need(60);
    d.gap(8);
    d.rule();
    d.gap(8);
    d.text("Clauses initialed separately", { font: f.bold, size: 11.5 });
    d.gap(4);
    for (const i of initialed) {
      d.text(`\u2022  Section ${i.clause}, ${i.initials}, ${i.role}, ${i.at}`, {
        size: 10, indent: 8, color: MUTED,
      });
      d.gap(1);
    }
    d.gap(8);
  }

  /* ---- signatures ---- */
  d.need(120);
  d.gap(10);
  d.rule();
  d.gap(10);
  d.text("Signatures", { font: f.bold, size: 11.5 });
  d.gap(6);

  for (const p of a.parties) {
    const sig = signatures[p.id];
    d.need(58);
    const named = p.legalName.trim().length > 0;
    d.page.drawLine({
      start: { x: MARGIN_X, y: d.y - 22 },
      end: { x: MARGIN_X + 240, y: d.y - 22 },
      thickness: 0.8,
      color: named ? INK : RULE,
    });
    if (sig) {
      d.page.drawText(sig.typed, { x: MARGIN_X + 2, y: d.y - 18, size: 13, font: f.italic, color: INK });
    }
    d.y -= 26;
    d.text(`${named ? p.legalName : "To be named"}, ${p.role}`, { size: 10 });
    d.text(
      sig
        ? `Signed electronically ${sig.signedAtLocal}`
        : named
          ? "Awaiting signature"
          : "No party named yet",
      { size: 9, color: MUTED }
    );
    d.gap(8);
  }

  d.gap(4);
  d.text(
    `Version ${longDate(a.version)}. Signed electronically under ${a.esignAct}. ` +
      `Signed in counterparts and delivered electronically.`,
    { size: 9, color: MUTED }
  );

  /* ---- execution record ---- */
  if (executed) {
    d.need(90);
    d.gap(10);
    d.rule();
    d.gap(10);
    d.text("Execution record", { font: f.bold, size: 10.5 });
    d.gap(4);
    for (const p of a.parties) {
      const sig = signatures[p.id];
      if (!sig) continue;
      d.text(
        `${sig.legalName} typed "${sig.typed}" and signed on ${sig.signedAtLocal}. ` +
          `Confirmed receipt of everything attached and consented to sign electronically.` +
          `${sig.ip ? ` Recorded from ${sig.ip}.` : ""}` +
          `${sig.fingerprint ? ` Agreement fingerprint ${shortFingerprint(sig.fingerprint)}.` : ""}`,
        { size: 8.6, lead: 12, color: MUTED }
      );
      d.gap(4);
    }
    d.text(`Times shown in ${a.timezone.replace("_", " ")}.`, { size: 8.6, color: MUTED });
  }

  /* ---- footers ---- */
  const total = d.pages.length;
  d.pages.forEach((p, i) => {
    const label = `${a.subtitle ?? a.title}  ·  Page ${i + 1} of ${total}`;
    const w = f.ui.widthOfTextAtSize(label, 8);
    p.drawText(label, { x: (PAGE_W - w) / 2, y: 34, size: 8, font: f.ui, color: MUTED });
  });

  return doc.save();
}

/** Local copy so the PDF never imports the surface's formatter. */
function usdish(v: number): string {
  const neg = v < 0;
  const abs = Math.abs(v);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}$${whole}.${frac}`;
}

/** A stamped filename, so a saved copy sorts and identifies itself. */
export function pdfFilename(a: Agreement, ex: Execution): string {
  const stamp = isFullyExecuted(a, ex) ? "executed" : "draft";
  const slug = (a.subtitle ?? a.title)
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug}-${stamp}.pdf`;
}
