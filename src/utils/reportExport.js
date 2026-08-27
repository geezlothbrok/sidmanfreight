// Shared export for the staff portal.
//
// Replaces the old `Object.keys(row)` CSV dump, which had three real problems:
//   - raw database column names as headings ("containerNo", "updatedBy")
//   - `String(value)` on the files array, printing "[object Object]"
//   - NULL columns coming through as the literal text "null"
//
// Two outputs from the same column definitions, so a PDF and a CSV of the same
// report always agree:
//   printReport()  — letterhead document, printed via the browser (Save as PDF)
//   downloadCsv()  — clean spreadsheet with the same headings and formatting

import logoUrl from '../assets/images/logo-trimmed.jpg';

const COMPANY = {
  name: 'Sidman Freight Consult Ltd',
  tagline: 'Smart! Swift! Sustainable Freight Solutions',
  location: 'Tema, Ghana',
  phones: ['024 221 6051', '026 524 0272'],
  emails: ['sidmanfreightconsultltd@gmail.com', 'info@sidmanfreightconsult.com'],
};

/* ---------------------------------------------------------------- formatting */

const isBlank = (v) =>
  v === null || v === undefined || v === '' || v === 'null' || v === 'NULL';

function formatDate(value, withTime = true) {
  if (isBlank(value)) return '—';
  // Postgres hands back "2026-08-23 11:37:20.294002"; Safari will not parse
  // that directly, so normalise to ISO before constructing the Date.
  const iso = String(value).trim().replace(' ', 'T').replace(/\.\d+$/, '');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  if (!withTime) return date;
  return `${date}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatMoney(value) {
  if (isBlank(value)) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `GH₵${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The old export printed "[object Object]" here — count the attachments instead. */
function formatAttachments(row) {
  const list = Array.isArray(row.files) ? row.files : [];
  const legacy = !isBlank(row.fileName) ? 1 : 0;
  const total = list.length || legacy;
  if (!total) return 'None';
  return total === 1 ? '1 document' : `${total} documents`;
}

const text = (v) => (isBlank(v) ? '—' : String(v));

/* ------------------------------------------------------------------ columns */

export const SHIPMENT_COLUMNS = [
  { header: 'Ref', accessor: (r) => text(r.id) },
  { header: 'Container / BL number', accessor: (r) => text(r.containerNo) },
  { header: 'Client', accessor: (r) => text(r.clientName) },
  { header: 'Route', accessor: (r) =>
      isBlank(r.origin) && isBlank(r.destination) ? '—' : `${text(r.origin)} → ${text(r.destination)}` },
  { header: 'Clearance status', accessor: (r) => text(r.status) },
  { header: 'Approved', accessor: (r) =>
      Number(r.approved) === 1 ? `Yes — ${formatDate(r.approved_at, false)}` : 'Awaiting approval' },
  { header: 'Logged by', accessor: (r) => text(r.updatedBy) },
  { header: 'Logged on', accessor: (r) => formatDate(r.timestamp) },
  { header: 'Last edited', accessor: (r) =>
      isBlank(r.edited_at) ? '—' : `${formatDate(r.edited_at, false)} by ${text(r.edited_by)}` },
  { header: 'Documents', accessor: formatAttachments },
  { header: 'Notes', accessor: (r) => text(r.notes) },
];

export const TRANSACTION_COLUMNS = [
  { header: 'Ref', accessor: (r) => text(r.id) },
  { header: 'Type', accessor: (r) => (isBlank(r.type) ? '—' : String(r.type).replace(/^./, (c) => c.toUpperCase())) },
  { header: 'Category', accessor: (r) => text(r.category) },
  { header: 'Amount', accessor: (r) => formatMoney(r.amount), align: 'right' },
  { header: 'Invoice / receipt no.', accessor: (r) => text(r.reference_no) },
  { header: 'Bill of lading', accessor: (r) => text(r.bill_of_lading) },
  { header: 'Identification no.', accessor: (r) => text(r.identification_no) },
  { header: 'Logged on', accessor: (r) => formatDate(r.date_logged) },
  { header: 'Notes', accessor: (r) => text(r.notes) },
];

export const EMPLOYEE_COLUMNS = [
  { header: 'Ref', accessor: (r) => text(r.id) },
  { header: 'Name', accessor: (r) => text(r.name) },
  { header: 'Email', accessor: (r) => text(r.email) },
  { header: 'Phone', accessor: (r) => text(r.phone) },
  { header: 'Department', accessor: (r) => text(r.role) },
  { header: 'Base salary', accessor: (r) => formatMoney(r.base_salary), align: 'right' },
  { header: 'Status', accessor: (r) => text(r.status) },
  { header: 'Portal access', accessor: (r) => (Number(r.portal_access) === 1 ? 'Enabled' : 'Disabled') },
  { header: 'Added on', accessor: (r) => formatDate(r.created_at, false) },
];

export const AUDIT_COLUMNS = [
  { header: 'Ref', accessor: (r) => text(r.id) },
  { header: 'When', accessor: (r) => formatDate(r.created_at) },
  { header: 'User', accessor: (r) => text(r.actor_email) },
  { header: 'Event', accessor: (r) => (isBlank(r.event_type) ? '—' : String(r.event_type).replace(/^./, (c) => c.toUpperCase())) },
  { header: 'Detail', accessor: (r) => text(r.description) },
];

/** Pick the right column set from the report name used at the call site. */
export function columnsFor(reportKey) {
  if (/shipment|manifest/i.test(reportKey)) return SHIPMENT_COLUMNS;
  if (/ledger|transaction|financ/i.test(reportKey)) return TRANSACTION_COLUMNS;
  if (/employee|payroll|staff/i.test(reportKey)) return EMPLOYEE_COLUMNS;
  if (/audit/i.test(reportKey)) return AUDIT_COLUMNS;
  return null;
}

/** "Approved_Shipments" -> "Approved Shipments" */
export const titleFor = (reportKey) => String(reportKey).replace(/[_-]+/g, ' ').trim();

/* ------------------------------------------------------------------- output */

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildReportHtml({ title, columns, rows, generatedBy }) {
  const now = new Date();
  const head = columns
    .map((c) => `<th${c.align === 'right' ? ' class="num"' : ''}>${escapeHtml(c.header)}</th>`)
    .join('');
  const body = rows
    .map((r) => `<tr>${columns
      .map((c) => `<td${c.align === 'right' ? ' class="num"' : ''}>${escapeHtml(c.accessor(r))}</td>`)
      .join('')}</tr>`)
    .join('');

  return `
    <div class="rpt">
      <header class="rpt-head">
        <img class="rpt-logo" src="${logoUrl}" alt="">
        <div class="rpt-id">
          <h1>${escapeHtml(COMPANY.name)}</h1>
          <p class="rpt-tagline">${escapeHtml(COMPANY.tagline)}</p>
          <p class="rpt-contact">
            ${escapeHtml(COMPANY.location)} &nbsp;·&nbsp; ${COMPANY.phones.map(escapeHtml).join(' &nbsp;·&nbsp; ')}<br>
            ${COMPANY.emails.map(escapeHtml).join(' &nbsp;·&nbsp; ')}
          </p>
        </div>
      </header>

      <div class="rpt-rule"></div>

      <div class="rpt-meta">
        <h2>${escapeHtml(title)}</h2>
        <dl>
          <div><dt>Generated</dt><dd>${escapeHtml(formatDate(now.toISOString()))}</dd></div>
          <div><dt>Prepared by</dt><dd>${escapeHtml(generatedBy || '—')}</dd></div>
          <div><dt>Records</dt><dd>${rows.length}</dd></div>
        </dl>
      </div>

      <table class="rpt-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>

      <p class="rpt-foot">
        ${escapeHtml(COMPANY.name)} — internal document. Figures are accurate as at the
        generation time above.
      </p>
    </div>`;
}

const PRINT_CSS = `
  #sfc-report-root { display: none; }
  @media print {
    @page { size: A4 landscape; margin: 14mm; }
    body > *:not(#sfc-report-root) { display: none !important; }
    #sfc-report-root { display: block !important; }
    .rpt { font-family: Inter, system-ui, sans-serif; color: #14213d; }
    .rpt-head { display: flex; align-items: center; gap: 16px; }
    .rpt-logo { height: 54px; width: auto; }
    .rpt-id h1 { margin: 0; font-size: 17pt; letter-spacing: -0.2pt; }
    .rpt-tagline { margin: 2px 0 0; font-size: 8.5pt; color: #b8860b; font-weight: 600; }
    .rpt-contact { margin: 4px 0 0; font-size: 7.5pt; color: #566; line-height: 1.5; }
    .rpt-rule { height: 2px; background: #14213d; margin: 10px 0 14px; }
    .rpt-meta { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
    .rpt-meta h2 { margin: 0; font-size: 13pt; }
    .rpt-meta dl { display: flex; gap: 18px; margin: 0; }
    .rpt-meta dt { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.08em; color: #7a8290; }
    .rpt-meta dd { margin: 1px 0 0; font-size: 8.5pt; font-weight: 600; }
    .rpt-table { width: 100%; border-collapse: collapse; font-size: 7.8pt; }
    .rpt-table thead { display: table-header-group; }  /* repeat header on every page */
    .rpt-table th { text-align: left; background: #14213d; color: #fff; padding: 6px 7px;
                    font-size: 6.8pt; text-transform: uppercase; letter-spacing: 0.05em; }
    .rpt-table td { padding: 6px 7px; border-bottom: 1px solid #e3e7ee; vertical-align: top; }
    .rpt-table tr { break-inside: avoid; }
    .rpt-table tbody tr:nth-child(even) td { background: #f7f9fc; }
    .rpt-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .rpt-foot { margin-top: 14px; font-size: 7pt; color: #7a8290; }
  }
`;

/**
 * Renders the report into a hidden node in the current document and opens the
 * print dialog (where the user picks "Save as PDF"). Deliberately not a popup
 * window — those get blocked, and a same-document node keeps the logo loading
 * from the app's own origin.
 */
export function printReport({ reportKey, rows, generatedBy, columns }) {
  const cols = columns || columnsFor(reportKey);
  if (!cols || !rows || rows.length === 0) return false;

  let style = document.getElementById('sfc-report-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'sfc-report-style';
    document.head.appendChild(style);
  }
  style.textContent = PRINT_CSS;

  let root = document.getElementById('sfc-report-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'sfc-report-root';
    document.body.appendChild(root);
  }
  root.innerHTML = buildReportHtml({
    title: titleFor(reportKey), columns: cols, rows, generatedBy,
  });

  const go = () => window.print();
  const img = root.querySelector('img');
  // Print only once the letterhead logo has decoded, or it prints blank.
  if (img && !img.complete) {
    img.addEventListener('load', go, { once: true });
    img.addEventListener('error', go, { once: true });
  } else {
    go();
  }
  return true;
}

/** Same columns and formatting as the PDF, as a spreadsheet. */
export function downloadCsv({ reportKey, rows, columns }) {
  const cols = columns || columnsFor(reportKey);
  if (!cols || !rows || rows.length === 0) return false;

  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    cols.map((c) => cell(c.header)).join(','),
    ...rows.map((r) => cols.map((c) => cell(c.accessor(r))).join(',')),
  ];
  // BOM so Excel opens GH₵ and the arrow in the Route column as UTF-8.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportKey}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
