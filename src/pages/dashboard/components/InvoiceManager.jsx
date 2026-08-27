import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiPrinter, FiSave, FiX } from 'react-icons/fi';
import {
  Card, CardHeader, CardTitle, CardActions, Button, Badge,
  Table, TableHeader, TableSearch, TableContent, TableFooter, TablePagination, useTableState,
  Field, FieldLabel, FieldControl, Input, Dropdown,
  Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription,
} from '@rfdtech/components';

import { authFetch } from '../../../utils/authFetch';
import {
  DEFAULT_ITEMS, SECTION_LABELS, computeTotals, printInvoice,
} from '../../../utils/invoiceDocument';

const money = (n) =>
  Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const blank = () => ({
  id: '', invoice_no: '', invoice_date: new Date().toISOString().slice(0, 10),
  client_name: '', client_address: '', client_phone: '', subject: '',
  mode: 'INBOUND - SEA', bl_no: '', consolidation: 'CONSO',
  vat_rate: 20, deposit: 0, status: 'Draft', notes: '',
  items: DEFAULT_ITEMS.map((i) => ({ ...i })),
});

export default function InvoiceManager({ apiUrl, onToast }) {
  const [invoices, setInvoices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const table = useTableState({ paramPrefix: 'invoices', defaultPageSize: 10 });

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`${apiUrl}?action=get_invoices`);
      const data = await res.json().catch(() => []);
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load invoices.');
    }
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  // Totals recompute as the user types, using the same rule the server applies.
  const totals = useMemo(
    () => (editing ? computeTotals(editing.items, editing.vat_rate, editing.deposit) : null),
    [editing]
  );

  const setField = (k) => (e) =>
    setEditing((v) => ({ ...v, [k]: e?.target ? e.target.value : e }));

  const setItem = (index, key) => (e) =>
    setEditing((v) => {
      const items = v.items.map((it, i) =>
        i === index ? { ...it, [key]: e.target.value } : it
      );
      return { ...v, items };
    });

  const addRow = (section) =>
    setEditing((v) => ({ ...v, items: [...v.items, { section, description: '', qty: '', rate: '' }] }));

  const removeRow = (index) =>
    setEditing((v) => ({ ...v, items: v.items.filter((_, i) => i !== index) }));

  /** Pre-fills the next number in the SIDMANFCL### series. */
  const newInvoice = async () => {
    const draft = blank();
    try {
      const res = await authFetch(`${apiUrl}?action=next_invoice_no`);
      const data = await res.json().catch(() => ({}));
      if (data.invoice_no) draft.invoice_no = data.invoice_no;
    } catch {
      /* leave it blank for the user to type */
    }
    setEditing(draft);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(editing).forEach(([k, val]) => {
        if (k !== 'items' && k !== 'totals') fd.append(k, val ?? '');
      });
      fd.append('items', JSON.stringify(editing.items));
      const res = await authFetch(`${apiUrl}?action=save_invoice`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onToast?.({ title: 'Invoice saved', variant: 'success' });
        setEditing(null);
        load();
      } else {
        setError(data.error || 'Could not save the invoice.');
      }
    } catch {
      setError('Could not reach the portal.');
    }
    setSaving(false);
  };

  const remove = async (row) => {
    const fd = new FormData();
    fd.append('id', row.id);
    await authFetch(`${apiUrl}?action=delete_invoice`, { method: 'POST', body: fd }).catch(() => {});
    load();
  };

  const columns = [
    { id: 'invoice_no', header: 'Invoice #', sortable: true, cell: ({ row }) => <strong>{row.invoice_no}</strong> },
    { id: 'client_name', header: 'Client', sortable: true, cell: ({ row }) => row.client_name },
    { id: 'subject', header: 'Subject', cell: ({ row }) => row.subject || '—' },
    { id: 'bl_no', header: 'B/L no.', cell: ({ row }) => row.bl_no || '—' },
    {
      id: 'total', header: 'Total', cell: ({ row }) =>
        <span className="inv-amount">GH₵{money(row.totals?.total)}</span>,
    },
    {
      id: 'balance', header: 'Outstanding', cell: ({ row }) =>
        <span className="inv-amount">GH₵{money(row.totals?.balance)}</span>,
    },
    {
      id: 'status', header: 'Status', cell: ({ row }) => (
        <Badge variant={row.status === 'Paid' ? 'success' : row.status === 'Issued' ? 'info' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="inv-row-actions">
          <Button variant="ghost" size="sm" aria-label="Print invoice" onClick={() => printInvoice(row)}>
            <FiPrinter />
          </Button>
          <Button
            variant="ghost" size="sm" aria-label="Edit invoice"
            onClick={() => setEditing({
              ...row,
              items: (row.items || []).map((i) => ({ ...i, qty: i.qty ?? '', rate: i.rate ?? '' })),
            })}
          >
            <FiEdit2 />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Delete invoice" onClick={() => remove(row)}>
            <FiTrash2 />
          </Button>
        </div>
      ),
    },
  ];

  const filtered = invoices.filter((i) =>
    !table.search ||
    `${i.invoice_no} ${i.client_name} ${i.subject} ${i.bl_no}`.toLowerCase().includes(table.search.toLowerCase())
  );
  const pageSize = table.pageSize || 10;
  const paged = filtered.slice((table.page - 1) * pageSize, table.page * pageSize);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Client Invoices</CardTitle>
          <CardActions>
            <Button variant="primary" size="sm" onClick={newInvoice}>
              <FiPlus /> New Invoice
            </Button>
          </CardActions>
        </CardHeader>
        <Table variant="soft" paramPrefix="invoices">
          <TableHeader><TableSearch placeholder="Search invoices..." /></TableHeader>
          <TableContent variant="soft" columns={columns} data={paged} rowKey={(r) => r.id} />
          <TableFooter>
            <TablePagination
              totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))}
              totalItems={filtered.length}
            />
          </TableFooter>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="inv-dialog">
            <DialogTitle>{editing?.id ? `Edit invoice ${editing.invoice_no}` : 'New invoice'}</DialogTitle>
            <DialogDescription>
              Every field is editable. VAT is charged on the contract service
              charges only — third-party payments pass through untaxed.
            </DialogDescription>

            {editing ? (
              <div className="inv-form">
                <div className="inv-grid">
                  <Field><FieldLabel>Invoice #</FieldLabel><FieldControl>
                    <Input value={editing.invoice_no} onChange={setField('invoice_no')} placeholder="SIDMANFCL003" />
                  </FieldControl></Field>
                  <Field><FieldLabel>Date</FieldLabel><FieldControl>
                    <Input type="date" value={editing.invoice_date?.slice(0, 10) || ''} onChange={setField('invoice_date')} />
                  </FieldControl></Field>
                  <Field><FieldLabel>Status</FieldLabel><FieldControl>
                    <Dropdown
                      aria-label="Status"
                      value={editing.status}
                      onValueChange={(v) => setEditing((s) => ({ ...s, status: v ?? 'Draft' }))}
                      options={['Draft', 'Issued', 'Paid'].map((v) => ({ value: v, label: v }))}
                    />
                  </FieldControl></Field>
                </div>

                <div className="inv-grid">
                  <Field><FieldLabel>Client name</FieldLabel><FieldControl>
                    <Input value={editing.client_name} onChange={setField('client_name')} />
                  </FieldControl></Field>
                  <Field><FieldLabel>Client phone</FieldLabel><FieldControl>
                    <Input value={editing.client_phone} onChange={setField('client_phone')} />
                  </FieldControl></Field>
                  <Field><FieldLabel>Address</FieldLabel><FieldControl>
                    <Input value={editing.client_address} onChange={setField('client_address')} />
                  </FieldControl></Field>
                </div>

                <div className="inv-grid">
                  <Field><FieldLabel>Subject</FieldLabel><FieldControl>
                    <Input value={editing.subject} onChange={setField('subject')} placeholder="2019 HAVAL H6" />
                  </FieldControl></Field>
                  <Field><FieldLabel>Mode</FieldLabel><FieldControl>
                    <Input value={editing.mode} onChange={setField('mode')} />
                  </FieldControl></Field>
                  <Field><FieldLabel>B/L no.</FieldLabel><FieldControl>
                    <Input value={editing.bl_no} onChange={setField('bl_no')} />
                  </FieldControl></Field>
                </div>

                {[1, 2].map((section) => (
                  <div key={section} className="inv-section">
                    <p className="inv-section-title">{SECTION_LABELS[section]}</p>
                    <table className="inv-edit-table">
                      <thead>
                        <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th><th /></tr>
                      </thead>
                      <tbody>
                        {editing.items.map((it, i) =>
                          Number(it.section) !== section ? null : (
                            <tr key={i}>
                              <td><Input value={it.description} onChange={setItem(i, 'description')} /></td>
                              <td><Input value={it.qty} onChange={setItem(i, 'qty')} inputMode="decimal" /></td>
                              <td><Input value={it.rate} onChange={setItem(i, 'rate')} inputMode="decimal" /></td>
                              <td className="inv-amount-cell">
                                {money(Number(it.qty || 0) * Number(it.rate || 0))}
                              </td>
                              <td>
                                <Button variant="ghost" size="sm" aria-label="Remove line" onClick={() => removeRow(i)}>
                                  <FiX />
                                </Button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                    <Button variant="secondary" size="sm" onClick={() => addRow(section)}>
                      <FiPlus /> Add line
                    </Button>
                  </div>
                ))}

                <div className="inv-grid">
                  <Field><FieldLabel>VAT rate (%)</FieldLabel><FieldControl>
                    <Input value={editing.vat_rate} onChange={setField('vat_rate')} inputMode="decimal" />
                  </FieldControl></Field>
                  <Field><FieldLabel>Deposit</FieldLabel><FieldControl>
                    <Input value={editing.deposit} onChange={setField('deposit')} inputMode="decimal" />
                  </FieldControl></Field>
                </div>

                {totals ? (
                  <dl className="inv-totals">
                    <div><dt>Sub total 1 (3rd party)</dt><dd>{money(totals.subTotal1)}</dd></div>
                    <div><dt>Sub total 2 (services)</dt><dd>{money(totals.subTotal2)}</dd></div>
                    <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
                    <div><dt>VAT {Number(editing.vat_rate)}% on services</dt><dd>{money(totals.vat)}</dd></div>
                    <div className="tot"><dt>Total bill</dt><dd>GH₵{money(totals.total)}</dd></div>
                    <div><dt>Deposit</dt><dd>{money(totals.deposit)}</dd></div>
                    <div className="bal"><dt>Outstanding</dt><dd>GH₵{money(totals.balance)}</dd></div>
                  </dl>
                ) : null}

                {error ? <p className="mgr-inline-error">{error}</p> : null}

                <div className="inv-actions">
                  <Button variant="primary" onClick={save} disabled={saving}>
                    <FiSave /> {saving ? 'Saving…' : 'Save invoice'}
                  </Button>
                  <Button variant="secondary" onClick={() => printInvoice(editing)}>
                    <FiPrinter /> Save as PDF
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}
