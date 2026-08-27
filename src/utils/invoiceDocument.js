// Printable invoice, laid out to match the company's existing spreadsheet
// invoice: letterhead, BILL TO block, the shipment reference grid, two charge
// sections with their own subtotals, then the totals stack and payment details.
//
// Totals are recomputed here from the same rule the API uses, so a printed
// invoice and the stored one can never disagree:
//   VAT applies to SUB TOTAL 2 (contract service charges) only.

import logoUrl from '../assets/images/logo-trimmed.jpg';

export const COMPANY = {
  name: 'Sidman Freight Consult Ltd',
  tagline: 'Smart! Swift! Sustainable Freight Solutions',
  gps: 'GPS GT-016-2189',
  address: 'Vertical Plaza, Community 6, First FL RM1',
  phone: '(233) 024 216 051',
  email: 'sidmanfreightconsultltd@gmail.com',
  bank: { name: 'STANBIC BANK GH LTD', branch: 'TEMA, COMM.1, MAIN', account: '9040013863894' },
  momo: '0242 216051 — AUSTIN OTOO AMANOR',
};

/** The default line items, matching the paper invoice's standing rows. */
export const DEFAULT_ITEMS = [
  { section: 1, description: 'CUSTOMS DUTY', qty: '', rate: '' },
  { section: 1, description: 'SHIPPING LINE - ONE', qty: '', rate: '' },
  { section: 1, description: 'SHIPPING LINE - DEMURRAGE', qty: '', rate: '' },
  { section: 1, description: 'TERMINAL HANDLING CHARGES', qty: '', rate: '' },
  { section: 2, description: 'DOCUMENTATION', qty: '', rate: '' },
  { section: 2, description: 'VALUATION', qty: '', rate: '' },
  { section: 2, description: 'GSA/CEPS/NS', qty: '', rate: '' },
  { section: 2, description: 'TRADE PLATE - DV #', qty: '', rate: '' },
  { section: 2, description: 'SERVICE CHARGE', qty: '', rate: '' },
];

export const SECTION_LABELS = {
  1: '3RD PARTY PAYMENTS — W/HT NOT APPLICABLE',
  2: 'CONTRACT SERVICE CHARGES — W/HT APPLICABLE',
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Same rule as invoice_totals() in manager_api.php. */
export function computeTotals(items, vatRate = 20, deposit = 0) {
  let sub1 = 0;
  let sub2 = 0;
  for (const it of items || []) {
    const amount = num(it.qty) * num(it.rate);
    if (Number(it.section) === 1) sub1 += amount;
    else sub2 += amount;
  }
  const subtotal = sub1 + sub2;
  const vat = Math.round(sub2 * (num(vatRate) / 100) * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;
  const dep = num(deposit);
  return {
    subTotal1: sub1, subTotal2: sub2, subtotal, vat, total,
    deposit: dep, balance: Math.round((total - dep) * 100) / 100,
  };
}

const money = (n) =>
  num(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Blank rows print as a dash, exactly as the paper invoice does. */
const cell = (v) => (v === '' || v === null || v === undefined || num(v) === 0 ? '-' : money(v));

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function formatDate(value) {
  if (!value) return '';
  const d = new Date(String(value).slice(0, 10));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function sectionRows(items, section) {
  return (items || [])
    .filter((i) => Number(i.section) === section)
    .map((i) => `
      <tr>
        <td>${esc(i.description)}</td>
        <td class="c">${i.qty === '' || i.qty === null || num(i.qty) === 0 ? '' : num(i.qty)}</td>
        <td class="n">${cell(i.rate)}</td>
        <td class="n">${cell(num(i.qty) * num(i.rate))}</td>
      </tr>`)
    .join('');
}

export function buildInvoiceHtml(inv) {
  const t = computeTotals(inv.items, inv.vat_rate, inv.deposit);

  return `
  <div class="inv">
    <table class="inv-frame">
      <tr>
        <td class="inv-brand" colspan="2">
          <img src="${logoUrl}" alt="">
          <div class="inv-brand-lines">
            <strong>${esc(COMPANY.gps)}</strong>
            <span>${esc(COMPANY.address)}</span>
            <span>Phone: ${esc(COMPANY.phone)}</span>
            <span>E-MAIL: ${esc(COMPANY.email)}</span>
          </div>
        </td>
        <td class="inv-title" colspan="2">INVOICE</td>
      </tr>
    </table>

    <table class="inv-meta">
      <tr>
        <th class="hd">BILL TO</th><th class="hd"></th>
        <th class="hd">INVOICE #</th><th class="hd">DATE</th>
      </tr>
      <tr>
        <td colspan="2" class="strong">${esc(inv.client_name)}</td>
        <td class="strong">${esc(inv.invoice_no)}</td>
        <td>${esc(formatDate(inv.invoice_date))}</td>
      </tr>
      <tr>
        <td class="lbl">ADD:</td><td>${esc(inv.client_address)}</td>
        <th class="hd">MODE</th><th class="hd">B/L NO:</th>
      </tr>
      <tr>
        <td class="lbl">PHONE:</td><td>${esc(inv.client_phone)}</td>
        <td>${esc(inv.mode)}</td><td>${esc(inv.bl_no)}</td>
      </tr>
      <tr>
        <td colspan="2" class="boxed">${esc(inv.subject)}</td>
        <th class="hd">SIMPLE/CONSOLIDATED</th>
        <td>${esc(inv.consolidation)}</td>
      </tr>
    </table>

    <table class="inv-items">
      <thead>
        <tr>
          <th>DESCRIPTION OF SERVICE</th><th class="c">QTY</th>
          <th class="n">RATE /GHC</th><th class="n">AMOUNT/GHC</th>
        </tr>
      </thead>
      <tbody>
        <tr class="sec"><td colspan="4">${esc(SECTION_LABELS[1])}</td></tr>
        ${sectionRows(inv.items, 1)}
        <tr class="sub"><td colspan="3">SUB TOTAL 1</td><td class="n">${money(t.subTotal1)}</td></tr>

        <tr class="sec"><td colspan="4">${esc(SECTION_LABELS[2])}</td></tr>
        ${sectionRows(inv.items, 2)}
        <tr class="sub"><td colspan="3">SUB TOTAL 2</td><td class="n">${money(t.subTotal2)}</td></tr>
      </tbody>
    </table>

    <table class="inv-foot">
      <tr>
        <td class="pay" rowspan="4">
          <p class="pay-title">PAYMENT OPTIONS</p>
          <dl>
            <div><dt>BANK NAME</dt><dd>${esc(COMPANY.bank.name)}</dd></div>
            <div><dt>BRANCH</dt><dd>${esc(COMPANY.bank.branch)}</dd></div>
            <div><dt>A/C NO:</dt><dd>${esc(COMPANY.bank.account)}</dd></div>
            <div><dt>MTN MOMO</dt><dd>${esc(COMPANY.momo)}</dd></div>
          </dl>
        </td>
        <td class="tl">SUBTOTAL</td><td class="n">${money(t.subtotal)}</td>
      </tr>
      <tr>
        <td class="tl vat">FLAT VAT ${num(inv.vat_rate)}%</td>
        <td class="n vat">GHC${money(t.vat)}</td>
      </tr>
      <tr><td class="tl big">TOTAL BILL</td><td class="n big">${money(t.total)}</td></tr>
      <tr><td class="tl">DEPOSIT</td><td class="n">${money(t.deposit)}</td></tr>
    </table>

    <table class="inv-bal">
      <tr><td class="tl">OUTSTANDING BAL:</td><td class="n">GHC${money(t.balance)}</td></tr>
    </table>

    ${inv.notes ? `<p class="inv-notes">${esc(inv.notes)}</p>` : ''}

    <p class="inv-contact">
      If you have any questions about this invoice, please contact<br>
      <strong>${esc(COMPANY.name.toUpperCase())} at ${esc(COMPANY.phone)}</strong>
    </p>
    <p class="inv-tagline">${esc(COMPANY.tagline)}</p>
  </div>`;
}

const INVOICE_CSS = `
  #sfc-invoice-root { display: none; }
  @media print {
    @page { size: A4 portrait; margin: 12mm; }
    body > *:not(#sfc-invoice-root) { display: none !important; }
    #sfc-invoice-root { display: block !important; }

    .inv { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 9pt; }
    .inv table { width: 100%; border-collapse: collapse; }
    .inv td, .inv th { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
    .inv .c { text-align: center; }
    .inv .n { text-align: right; font-variant-numeric: tabular-nums; }
    .inv .strong { font-weight: 700; }
    .inv .lbl { width: 4.5rem; color: #333; }

    .inv-frame .inv-brand { width: 62%; }
    .inv-brand { display: table-cell; }
    .inv-brand img { height: 42px; width: auto; float: left; margin-right: 10px; }
    .inv-brand-lines { overflow: hidden; line-height: 1.45; font-size: 8pt; }
    .inv-brand-lines strong, .inv-brand-lines span { display: block; }
    .inv-title { text-align: center; font-weight: 700; color: #1F5C99; font-size: 12pt;
                 letter-spacing: 0.05em; }

    .inv-meta { margin-top: -1px; }
    .inv-meta .hd { background: #1F5C99; color: #fff; font-size: 8pt; text-align: left; }
    .inv-meta .boxed { font-weight: 600; }

    .inv-items { margin-top: 10px; }
    .inv-items thead th { background: #1F5C99; color: #fff; font-size: 8pt; }
    .inv-items .sec td { background: #CFE3F5; color: #C00000; font-weight: 700;
                         font-size: 8pt; text-align: center; }
    .inv-items .sub td { font-weight: 700; text-align: right; }
    .inv-items .sub td:first-child { text-align: center; }

    .inv-foot { margin-top: 10px; }
    .inv-foot .pay { width: 52%; vertical-align: top; }
    .inv-foot .pay-title { margin: 0 0 4px; font-style: italic; font-weight: 700;
                           text-align: center; color: #1F5C99; }
    .inv-foot dl { margin: 0; }
    .inv-foot dl > div { display: flex; gap: 8px; font-size: 8pt; padding: 1px 0; }
    .inv-foot dt { font-weight: 700; font-style: italic; color: #1F5C99; min-width: 5.5rem; }
    .inv-foot dd { margin: 0; font-style: italic; font-weight: 600; }
    .inv-foot .tl { font-weight: 700; }
    .inv-foot .vat { background: #4FA3DE; color: #fff; font-weight: 700; }
    .inv-foot .big { background: #CFE3F5; font-weight: 700; font-size: 10pt; }

    .inv-bal td { background: #2E9B57; color: #fff; font-weight: 700; font-size: 11pt; }
    .inv-bal .tl { width: 52%; }

    .inv-notes { margin: 10px 0 0; font-size: 8pt; }
    .inv-contact { margin: 14px 0 2px; text-align: center; font-size: 8.5pt; }
    .inv-tagline { margin: 0; text-align: center; color: #C00000; font-weight: 700; font-size: 9.5pt; }
  }
`;

/** Renders into a hidden node and opens the print dialog (Save as PDF). */
export function printInvoice(invoice) {
  if (!invoice) return false;

  let style = document.getElementById('sfc-invoice-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'sfc-invoice-style';
    document.head.appendChild(style);
  }
  style.textContent = INVOICE_CSS;

  let root = document.getElementById('sfc-invoice-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'sfc-invoice-root';
    document.body.appendChild(root);
  }
  root.innerHTML = buildInvoiceHtml(invoice);

  const go = () => window.print();
  const img = root.querySelector('img');
  if (img && !img.complete) {
    img.addEventListener('load', go, { once: true });
    img.addEventListener('error', go, { once: true });
  } else {
    go();
  }
  return true;
}
