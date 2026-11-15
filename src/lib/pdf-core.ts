import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * The signed agreement as a PDF: the ONE place its layout lives.
 *
 * This file imports only pdf-lib. A caller describes the document as plain data
 * (the model below) and gets bytes back. Two callers use it:
 *
 * - the kit's own adapter, src/lib/pdf.ts (Agreement and Execution)
 * - a site that cannot depend on the kit (Sun Mountain Stays), which keeps a
 *   byte-for-byte copy of this file under src/lib/agreements/vendor/ made by
 *   `pnpm emails:vendor <site repo>` and describes its own agreements.
 *
 * It uses the fonts every PDF reader already has rather than embedding brand
 * faces. A document set in Times that always renders beats one set in a brand
 * face that sometimes does not: a serverless bundle that silently drops a font
 * file would turn a legal copy into a 500 at the moment somebody opens it.
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

export type PdfBlock =
  | { k: "p"; text: string }
  | { k: "list"; items: string[] }
  | { k: "rows"; rows: [string, string][]; total?: [string, string] }
  | { k: "caps"; text: string };

export type PdfSection = {
  /** Number as printed ("1", "3.4"). */
  n: string;
  /** Optional heading opening a run of clauses; only the first of a run carries it. */
  group?: string;
  title: string;
  blocks: PdfBlock[];
  /** Initials placed in the margin beside the heading, e.g. "ML". */
  mark?: string;
};

export type PdfModel = {
  /** Small caps line above the heading, e.g. the document title. */
  eyebrow: string;
  /** The large heading, e.g. the address or the client. */
  heading?: string;
  /** One muted line under the heading, e.g. "Prepared by Sun Mountain Stays, ...". */
  preparedBy: string;
  /** One line per party, e.g. "Owner: Michael Williams", under a "Parties" heading. */
  parties: string[];
  /** "What is payable": label and amount, already formatted. */
  payable?: { lines: { label: string; value: string; total?: boolean }[]; footnote: string };
  body: PdfSection[];
  /** "Attached to and part of this agreement": one line each. */
  attachments?: string[];
  /** "Clauses initialed separately": one line each. */
  initialsSchedule?: string[];
  /** One entry per signature line, in printed order. */
  signatures: { caption: string; named: boolean; typed?: string; status: string }[];
  /** The sentence under the signatures (version, e-sign law, counterparts). */
  closing: string;
  /** Present only when every party has signed. */
  record?: { lines: string[]; footnote: string };
  /** Page footer, to which "  ·  Page N of M" is added. */
  footerLabel: string;
};

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

function drawBlock(d: Draw, f: Fonts, b: PdfBlock) {
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

function drawSection(d: Draw, f: Fonts, sec: PdfSection) {
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
  d.text(`${sec.n}  ${sec.title}`, { font: f.bold, size: 11.5 });
  if (sec.mark) {
    // In the margin beside the clause, which is where a paper lease puts it.
    d.page.drawText(sec.mark, {
      x: Math.max(6, MARGIN_X - 34), y: d.y + 11, size: 8.5, font: f.bold, color: INK,
    });
  }
  d.gap(3);
  for (const b of sec.blocks) drawBlock(d, f, b);
}

export async function renderPdf(m: PdfModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f: Fonts = {
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    ui: await doc.embedFont(StandardFonts.Helvetica),
  };
  const d = makeDraw(doc, f);

  /* ---- masthead ---- */
  d.text(m.eyebrow.toUpperCase(), { font: f.ui, size: 8.5, color: MUTED });
  d.gap(6);
  if (m.heading) {
    d.text(m.heading, { font: f.bold, size: 16, lead: 20 });
    d.gap(4);
  }
  d.text(m.preparedBy, { size: 9.5, color: MUTED });
  d.gap(6);
  d.rule();
  d.gap(8);

  /* ---- parties ---- */
  d.text("Parties", { font: f.bold, size: 11.5 });
  d.gap(3);
  for (const p of m.parties) d.text(p, { size: 10.5 });
  d.gap(8);

  /* ---- money ---- */
  if (m.payable && m.payable.lines.length > 0) {
    d.text("What is payable", { font: f.bold, size: 11.5 });
    d.gap(3);
    for (const line of m.payable.lines) {
      d.need(14);
      const font = line.total ? f.bold : f.body;
      d.page.drawText(line.label, { x: MARGIN_X, y: d.y - 10, size: 10, font, color: line.total ? INK : MUTED });
      const w = font.widthOfTextAtSize(line.value, 10);
      d.page.drawText(line.value, { x: PAGE_W - MARGIN_X - w, y: d.y - 10, size: 10, font, color: INK });
      d.y -= 15;
    }
    d.gap(3);
    d.text(m.payable.footnote, { size: 9.5, color: MUTED });
    d.gap(8);
  }

  /* ---- body ---- */
  for (const sec of m.body) drawSection(d, f, sec);

  /* ---- attachments ---- */
  if (m.attachments && m.attachments.length > 0) {
    d.need(60);
    d.gap(8);
    d.rule();
    d.gap(8);
    d.text("Attached to and part of this agreement", { font: f.bold, size: 11.5 });
    d.gap(4);
    for (const x of m.attachments) {
      d.text(`•  ${x}`, { size: 10, indent: 8, color: MUTED });
      d.gap(1);
    }
    d.gap(8);
  }

  /* ---- initials schedule ---- */
  if (m.initialsSchedule && m.initialsSchedule.length > 0) {
    d.need(60);
    d.gap(8);
    d.rule();
    d.gap(8);
    d.text("Clauses initialed separately", { font: f.bold, size: 11.5 });
    d.gap(4);
    for (const line of m.initialsSchedule) {
      d.text(`•  ${line}`, { size: 10, indent: 8, color: MUTED });
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

  for (const s of m.signatures) {
    d.need(58);
    d.page.drawLine({
      start: { x: MARGIN_X, y: d.y - 22 },
      end: { x: MARGIN_X + 240, y: d.y - 22 },
      thickness: 0.8,
      color: s.named ? INK : RULE,
    });
    if (s.typed) {
      d.page.drawText(s.typed, { x: MARGIN_X + 2, y: d.y - 18, size: 13, font: f.italic, color: INK });
    }
    d.y -= 26;
    d.text(s.caption, { size: 10 });
    d.text(s.status, { size: 9, color: MUTED });
    d.gap(8);
  }

  d.gap(4);
  d.text(m.closing, { size: 9, color: MUTED });

  /* ---- execution record ---- */
  if (m.record) {
    d.need(90);
    d.gap(10);
    d.rule();
    d.gap(10);
    d.text("Execution record", { font: f.bold, size: 10.5 });
    d.gap(4);
    for (const line of m.record.lines) {
      d.text(line, { size: 8.6, lead: 12, color: MUTED });
      d.gap(4);
    }
    d.text(m.record.footnote, { size: 8.6, color: MUTED });
  }

  /* ---- footers ---- */
  const total = d.pages.length;
  d.pages.forEach((p, i) => {
    const label = `${m.footerLabel}  ·  Page ${i + 1} of ${total}`;
    const w = f.ui.widthOfTextAtSize(label, 8);
    p.drawText(label, { x: (PAGE_W - w) / 2, y: 34, size: 8, font: f.ui, color: MUTED });
  });

  return doc.save();
}
