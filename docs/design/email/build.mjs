// Builds the five option renders for the signer confirmation email.
// node docs/design/email/build.mjs   (writes board/d0, d0p, d1, d2, d3 plus .html copies)
// Every email below is table-based, inline-styled markup. The stage (frames) is only the board.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'board');

const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const unk = t => `<span data-unknown style="border-bottom:1px dashed currentColor">[${esc(t)}]</span>`;

/* ----------------------------------------------------------------- brands */
const SM = { name: 'Sun Mountain Stays', legal: 'Sun Mountain Stays LLC', card: '#fffdf8', paper: '#faf7f0', ground: '#f3ede1',
  ink: '#16120c', body: '#3f382d', muted: '#6b6152', rule: '#e5dac4', accent: '#a9791f', accentText: '#8a5e12',
  forest: '#0d2318', brass: '#e0b866', ivory: '#f1ebdd', sig: '#1b2a52', mark: 'assets/sun-mountain-mark-256.png',
  serif: 'Newsreader', sans: 'Instrument Sans', wm: 'Cinzel', wmText: 'SUN MOUNTAIN STAYS', email: 'hello@sunmountainstays.com' };
const LN = { name: 'Palisade Stays', legal: 'Palisade Stays', card: '#fffefb', paper: '#fbf8f1', ground: '#f3ede1',
  ink: '#1b1a16', body: '#3d382e', muted: '#6b6455', rule: '#e5dac4', accent: '#33566f', accentText: '#2a475c',
  forest: '#2a475c', brass: '#cfe0ec', ivory: '#f3ede1', sig: '#22304f', mark: null,
  serif: 'Newsreader', sans: 'Schibsted Grotesk', wm: 'Newsreader', wmText: '243 LINCOLN', email: 'jake@palisadestays.com' };

/* ------------------------------------------------------------------ data */
const slug = s => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const MIKE = {
  state: 'complete', B: SM,
  title: 'Management Agreement', subtitle: '309 Cranbrook Circle, Colorado Springs, Colorado',
  short: '309 Cranbrook Circle', first: 'Michael', signer: 'Michael Williams', signedAt: 'November 11, 2026, 6:59 PM MST',
  tagline: 'Short term rental management, Colorado Springs',
  rows: [['Property', '309 Cranbrook Circle, Colorado Springs, Colorado'], ['Start date', 'November 1, 2026'],
    ['Management fee', '15% of Net Revenue, 10% for stays of 30 nights or longer'], ['Onboarding fee', '$0, waived'],
    ['Notice to end', '30 days']],
  pdf: slug('309 Cranbrook Circle, Colorado Springs, Colorado') + '-executed.pdf',
  link: 'https://sunmountainstays.com/client/michael-williams/management-agreement',
  next: 'Cranbrook goes live Friday, November 13, 2026.', nextDate: 'Friday, November 13, 2026', nextWhat: 'Cranbrook goes live',
  fromEmail: 'hello@sunmountainstays.com', fromName: 'Jake Lee', to: 'Michael Williams',
  subject: 'Signed: Sun Mountain Stays Management Agreement, 309 Cranbrook Circle',
  preheader: 'Your Management Agreement is signed and complete. The signed PDF is attached.',
  gdate: 'Wed, Nov 11, 6:59 PM', idate: '6:59 PM',
};
const LINC = {
  state: 'waiting', B: LN,
  title: 'New Jersey Residential Lease', subtitle: '243 Lincoln Avenue, Unit 2, Cliffside Park, New Jersey 07010',
  short: '243 Lincoln Avenue, Unit 2', first: null, signer: null, signedAt: null,
  tagline: 'Managing 243 Lincoln for the owner',
  rows: [['The apartment', '243 Lincoln Avenue, Unit 2'], ['Rent, all in', '$3,995 a month'], ['Made up of', '$3,695 rent, $300 parking'],
    ['Due', 'The 1st of each month'], ['Deposit, refundable', '$3,695 at signing'], ['Late after the 1st', '$250']],
  pdf: slug('243 Lincoln Avenue, Unit 2, Cliffside Park, New Jersey 07010') + '-draft.pdf',
  link: '#', waitingOn: 'Jamarber Dobrushi', waitingRole: 'the landlord',
  fromEmail: 'jake@palisadestays.com', fromName: 'Jake Lee', to: 'the tenant',
  subject: 'Your signature is recorded: Unit 2, 243 Lincoln Avenue',
  preheader: 'The landlord still needs to sign. The completed lease will follow by email.',
  gdate: 'Today', idate: 'Now',
};
const who = D => D.signer ? esc(D.signer) : unk('tenant name, entered at signing');
const when = D => D.signedAt ? esc(D.signedAt) : unk('time stamped at signing');
const BOOK = (color) => `<a href="https://jakejjlee.com/meet" style="color:${color};text-decoration:underline;text-underline-offset:3px">book a call</a>`;

/* ------------------------------------------------------------- email bits */
function ff(c) { // font stacks, as this client shows them
  const gmail = c.client === 'gmail', B = c.D.B;
  return {
    serif: gmail ? "Georgia,'Times New Roman',serif" : `'${B.serif}',Georgia,'Times New Roman',serif`,
    sans: gmail ? "'Helvetica Neue',Helvetica,Arial,sans-serif" : `'${B.sans}','Helvetica Neue',Helvetica,Arial,sans-serif`,
    wm: gmail ? "Georgia,'Times New Roman',serif" : `'${B.wm}',Georgia,'Times New Roman',serif`,
  };
}
const pre = t => `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:transparent">${esc(t)}</div>`;
function button({ href, label, bg, color, font, width = 260, block = false, radius = 8 }) {
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:52px;v-text-anchor:middle;width:${width}px" arcsize="15%" fillcolor="${bg}" stroke="f"><w:anchorlock/><center style="color:${color};font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${href}" style="display:${block ? 'block' : 'inline-block'};box-sizing:border-box;${block ? 'width:100%;' : ''}background:${bg};color:${color};font-family:${font};font-size:16px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;padding:16px 28px;border-radius:${radius}px;min-height:52px">${esc(label)}</a><!--<![endif]-->`;
}
const sheet = (bg, inner, max = 600, pad = '0') => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="background:${bg}"><tr><td align="center" style="padding:${pad}">
<!--[if mso]><table role="presentation" width="${max}" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<div style="max-width:${max}px;margin:0 auto;text-align:left">${inner}</div>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table>`;
const img = (src, w, alt, bg) => `<img src="${src}" width="${w}" height="${w}" alt="${esc(alt)}" style="display:block;width:${w}px;height:${w}px;border:0;background:${bg}" bgcolor="${bg}">`;
const lead = (D, B, F) => D.B.mark
  ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:12px">${img(B.mark, 44, B.name, '#1f4a30')}</td>`
  : '';

/* ---------------------------------------------------------------- OPTION 0 */
// The current signerEmail() + shell() + rows(), reproduced as written (sizes, faces and the phone line included).
function d0(c) {
  const D = c.D, B = D.B, done = D.state === 'complete';
  const ground = '#f3ede1', paper = B.paper, accent = B.accent;
  const rows = D.rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e5dac4;font-family:system-ui,sans-serif;font-size:14px;color:#6b6455">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #e5dac4;text-align:right;font-family:ui-monospace,SFMono-Regular,monospace;font-size:14px;color:#1b1a16">${esc(v)}</td></tr>`).join('');
  const status = done ? 'Everyone named on it has now signed. Your completed copy is attached.'
    : `${esc(D.waitingOn)} still needs to sign. The copy attached shows it as it stands, and you will get the completed one once they have.`;
  return `<div style="margin:0;padding:28px 18px;background:${ground};font-family:Georgia,'Times New Roman',serif">
<div style="max-width:560px;margin:0 auto;background:${paper};border:1px solid #ddd2bb;padding:32px 30px">
<p style="margin:0 0 22px;font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${accent}">${esc(D.title)}</p>
<h1 style="margin:0 0 6px;font-size:23px;line-height:1.15;font-weight:400;color:#1b1a16">${done ? 'This agreement is complete' : 'Your signature is recorded'}</h1>
<p style="margin:0 0 24px;font-size:15px;color:#6b6455">${esc(D.subtitle)}</p>
<p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#3d382e">Thank you, ${who(D)}. You signed on ${when(D)}.</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#3d382e">${status}</p>
<table style="border-collapse:collapse;width:100%;margin:0 0 20px">${rows}</table>
<p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;line-height:1.6;color:#6b6455">Version ${unk('version date')}. Reference ${unk('fingerprint, first 16 characters')}. Keep the attached PDF.</p>
<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e5dac4;font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;color:#6b6455">${esc(B.name)}, ${esc(D.tagline.toLowerCase())}.<br>Call or text <span style="color:${accent}">${unk('brand phone, supplied by the site')}</span>.</p>
</div></div>`;
}

/* --------------------------------------------------------------- OPTION 0+ */
// Same skeleton, same words, same order. Real faces, painted-in mark, 16px floor, honest contrast,
// one 52px button under the status line, the phone line replaced by reply and book a call.
function d0p(c) {
  const D = c.D, B = D.B, F = ff(c), done = D.state === 'complete';
  const rows = D.rows.map(([k, v]) => `<tr><td valign="top" style="padding:12px 16px 12px 0;border-bottom:1px solid ${B.rule};font-family:${F.sans};font-size:15px;line-height:22px;color:${B.muted}">${esc(k)}</td><td valign="top" align="right" style="padding:12px 0;border-bottom:1px solid ${B.rule};font-family:${F.sans};font-size:16px;line-height:22px;font-weight:600;color:${B.ink}">${esc(v)}</td></tr>`).join('');
  const status = done ? 'Everyone named on it has now signed. Your completed copy is attached.'
    : `${esc(D.waitingOn)} still needs to sign. The copy attached shows it as it stands, and you will get the completed one once they have.`;
  const label = `<td valign="middle" style="font-family:${F.sans};font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${B.accentText};font-weight:600">${esc(D.title)}</td>`;
  const head = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px"><tr>${B.mark ? `<td valign="middle" style="padding-right:12px">${img(B.mark, 44, B.name, '#1f4a30')}</td>` : ''}${label}</tr></table>`;
  return sheet(B.ground, `<div style="background:${B.paper};border:1px solid #ddd2bb;padding:32px 28px;font-family:${F.serif}">
${pre(D.preheader)}${head}
<h1 style="margin:0 0 8px;font-family:${F.serif};font-size:30px;line-height:36px;font-weight:400;color:${B.ink}">${done ? 'This agreement is complete' : 'Your signature is recorded'}</h1>
<p style="margin:0 0 24px;font-family:${F.sans};font-size:16px;line-height:24px;color:${B.muted}">${esc(D.subtitle)}</p>
<p style="margin:0 0 18px;font-family:${F.serif};font-size:18px;line-height:28px;color:${B.body}">Thank you, ${who(D)}. You signed on ${when(D)}.</p>
<p style="margin:0 0 24px;font-family:${F.serif};font-size:18px;line-height:28px;color:${B.body}">${status}</p>
<div style="margin:0 0 26px">${button({ href: D.link, label: done ? 'Open your signed copy' : 'Open your copy', bg: B.accentText, color: '#ffffff', font: F.sans })}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 20px">${rows}</table>
<p style="margin:0;font-family:${F.sans};font-size:14px;line-height:22px;color:${B.muted}">Version ${unk('version date')}. Reference ${unk('fingerprint, first 16 characters')}. Keep the attached PDF.</p>
<p style="margin:26px 0 0;padding-top:18px;border-top:1px solid ${B.rule};font-family:${F.sans};font-size:14px;line-height:22px;color:${B.muted}">${esc(B.name)}, ${esc(D.tagline.toLowerCase())}.<br>Reply to this email to reach us, or ${BOOK(B.accentText)}.</p>
</div>`, 600, '28px 14px');
}

/* ---------------------------------------------------------------- D1 The Letter */
function d1(c) {
  const D = c.D, B = D.B, F = ff(c), done = D.state === 'complete';
  const rows = D.rows.map(([k, v]) => `<tr><td style="padding:12px 0 13px;border-bottom:1px dotted #b9ad92"><p style="margin:0;font-family:${F.sans};font-size:14px;line-height:20px;color:${B.muted}">${esc(k)}</p><p style="margin:2px 0 0;font-family:${F.serif};font-size:19px;line-height:26px;color:${B.ink}">${esc(v)}</p></td></tr>`).join('');
  const p = (t, mb = 18) => `<p style="margin:0 0 ${mb}px;font-family:${F.serif};font-size:19px;line-height:30px;color:${B.body}">${t}</p>`;
  const greet = D.first ? `${esc(D.first)},` : 'Hello,';
  const body = done
    ? p(`Your ${esc(D.title)} for ${esc(D.short)} is signed and complete. You signed it on ${when(D)}. The signed PDF is attached to this email, and the button opens the same copy online.`)
    : p(`Your signature is recorded: ${who(D)}, ${when(D)}. ${esc(D.waitingOn)}, ${esc(D.waitingRole)}, still has to sign. The PDF attached shows the lease as it stands today. When ${esc(D.waitingRole)} has signed, the completed lease comes to you by email.`);
  const next = done ? p(esc(D.next), 26) : p('Nothing else is needed from you for now.', 26);
  const mark = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 34px"><tr>${B.mark ? `<td valign="middle" style="padding-right:12px">${img(B.mark, 40, B.name, '#1f4a30')}</td>` : ''}<td valign="middle" style="font-family:${F.serif};font-size:20px;color:${B.ink}">${esc(B.name)}</td></tr></table>`;
  return sheet(B.paper, `<div style="padding:36px 24px 40px">
${pre(D.preheader)}${mark}
<h1 style="margin:0 0 22px;font-family:${F.serif};font-size:40px;line-height:44px;font-weight:400;color:${B.ink}">${done ? 'Signed, and complete.' : 'Signed on your side.'}</h1>
${p(greet, 12)}${body}
<p style="margin:30px 0 4px;font-family:${F.sans};font-size:15px;line-height:22px;font-weight:600;color:${B.ink}">${done ? 'What you agreed to' : 'What you signed'}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 30px">${rows}</table>
${next}
<div style="margin:0 0 36px">${button({ href: D.link, label: done ? 'Open your signed copy' : 'Open your copy', bg: B.accentText, color: '#ffffff', font: F.sans })}</div>
<p style="margin:0 0 2px;font-family:${F.serif};font-size:26px;line-height:32px;font-style:italic;color:${B.sig}">${esc(D.fromName)}</p>
<p style="margin:0 0 30px;font-family:${F.sans};font-size:15px;line-height:22px;color:${B.muted}">${esc(B.legal)}</p>
<p style="margin:0;padding-top:18px;border-top:2px solid ${B.rule};font-family:${F.sans};font-size:14px;line-height:22px;color:${B.muted}">Reply to this email and it reaches us. If you would rather talk, ${BOOK(B.accentText)}.<br>Fingerprint of the signed text: ${unk('printed from the signed record')}</p>
</div>`, 600, '0');
}

/* ---------------------------------------------------------------- D2 The Receipt */
function d2(c) {
  const D = c.D, B = D.B, F = ff(c), done = D.state === 'complete';
  const pill = done
    ? `<span style="display:inline-block;background:#e1eee4;color:#1c4a2d;font-family:${F.sans};font-size:14px;line-height:20px;font-weight:600;padding:4px 12px;border-radius:999px">Complete</span>`
    : `<span style="display:inline-block;background:#f6e6c4;color:#5e400a;font-family:${F.sans};font-size:14px;line-height:20px;font-weight:600;padding:4px 12px;border-radius:999px">Waiting on 1 signature</span>`;
  const rows = D.rows.map(([k, v], i) => `<tr><td valign="top" style="padding:13px 16px 13px 0;white-space:nowrap;${i ? 'border-top:1px solid #ece7db;' : ''}font-family:${F.sans};font-size:15px;line-height:22px;color:${B.muted}">${esc(k)}</td><td valign="top" align="right" style="padding:13px 0;${i ? 'border-top:1px solid #ece7db;' : ''}font-family:${F.sans};font-size:16px;line-height:22px;font-weight:600;color:${B.ink}">${esc(v)}</td></tr>`).join('');
  const sub = done ? `Signed by ${who(D)} on ${when(D)}.` : `Signed by ${who(D)}, ${when(D)}. Waiting on ${esc(D.waitingOn)}, ${esc(D.waitingRole)}.`;
  const nextText = done ? esc(D.next) : `${esc(D.waitingOn)} signs, then the completed lease is emailed to you. Nothing else is needed from you.`;
  const head = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px"><tr>${B.mark ? `<td valign="middle" style="padding-right:12px">${img(B.mark, 40, B.name, '#1f4a30')}</td>` : ''}<td valign="middle" style="font-family:${F.sans};font-size:16px;font-weight:600;color:${B.ink}">${esc(B.name)}</td></tr></table>`;
  return sheet('#efece4', `${pre(D.preheader)}<div style="max-width:600px;background:#ffffff;border:1px solid #e3ded1;border-radius:16px;padding:28px 24px">
${head}${pill}
<h1 style="margin:14px 0 8px;font-family:${F.serif};font-size:32px;line-height:38px;font-weight:500;color:${B.ink}">${done ? esc(D.title) + ' signed' : 'Your signature is recorded'}</h1>
<p style="margin:0 0 4px;font-family:${F.sans};font-size:16px;line-height:24px;color:${B.ink}">${esc(D.short)}</p>
<p style="margin:0 0 24px;font-family:${F.sans};font-size:15px;line-height:24px;color:${B.muted}">${sub}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e3ded1;border-radius:12px;margin:0 0 16px"><tr><td width="64" align="center" valign="middle" style="padding:14px 0 14px 14px"><div style="width:44px;height:52px;line-height:52px;background:#f4efe3;border-radius:8px;font-family:${F.sans};font-size:14px;font-weight:700;color:${B.accentText};text-align:center">PDF</div></td><td valign="middle" style="padding:14px 14px 14px 12px"><p style="margin:0;font-family:${F.sans};font-size:15px;line-height:21px;font-weight:600;color:${B.ink};overflow-wrap:anywhere">${esc(D.pdf)}</p><p style="margin:2px 0 0;font-family:${F.sans};font-size:14px;line-height:20px;color:${B.muted}">Attached to this email${done ? '' : ', as it stands today'}</p></td></tr></table>
<div style="margin:0 0 28px">${button({ href: D.link, label: done ? 'Open your signed copy' : 'Open your copy', bg: B.ink, color: '#ffffff', font: F.sans, block: true, radius: 10 })}</div>
<p style="margin:0 0 4px;font-family:${F.sans};font-size:15px;line-height:22px;font-weight:600;color:${B.ink}">Key terms</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 22px">${rows}</table>
<div style="border:1px solid #ece7db;background:#f7f4ec;border-radius:12px;padding:16px 18px"><p style="margin:0 0 4px;font-family:${F.sans};font-size:15px;line-height:22px;color:${B.muted}">Next</p><p style="margin:0;font-family:${F.sans};font-size:16px;line-height:24px;font-weight:600;color:${B.ink}">${nextText}</p></div>
</div>
<p style="margin:0;padding:20px 24px 0;font-family:${F.sans};font-size:14px;line-height:22px;color:${B.muted}">Reply to this email to reach ${esc(B.name)}, or ${BOOK(B.accentText)}.</p>
<p style="margin:0;padding:6px 24px 0;font-family:${F.sans};font-size:14px;line-height:22px;color:${B.muted}">${esc(B.legal)}. Fingerprint: ${unk('printed from the signed record')}</p>`, 600, '24px 12px 32px');
}

/* ---------------------------------------------------------------- D3 The Track */
function d3(c) {
  const D = c.D, B = D.B, F = ff(c), done = D.state === 'complete';
  const box = (state, n) => state === 'done'
    ? `<div style="width:28px;height:28px;line-height:28px;background:${B.forest};color:${B.brass};text-align:center;font-family:${F.sans};font-size:16px;font-weight:700;border-radius:6px">&#10003;</div>`
    : state === 'now'
      ? `<div style="width:28px;height:28px;line-height:24px;border:2px solid ${B.forest};color:${B.forest};text-align:center;font-family:${F.sans};font-size:14px;font-weight:700;border-radius:6px;background:#ffffff">${n}</div>`
      : `<div style="width:28px;height:28px;line-height:24px;border:2px dashed #8f8570;color:#5c5446;text-align:center;font-family:${F.sans};font-size:14px;font-weight:700;border-radius:6px">${n}</div>`;
  const step = (state, n, title, detail, last) => `<tr><td width="44" valign="top" align="left" style="padding:0">${box(state, n)}${last ? '' : `<div style="width:2px;height:30px;background:${state === 'done' ? B.forest : '#cfc6b0'};margin:4px 0 4px 13px"></div>`}</td><td valign="top" style="padding:0 0 ${last ? 0 : 14}px 0"><p style="margin:0;font-family:${F.serif};font-size:21px;line-height:28px;color:${B.ink}">${title}</p><p style="margin:2px 0 0;font-family:${F.sans};font-size:15px;line-height:22px;color:${B.muted}">${detail}</p></td></tr>`;
  const steps = done
    ? step('done', 1, 'You signed', `${who(D)}, ${when(D)}`) + step('done', 2, 'Agreement complete', 'Every party has signed. The signed PDF is attached.') + step('now', 3, esc(D.nextWhat), esc(D.nextDate), true)
    : step('done', 1, 'You signed', `${who(D)}, ${when(D)}`) + step('now', 2, `${esc(D.waitingOn)} signs`, `${esc(D.waitingRole.replace(/^./, m => m.toUpperCase()))}. The lease is not complete until then.`) + step('later', 3, 'You get the completed lease', 'By email, as a PDF, from this address.', true);
  const rows = D.rows.map(([k, v]) => `<tr><td valign="top" width="38%" style="padding:12px 12px 12px 0;border-top:1px solid ${B.rule};font-family:${F.sans};font-size:15px;line-height:22px;color:${B.muted}">${esc(k)}</td><td valign="top" style="padding:12px 0;border-top:1px solid ${B.rule};font-family:${F.serif};font-size:18px;line-height:24px;color:${B.ink}">${esc(v)}</td></tr>`).join('');
  const band = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${B.forest};padding:26px 24px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${B.mark ? `<td valign="middle" style="padding-right:14px">${img(B.mark, 52, B.name, '#1f4a30')}</td>` : ''}<td valign="middle"><p style="margin:0;font-family:${F.wm};font-size:${B.mark ? 17 : 20}px;line-height:24px;letter-spacing:.16em;color:${B.ivory}">${esc(B.wmText)}</p><p style="margin:2px 0 0;font-family:${F.sans};font-size:14px;line-height:20px;color:${B.brass}">${esc(B.mark ? D.title : B.name)}</p></td></tr></table></td></tr></table>`;
  return sheet(B.ivory, `${pre(D.preheader)}${band}<div style="background:${B.paper};padding:34px 24px 30px">
<h1 style="margin:0 0 6px;font-family:${F.serif};font-size:34px;line-height:40px;font-weight:400;color:${B.ink}">${done ? 'It is signed and complete.' : 'Your signature is recorded.'}</h1>
<p style="margin:0 0 28px;font-family:${F.sans};font-size:16px;line-height:24px;color:${B.muted}">${esc(D.short)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 30px">${steps}</table>
<div style="margin:0 0 34px">${button({ href: D.link, label: done ? 'Open your signed copy' : 'Open your copy', bg: B.forest, color: B.ivory, font: F.sans, radius: 6 })}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:1px solid ${B.rule}">${rows}</table>
<p style="margin:16px 0 0;font-family:${F.sans};font-size:14px;line-height:22px;color:${B.muted};overflow-wrap:anywhere">${esc(D.pdf)} is attached. Fingerprint: ${unk('printed from the signed record')}</p>
</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${B.forest};padding:22px 24px"><p style="margin:0;font-family:${F.sans};font-size:15px;line-height:24px;color:${B.ivory}">Reply to this email and it reaches ${esc(B.name)}. Or ${BOOK(B.brass)}.</p><p style="margin:6px 0 0;font-family:${F.sans};font-size:14px;line-height:22px;color:${B.brass}">${esc(B.legal)}</p></td></tr></table>`, 600, '0');
}

/* ------------------------------------------------------------------ frames */
function gmailFrame(D, body, hue) {
  return `<div class="gm"><div class="gm-top"><span class="gm-subject">${esc(D.subject)}</span><span class="gm-chip">Inbox</span></div>
<div class="gm-sender"><span class="gm-av" style="background:${hue}">${esc(D.B.name.charAt(0))}</span><div class="gm-who"><div><b>${esc(D.B.name)}</b> <span class="gm-addr">&lt;${esc(D.fromEmail)}&gt;</span></div><div class="gm-to">to ${esc(D.to)}</div></div><span class="gm-date">${esc(D.gdate)}</span></div>
<div class="gm-body">${body}<div class="gm-att"><div class="gm-att-n">1 Attachment</div><div class="gm-att-chip"><span class="gm-pdf">PDF</span><span>${esc(D.pdf)}</span></div></div></div></div>`;
}
function phoneFrame(D, body, hue) {
  return `<div class="ph"><div class="ph-nav"><span>&#8249; Inbox</span></div>
<div class="ph-head"><span class="gm-av" style="background:${hue}">${esc(D.B.name.charAt(0))}</span><div class="ph-who"><div><b>${esc(D.B.name)}</b></div><div class="ph-to">To: ${esc(D.to)}</div></div><span class="ph-time">${esc(D.idate)}</span></div>
<div class="ph-subject">${esc(D.subject)}</div><div class="ph-body">${body}</div>
<div class="ph-att"><span class="gm-pdf">PDF</span><span>${esc(D.pdf)}</span></div></div>`;
}

const CSS = `
:root{color-scheme:light only}
*{box-sizing:border-box}
body{margin:0;color:#1d1b16;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
.wrap{max-width:1000px;margin:0 auto;padding:24px 0 72px}
.opt{padding:0 16px;margin:0 0 4px;font-size:26px;line-height:32px;font-weight:700}
.opt-sub{padding:0 16px;margin:0 0 8px;font-size:15px;color:#4a463d}
.sfc{margin:40px 0 0}
.sfc h2{padding:0 16px;margin:0 0 6px;font-size:17px;line-height:24px;font-weight:700}
.sfc .meta{padding:0 16px;margin:0 0 14px;font-size:14px;line-height:21px;color:#4a463d}
.sfc .meta b{color:#1d1b16}
.gm{background:#fff;border:1px solid #dadce0;border-radius:10px;overflow:hidden;max-width:100%;color:#202124;font:14px/20px Arial,Helvetica,sans-serif}
.gm-top{padding:16px 20px 8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.gm-subject{font-size:22px;line-height:28px;color:#202124}
.gm-chip{background:#e8eaed;border-radius:4px;padding:1px 8px;font-size:13px;color:#3c4043}
.gm-sender{padding:8px 20px 14px;display:flex;align-items:center;gap:12px}
.gm-av{width:40px;height:40px;border-radius:50%;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:18px;flex:none}
.gm-who{flex:1;min-width:0}.gm-addr,.gm-to{color:#5f6368}.gm-date{color:#5f6368;font-size:13px;flex:none}
.gm-body{padding:6px 20px 20px 72px}
.gm-att{margin:18px 0 0;border-top:1px solid #e8eaed;padding-top:12px}
.gm-att-n{font-size:13px;color:#5f6368;margin:0 0 8px}
.gm-att-chip,.ph-att{display:flex;align-items:center;gap:10px;border:1px solid #dadce0;border-radius:8px;padding:8px 12px;font-size:14px;color:#202124;max-width:520px;overflow-wrap:anywhere}
.gm-pdf{background:#d93025;color:#fff;font:700 13px/20px Arial,sans-serif;padding:0 6px;border-radius:3px;flex:none}
.ph{width:390px;max-width:100vw;margin:0 auto;background:#fff;border-top:1px solid #c9c5bb;border-bottom:1px solid #c9c5bb;color:#000;font:15px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
.ph-nav{padding:12px 16px 4px;color:#0a60d6;font-size:17px}
.ph-head{display:flex;align-items:center;gap:12px;padding:8px 16px}
.ph-who{flex:1;min-width:0}.ph-to,.ph-time{color:#5c5c61;font-size:14px}
.ph-subject{padding:4px 16px 12px;font-size:19px;line-height:25px;font-weight:600;border-bottom:1px solid #e5e5ea}
.ph-att{margin:14px 16px 20px}
@media (max-width:760px){.gm-body{padding:6px 0 16px}.gm-att{margin:18px 16px 0}.gm-top,.gm-sender{padding-left:16px;padding-right:16px}}
`;
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Instrument+Sans:wght@400;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Schibsted+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">`;

function page(label, name, faces, fn, pal) {
  const m = MIKE, l = LINC;
  const s1 = gmailFrame(m, fn({ D: m, client: 'gmail' }), '#8e5a2b');
  const s2 = phoneFrame(m, fn({ D: m, client: 'apple' }), '#8e5a2b');
  const s3 = phoneFrame(l, fn({ D: l, client: 'apple' }), '#33566f');
  const meta = D => `<b>Subject:</b> ${esc(D.subject)}<br><b>From:</b> ${esc(D.B.name)} &lt;${esc(D.fromEmail)}&gt;<br><b>Preview text:</b> ${esc(D.preheader)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Signer confirmation email, option ${esc(label)}</title>${FONTS}<style>:root{--ground:${pal[0]};--accent:${pal[1]}}body{background:${pal[0]}}${CSS}</style></head><body data-medium="email" data-surface="document" data-no-hero="transactional email: opens on the status line, no hero by design"><main class="wrap">
<h1 class="opt">${esc(name)}</h1><p class="opt-sub">${esc(faces)}</p>
<section class="sfc"><h2>1) Gmail on desktop, light. Michael Williams, completed agreement.</h2><p class="meta">${meta(m)}<br><b>Faces as Gmail shows them:</b> the web faces do not load, so the Georgia and Helvetica fallback shows.</p>${s1}</section>
<section class="sfc"><h2>2) iPhone Mail, 390 px. The same email.</h2><p class="meta"><b>Faces as Apple Mail shows them:</b> the web faces load.</p>${s2}</section>
<section class="sfc"><h2>3) Waiting for the other party. Lincoln lease, Palisade Stays brand, iPhone Mail.</h2><p class="meta">${meta(l)}</p>${s3}</section>
</main></body></html>`;
}

const OPTS = [
  ['d0', '0', 'Current sign-kit email', 'Georgia, system-ui, mono. Live in the kit; the Sun Mountain site sends nothing yet.', d0],
  ['d0p', '0+', 'Same skeleton, done properly', 'Newsreader + Instrument Sans. Same words and order, painted-in mark, 16px floor, one button.', d0p],
  ['d1', '1', 'The Letter', 'Newsreader leads at 19px, Instrument Sans for labels. Prose on paper.', d1],
  ['d2', '2', 'The Receipt', 'Instrument Sans leads, Newsreader on the headline only. White card, rows, full-width button.', d2],
  ['d3', '3', 'The Track', 'Newsreader + Instrument Sans, Cinzel on the wordmark only. Forest bands, a three-step track.', d3],
];
const PAL = { d0: ['#e6e2d8', '#a9791f'], d0p: ['#f3ede1', '#8a5e12'], d1: ['#faf7f0', '#8a5e12'], d2: ['#efece4', '#1c4a2d'], d3: ['#e9dfc6', '#e0b866'] };
fs.mkdirSync(OUT, { recursive: true });
for (const [key, label, name, faces, fn] of OPTS) {
  const html = page(label, label + ' · ' + name, faces, fn, PAL[key]);
  fs.writeFileSync(path.join(OUT, key), html);
  fs.writeFileSync(path.join(OUT, key + '.html'), html);
}
console.log('wrote', OPTS.map(o => o[0]).join(' '));
