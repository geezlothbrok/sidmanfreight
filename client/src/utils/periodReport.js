// Quarterly / period report — the deck-style summary the client asked for,
// as a single printable page.
//
// Every figure is computed by the API (get_report) and only rendered here, so
// the screen and the PDF cannot disagree. Bars are plain divs sized by
// percentage: no chart library, nothing to load, and it prints correctly.

import logoUrl from '../assets/images/logo-trimmed.jpg';

const COMPANY = {
  name: 'Sidman Freight Consult Ltd',
  tagline: 'Smart! Swift! Sustainable Freight Solutions',
  location: 'Tema, Ghana',
  phone: '024 221 6051',
  email: 'sidmanfreightconsultltd@gmail.com',
};

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const money = (n) =>
  `GH₵${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateLabel = (d) => {
  const x = new Date(String(d).slice(0, 10));
  return Number.isNaN(x.getTime())
    ? String(d)
    : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Quarter presets, so "1st Qtr 2026" is one click rather than two date pickers. */
export function quarterRange(year, q) {
  const startMonth = (q - 1) * 3;
  const from = new Date(Date.UTC(year, startMonth, 1));
  const to = new Date(Date.UTC(year, startMonth + 3, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export const periodLabel = (from, to) => `${dateLabel(from)} — ${dateLabel(to)}`;

/** Horizontal bars with the count at the end, mirroring the client's decks. */
function barBlock(title, rows, { total } = {}) {
  const max = Math.max(1, ...rows.map((r) => Number(r.n)));
  const sum = total ?? rows.reduce((a, r) => a + Number(r.n), 0);
  if (rows.length === 0) {
    return `<section class="rp-block"><h3>${esc(title)}</h3><p class="rp-empty">No data for this period.</p></section>`;
  }
  return `
    <section class="rp-block">
      <h3>${esc(title)}</h3>
      <ul class="rp-bars">
        ${rows.map((r) => {
          const n = Number(r.n);
          const pct = sum > 0 ? Math.round((n / sum) * 100) : 0;
          return `
          <li>
            <span class="rp-bar-label">${esc(r.label)}</span>
            <span class="rp-bar-track">
              <span class="rp-bar-fill" style="width:${Math.round((n / max) * 100)}%"></span>
            </span>
            <span class="rp-bar-value">${n} <em>(${pct}%)</em></span>
          </li>`;
        }).join('')}
      </ul>
    </section>`;
}

export function buildReportHtml(data, generatedBy) {
  const f = data.finance || {};
  const s = data.shipments || {};
  const income = Number(f.income || 0);
  const expense = Number(f.expense || 0);
  const scale = Math.max(income, expense, 1);

  const catRows = (data.finance_by_category || []).map((c) => `
    <tr>
      <td>${esc(c.category)}</td>
      <td class="c">${esc(String(c.t || '').replace(/^./, (x) => x.toUpperCase()))}</td>
      <td class="c">${c.n}</td>
      <td class="n">${money(c.total)}</td>
    </tr>`).join('');

  return `
  <div class="rp">
    <header class="rp-head">
      <img class="rp-logo" src="${logoUrl}" alt="">
      <div>
        <h1>${esc(COMPANY.name)}</h1>
        <p class="rp-tag">${esc(COMPANY.tagline)}</p>
        <p class="rp-contact">${esc(COMPANY.location)} · ${esc(COMPANY.phone)} · ${esc(COMPANY.email)}</p>
      </div>
    </header>
    <div class="rp-rule"></div>

    <div class="rp-meta">
      <h2>Operations &amp; Financial Report</h2>
      <dl>
        <div><dt>Period</dt><dd>${esc(periodLabel(data.from, data.to))}</dd></div>
        <div><dt>Generated</dt><dd>${esc(dateLabel(new Date().toISOString()))}</dd></div>
        <div><dt>Prepared by</dt><dd>${esc(generatedBy || '—')}</dd></div>
      </dl>
    </div>

    <section class="rp-kpis">
      <div class="k"><span>Shipments</span><strong>${s.total ?? 0}</strong><em>${s.avg_per_month ?? 0}/month avg</em></div>
      <div class="k"><span>Clients served</span><strong>${s.clients ?? 0}</strong><em>distinct</em></div>
      <div class="k k-in"><span>Income</span><strong>${money(income)}</strong><em>${f.income_count ?? 0} entries</em></div>
      <div class="k k-ex"><span>Expenditure</span><strong>${money(expense)}</strong><em>${f.expense_count ?? 0} entries</em></div>
      <div class="k ${Number(f.net) < 0 ? 'k-neg' : 'k-net'}"><span>Net position</span><strong>${money(f.net)}</strong><em>${f.margin_pct ?? 0}% margin</em></div>
    </section>

    <section class="rp-block">
      <h3>Income vs Expenditure</h3>
      <ul class="rp-bars rp-bars-money">
        <li>
          <span class="rp-bar-label">Income</span>
          <span class="rp-bar-track"><span class="rp-bar-fill in" style="width:${Math.round((income / scale) * 100)}%"></span></span>
          <span class="rp-bar-value">${money(income)}</span>
        </li>
        <li>
          <span class="rp-bar-label">Expenditure</span>
          <span class="rp-bar-track"><span class="rp-bar-fill ex" style="width:${Math.round((expense / scale) * 100)}%"></span></span>
          <span class="rp-bar-value">${money(expense)}</span>
        </li>
      </ul>
      ${catRows ? `
      <table class="rp-table">
        <thead><tr><th>Category</th><th class="c">Type</th><th class="c">Entries</th><th class="n">Amount</th></tr></thead>
        <tbody>${catRows}</tbody>
      </table>` : ''}
    </section>

    <div class="rp-two">
      ${barBlock('Shipments by Regime', data.by_regime || [], { total: s.total })}
      ${barBlock('Shipments by Consignment Type', data.by_consignment || [], { total: s.total })}
    </div>

    <div class="rp-two">
      ${barBlock('Shipments by Clearance Status', data.by_status || [], { total: s.total })}
      ${barBlock('Shipments by Agent', data.by_agent || [], { total: s.total })}
    </div>

    ${(() => {
      const d = data.demographics;
      if (!d || !d.n) {
        return `<section class="rp-block"><h3>Customer Demographics</h3>
          <p class="rp-empty">No customer records linked to shipments in this period.</p></section>`;
      }
      return `
      <h3 class="rp-section-head">Customer Demographics &nbsp;<em>N=${d.n}</em></h3>
      <div class="rp-two">
        ${barBlock('Gender', d.gender || [], { total: d.n })}
        ${barBlock('Marital Status', d.marital || [], { total: d.n })}
      </div>
      <div class="rp-two">
        ${barBlock('Religion', d.religion || [], { total: d.n })}
        ${barBlock('Nationality', d.nationality || [], { total: d.n })}
      </div>
      <div class="rp-two">
        ${barBlock('Occupation', d.occupation || [], { total: d.n })}
        ${barBlock('Location', d.location || [], { total: d.n })}
      </div>`;
    })()}

    <p class="rp-foot">
      ${esc(COMPANY.name)} — internal report covering ${esc(periodLabel(data.from, data.to))}.
      Figures are drawn from the operations portal at the generation time above.
    </p>
    <p class="rp-tagfoot">${esc(COMPANY.tagline)}</p>
  </div>`;
}

const REPORT_CSS = `
  #sfc-period-root { display: none; }
  @media print {
    @page { size: A4 portrait; margin: 12mm; }
    body > *:not(#sfc-period-root) { display: none !important; }
    #sfc-period-root { display: block !important; }

    .rp { font-family: Inter, Arial, sans-serif; color: #14213d; font-size: 9pt; }
    .rp-head { display: flex; align-items: center; gap: 14px; }
    .rp-logo { height: 46px; width: auto; }
    .rp-head h1 { margin: 0; font-size: 15pt; }
    .rp-tag { margin: 1px 0 0; font-size: 8pt; font-weight: 700; color: #b8860b; }
    .rp-contact { margin: 2px 0 0; font-size: 7.5pt; color: #566; }
    .rp-rule { height: 2px; background: #14213d; margin: 9px 0 12px; }

    .rp-meta { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
    .rp-meta h2 { margin: 0; font-size: 12pt; }
    .rp-meta dl { display: flex; gap: 16px; margin: 0; }
    .rp-meta dt { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .07em; color: #7a8290; }
    .rp-meta dd { margin: 1px 0 0; font-size: 8pt; font-weight: 600; }

    .rp-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 14px; }
    .rp-kpis .k { border: 1px solid #dfe4ec; border-radius: 5px; padding: 7px 8px; }
    .rp-kpis .k span { display: block; font-size: 6.5pt; text-transform: uppercase;
                       letter-spacing: .06em; color: #7a8290; }
    .rp-kpis .k strong { display: block; font-size: 12pt; margin-top: 2px; }
    .rp-kpis .k em { display: block; font-style: normal; font-size: 6.5pt; color: #7a8290; margin-top: 1px; }
    .rp-kpis .k-in strong { color: #147a3d; }
    .rp-kpis .k-ex strong { color: #a3242b; }
    .rp-kpis .k-net strong { color: #147a3d; }
    .rp-kpis .k-neg strong { color: #a3242b; }

    .rp-block { break-inside: avoid; margin-bottom: 13px; }
    .rp-block h3 { margin: 0 0 6px; font-size: 8.5pt; text-transform: uppercase;
                   letter-spacing: .06em; color: #14213d; border-bottom: 1.5px solid #dfe4ec;
                   padding-bottom: 3px; }
    .rp-empty { margin: 0; font-size: 8pt; color: #7a8290; font-style: italic; }

    .rp-bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .rp-bars li { display: grid; grid-template-columns: 8.5rem 1fr 5rem; align-items: center; gap: 7px; }
    .rp-bar-label { font-size: 7.5pt; }
    .rp-bar-track { height: 11px; background: #eef1f6; border-radius: 2px; overflow: hidden; }
    .rp-bar-fill { display: block; height: 100%; background: #14213d; }
    .rp-bar-fill.in { background: #147a3d; }
    .rp-bar-fill.ex { background: #a3242b; }
    .rp-bar-value { font-size: 7.5pt; font-weight: 700; text-align: right;
                    font-variant-numeric: tabular-nums; }
    .rp-bar-value em { font-style: normal; font-weight: 400; color: #7a8290; }
    .rp-bars-money li { grid-template-columns: 8.5rem 1fr 7rem; }

    .rp-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .rp-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 7.5pt; }
    .rp-table th { background: #14213d; color: #fff; text-align: left; padding: 4px 6px;
                   font-size: 6.8pt; text-transform: uppercase; letter-spacing: .05em; }
    .rp-table td { padding: 4px 6px; border-bottom: 1px solid #e6eaf1; }
    .rp-table .c { text-align: center; }
    .rp-table .n { text-align: right; font-variant-numeric: tabular-nums; }

    .rp-section-head { margin: 14px 0 8px; font-size: 10pt; text-transform: uppercase;
                       letter-spacing: .06em; border-bottom: 2px solid #14213d; padding-bottom: 4px; }
    .rp-section-head em { font-style: normal; font-weight: 400; font-size: 8pt; color: #7a8290; }
    .rp-foot { margin-top: 12px; font-size: 7pt; color: #7a8290; }
    .rp-tagfoot { margin: 2px 0 0; font-size: 8pt; font-weight: 700; color: #b8860b; text-align: center; }
  }
`;

export function printPeriodReport(data, generatedBy) {
  if (!data) return false;

  let style = document.getElementById('sfc-period-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'sfc-period-style';
    document.head.appendChild(style);
  }
  style.textContent = REPORT_CSS;

  let root = document.getElementById('sfc-period-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'sfc-period-root';
    document.body.appendChild(root);
  }
  root.innerHTML = buildReportHtml(data, generatedBy);

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
