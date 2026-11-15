// Round 2 email board: shared helpers, brand tokens and the real content of each surface.
// Every term, party, wording line and logo below comes from a repo (sign-kit, sun-mountain-stays,
// palisade, plfa-submissions, roam-north-agreement, the letterhead brand files). Signing dates and
// times in the samples are stand-ins for a real send.

export const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);

/* ----------------------------------------------------------------- color -- */
const rgb = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};
export const mix = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
};
const darken = (h, t) => mix("#000000", h, t);
/** First candidate reading 4.5:1 on bg; else darken the first until it does. */
export const readable = (bg, ...c) => {
  const ok = c.find((x) => contrast(x, bg) >= 4.5);
  if (ok) return ok;
  let x = c[0], t = 0.05;
  while (contrast(x, bg) < 4.5 && t < 1) x = darken(c[0], (t += 0.05));
  return x;
};

/* ----------------------------------------------------------------- type -- */
const SANS = "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";
const NEWS = "Newsreader,'Iowan Old Style',Charter,Georgia,serif";
const EBG = "'EB Garamond',Garamond,'Iowan Old Style',Charter,Georgia,serif";
const CINZEL = "Cinzel,'Trajan Pro',Georgia,serif";

export const fontsLink = (b) => {
  const fam = b.serifKey === "ebg"
    ? "family=EB+Garamond:wght@400;500;600"
    : "family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600";
  const extra = b.key === "sms" ? "&family=Cinzel:wght@500" : "";
  return `https://fonts.googleapis.com/css2?${fam}&family=Instrument+Sans:wght@400;500;600;700${extra}&display=swap`;
};

/* ---------------------------------------------------------------- brands -- */
function brand(o) {
  const paper = o.paper;
  const accent = readable(paper, o.accent, o.deep, o.ink);
  const tint = mix(o.gold, paper, 0.14);
  const tint2 = mix(o.gold, paper, 0.3);
  const onDeep = readable(o.deep, "#ffffff", paper);
  const muted = readable(paper, o.muted, o.ink);
  const mutedOnGround = readable(o.ground, o.muted, o.ink);
  const mutedOnTint = readable(tint, o.muted, o.ink);
  const goldOnDeep = readable(o.deep, o.gold, "#ffffff");
  return { ...o, accent, tint, tint2, onDeep, muted, mutedOnGround, mutedOnTint, goldOnDeep };
}

export const BRANDS = {
  sms: brand({
    key: "sms", name: "Sun Mountain Stays", serifKey: "news", serif: NEWS, sans: SANS, wordmarkFont: CINZEL,
    ink: "#0d2318", muted: "#3a464e", paper: "#fbf8f0", ground: "#efe9db", rule: "#e2ddd1", gold: "#c8912f", deep: "#0d2318", accent: "#7a5410",
    logo: { src: "assets/sms-mark.png", w: 256, h: 256, alt: "Sun Mountain Stays", markOnly: true },
    mark: { src: "assets/sms-mark.png", w: 256, h: 256, alt: "Sun Mountain Stays" },
    reply: "hello@sunmountainstays.com", legal: "Sun Mountain Stays LLC",
  }),
  ps: brand({
    key: "ps", name: "Palisade Stays", serifKey: "ebg", serif: EBG, sans: SANS,
    ink: "#2a2d31", muted: "#55585e", paper: "#ffffff", ground: "#f4f3f1", rule: "#d5cdc3", gold: "#b5975a", deep: "#2a2d31", accent: "#6b5328",
    logo: { src: "assets/ps-horizontal.png", w: 957, h: 236, alt: "Palisade Stays" },
    mark: { src: "assets/ps-icon.png", w: 475, h: 475, alt: "Palisade Stays" },
    reply: "hello@palisadestays.com", legal: "Palisade Stays LLC.",
  }),
  xenia: brand({
    key: "xenia", name: "Xenia", serifKey: "news", serif: NEWS, sans: SANS,
    ink: "#1f1d19", muted: "#6a655e", paper: "#fffef9", ground: "#efebe0", rule: "#e0dac9", gold: "#a8823a", deep: "#4e5231", accent: "#4e5231",
    logo: { src: "assets/xenia-horizontal.png", w: 1799, h: 379, alt: "Xenia, Remote Operations Desk" },
    mark: { src: "assets/xenia-tile.png", w: 180, h: 180, alt: "Xenia" },
    reply: "jake@xenia.host", legal: "Xenia LLC, the company that builds and runs the Roam North direct-booking site.",
  }),
  plfa: brand({
    key: "plfa", name: "Perry Lawson Fine Art", serifKey: "ebg", serif: EBG, sans: SANS,
    ink: "#141414", muted: "#5c5c5c", paper: "#ffffff", ground: "#f4f4f2", rule: "#e2e2df", gold: "#b5622f", deep: "#141414", accent: "#9a4f24",
    logo: { src: "assets/plfa-wordmark.png", w: 579, h: 115, alt: "Perry Lawson Fine Art" },
    mark: { src: "assets/plfa-wordmark.png", w: 579, h: 115, alt: "Perry Lawson Fine Art" },
    reply: "info@perrylawsonfineart.com", legal: "Perry Lawson Fine Art LLC",
  }),
};

/* -------------------------------------------------------------- surfaces -- */
const BOOK = "https://jakejjlee.com/meet";

export const SURFACES = {
  /* 1. Signer confirmation, waiting on others. Palisade, 36 River Road. */
  waiting: {
    key: "", slug: "waiting", brand: "ps", kind: "waiting", label: "Signed, waiting on others", tabBrand: "Palisade",
    subject: "36 River Road | Management Agreement | Signed by Ismail Canseven, November 11, 2026",
    preheader: "Jake Lee still needs to sign. You get the completed agreement when he does.",
    headline: "Your River Road signature is recorded.",
    lead: ["Palisade Stays countersigns on receipt. When Jake Lee signs, the agreement is complete and you get the finished PDF from this address."],
    status: "Signed 1 of 2",
    doc: {
      title: "Management Agreement", place: "36 River Road, Oakland, New Jersey",
      rows: [
        ["Property", "Unit A (lower) and Unit B (upper)"],
        ["Model", "Two furnished residences, 31-night minimum stay"],
        ["Management fee", "15% of collected lodging revenue, both units"],
        ["Setup and onboarding", "$600, one time, both units"],
        ["Cleaning", "Separate from the management fee, no markup"],
        ["Term", "Month-to-month, 30 days written notice"],
      ],
    },
    parties: [
      { name: "Ismail Canseven", role: "Owner", state: "signed", when: "November 11, 2026, 6:59 PM EST" },
      { name: "Jake Lee", role: "Manager", state: "waiting" },
    ],
    tiles: [
      { v: "15%", l: "of collected lodging revenue" },
      { v: "$600", l: "setup, one time, both units" },
      { v: "31 nights", l: "minimum stay" },
      { v: "30 days", l: "written notice to end" },
    ],
    rail: [["Document", "Management Agreement"], ["Property", "36 River Road"], ["Signed", "Nov 11, 2026"], ["Version", "Sep 30, 2026"]],
    button: { label: "Open your copy", url: "https://palisadestays.com/clients/oakland/river-road/agreement" },
    attach: "36-River-Road-Management-Agreement-partly-signed.pdf is attached, as it stands with the signatures so far.",
    reply: true, fine: "Version September 30, 2026. Keep this email for your records.",
  },
  /* 2. Signer confirmation, fully signed, PDF attached. Sun Mountain, 309 Cranbrook. */
  complete: {
    key: "complete", slug: "complete", brand: "sms", kind: "complete", label: "Fully signed, PDF attached", tabBrand: "Sun Mountain",
    subject: "309 Cranbrook Circle | Management Agreement | Fully signed, November 11, 2026",
    preheader: "Your Management Agreement with Sun Mountain Stays is signed and complete.",
    headline: "Your agreement is signed and complete.",
    lead: ["Every party has signed. The signed PDF is attached."],
    status: "Complete",
    doc: {
      title: "Management Agreement", place: "309 Cranbrook Circle, Colorado Springs, Colorado",
      rows: [
        ["Start date", "November 1, 2026"],
        ["Management fee", "10% of Net Revenue"],
        ["Onboarding fee", "None"],
        ["Term", "Month to month"],
        ["Notice to end", "30 days notice, after the first 90 days"],
      ],
    },
    parties: [
      { name: "Michael Williams", role: "Owner", state: "signed", when: "November 11, 2026, 6:59 PM MST" },
      { name: "Jake Lee", role: "Manager", state: "signed", when: "Sun Mountain Stays" },
    ],
    tiles: [
      { v: "10%", l: "of Net Revenue" },
      { v: "Nov 1", l: "start date, 2026" },
      { v: "None", l: "onboarding fee" },
      { v: "30 days", l: "notice, after the first 90 days" },
    ],
    rail: [["Document", "Management Agreement"], ["Property", "309 Cranbrook Circle"], ["Signed", "Nov 11, 2026"], ["Status", "Complete"]],
    button: { label: "Open your signed copy", url: "https://sunmountainstays.com/client/michael-williams/management-agreement" },
    attach: "The signed PDF is attached.",
    reply: true, fine: "Keep this email for your records.",
  },
  /* 3. Operator alert to Jake. Xenia, Roam North website agreement. */
  alert: {
    key: "alert", slug: "alert", brand: "xenia", kind: "alert", label: "Operator alert to Jake", tabBrand: "Xenia, Roam North",
    subject: "Roam North Stays | Direct-Booking Website Agreement | Fully signed, November 14, 2026",
    preheader: "Zachary Lindquist signed. The agreement is complete and the signed PDF is attached.",
    headline: "Zachary Lindquist signed. It is complete.",
    lead: ["Every party has signed. The executed agreement is attached."],
    status: "Complete",
    doc: {
      title: "Signature record", place: "Roam North Stays, Euclid Grand, Cleveland",
      rows: [
        ["Signed by", "Zachary Lindquist"],
        ["When", "November 14, 2026, 8:40 PM EST"],
        ["Agreement", "Direct-Booking Website Agreement"],
        ["Build price", "$5,000, nothing up front"],
        ["Until repaid", "50% of the nightly rate on site bookings"],
        ["After that", "10%, for as long as the site runs"],
      ],
    },
    parties: [
      { name: "Zachary Lindquist", role: "Client", state: "signed", when: "November 14, 2026, 8:40 PM EST" },
      { name: "Xenia LLC", role: "Builder", state: "signed", when: "Jake Lee" },
    ],
    tiles: [
      { v: "Complete", l: "every party has signed" },
      { v: "8:40 PM", l: "Nov 14, 2026, Eastern" },
      { v: "$5,000", l: "build price, nothing up front" },
      { v: "50%, then 10%", l: "of the nightly rate on site bookings" },
    ],
    rail: [["Agreement", "Direct-Booking Website Agreement"], ["Client", "Roam North Stays"], ["Signed by", "Zachary Lindquist"], ["Reference", "rn-zach-c08wy4mr9n1w"]],
    button: { label: "Open the signed agreement", url: "https://xenia.host/clients/zach/website-agreement/rn-zach-c08wy4mr9n1w/pdf" },
    attach: "The executed PDF is attached. The signature record is filed in the agreements folder on the shared drive. This email is the notification, not the record.",
    reply: false, notice: true, fine: "Reference rn-zach-c08wy4mr9n1w.",
  },
  /* 4. Form confirmation. Palisade inquiry receipt, Jake's approved wording. */
  form: {
    key: "form", slug: "form", brand: "ps", kind: "form", label: "Form receipt", tabBrand: "Palisade",
    subject: "Palisade Stays | Inquiry received | Full-Service Management, November 14, 2026",
    preheader: "Your inquiry arrived. I review every one personally and reply within one business day.",
    headline: "Your inquiry has arrived.",
    lead: [
      "Thank you for writing in. Your inquiry arrived, and I review every one personally.",
      "You'll hear back from me within one business day. If you'd rather talk sooner, reply to this email.",
    ],
    status: "Received",
    doc: { title: "Your inquiry", place: "For your records, here's what you sent:", rows: [["Reason", "Full-Service Management"], ["Property", "Bergen County, NJ"]] },
    parties: [],
    tiles: [{ v: "1 business day", l: "to hear back from Jake" }, { v: "Full-Service Management", l: "what you asked about" }],
    rail: [["Received", "Nov 14, 2026"], ["Reply expected", "Within one business day"]],
    button: null,
    after: ["To choose a time to talk, book a call with me here: [jakejjlee.com/meet](https://jakejjlee.com/meet)"],
    signoff: { name: "Jake Lee", title: "Founder, Palisade Stays" },
    reply: false, fine: "",
  },
  /* 5. Fully signed, another brand and a state with no button. Perry Lawson Fine Art. */
  plfa: {
    key: "plfa", slug: "plfa", brand: "plfa", kind: "complete", label: "Fully signed, no open button", tabBrand: "Perry Lawson",
    subject: "Perry Lawson Fine Art | Consignment Agreement | Fully signed, November 14, 2026",
    preheader: "Your Consignment Agreement with Perry Lawson Fine Art is signed and complete.",
    headline: "Your agreement is signed and complete.",
    lead: ["Every party has signed. The signed PDF is attached, and it is your copy."],
    status: "Complete",
    doc: {
      title: "Consignment Agreement", place: "Perry Lawson Fine Art LLC",
      rows: [
        ["Commission", "50% of the retail price of sold artworks"],
        ["Paid to the artist", "Within 30 days of the gallery receiving payment"],
        ["Term", "From delivery, ongoing until ended in writing by either party"],
        ["Shipping", "Packing and shipping are the artist's"],
        ["Insurance", "The gallery insures the work while on its premises"],
      ],
    },
    parties: [
      { name: "Carole Perry", role: "Gallery", state: "signed", when: "November 14, 2026, 3:15 PM EST" },
    ],
    tiles: [
      { v: "50%", l: "gallery commission on sales" },
      { v: "30 days", l: "to pay the artist after payment arrives" },
      { v: "Ongoing", l: "until ended in writing" },
      { v: "Artist", l: "pays packing and shipping" },
    ],
    rail: [["Document", "Consignment Agreement"], ["Gallery", "Perry Lawson Fine Art LLC"], ["Signed", "Nov 14, 2026"], ["Status", "Complete"]],
    button: null,
    attach: "Perry-Lawson-Fine-Art-Consignment-Agreement-signed.pdf is attached.",
    reply: true, fine: "Keep this email for your records.",
  },
};

export const SURFACE_ORDER = ["waiting", "complete", "alert", "form", "plfa"];

/** "[label](url)" inside a paragraph becomes a link in the brand's link color. */
export function inline(text, linkColor) {
  return esc(text).replace(/\[([^\]]+)\]\((https:[^)]+)\)/g, (_m, l, u) => `<a href="${u}" style="color:${linkColor};text-decoration:underline;text-underline-offset:3px">${l}</a>`);
}
export const BOOK_URL = BOOK;
