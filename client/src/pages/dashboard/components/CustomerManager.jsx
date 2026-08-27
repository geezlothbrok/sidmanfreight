import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import {
  Card, CardHeader, CardTitle, CardActions, Button, Badge,
  Table, TableHeader, TableSearch, TableContent, TableFooter, TablePagination, useTableState,
  Field, FieldLabel, FieldControl, Input, Dropdown,
  Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription,
} from '@rfdtech/components';

import { authFetch } from '../../../utils/authFetch';

/**
 * Customer records feeding the demographic breakdowns in the quarterly report.
 *
 * Everything except the name is optional. Religion and marital status are
 * special personal data under Ghana's Data Protection Act 2012 — only collect
 * them where the customer has been told why.
 */
export const GENDERS = ['Male', 'Female'];
export const MARITAL_STATUSES = ['Married', 'Single', 'Divorced', 'Widowed'];
export const RELIGIONS = ['Christianity', 'Islam', 'Traditional', 'Other'];
export const NATIONALITIES = ['Ghanaian', 'Non-Ghanaian'];

const blank = () => ({
  id: '', name: '', phone: '', email: '',
  gender: '', marital_status: '', religion: '', nationality: '',
  occupation: '', location: '', notes: '',
});

const opts = (list) => list.map((v) => ({ value: v, label: v }));

export default function CustomerManager({ apiUrl, canDelete, onToast }) {
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const table = useTableState({ paramPrefix: 'customers', defaultPageSize: 10 });

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`${apiUrl}?action=get_customers`);
      const data = await res.json().catch(() => []);
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load customers.');
    }
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const setField = (k) => (e) =>
    setEditing((v) => ({ ...v, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(editing).forEach(([k, val]) => fd.append(k, val ?? ''));
      const res = await authFetch(`${apiUrl}?action=save_customer`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onToast?.({ title: 'Customer saved', variant: 'success' });
        setEditing(null);
        load();
      } else {
        setError(data.error || 'Could not save the customer.');
      }
    } catch {
      setError('Could not reach the portal.');
    }
    setSaving(false);
  };

  const remove = async (row) => {
    const fd = new FormData();
    fd.append('id', row.id);
    await authFetch(`${apiUrl}?action=delete_customer`, { method: 'POST', body: fd }).catch(() => {});
    load();
  };

  const dash = (v) => v || '—';

  const columns = [
    { id: 'name', header: 'Name', sortable: true, cell: ({ row }) => <strong>{row.name}</strong> },
    { id: 'phone', header: 'Phone', cell: ({ row }) => dash(row.phone) },
    { id: 'gender', header: 'Gender', cell: ({ row }) => dash(row.gender) },
    { id: 'nationality', header: 'Nationality', cell: ({ row }) => dash(row.nationality) },
    { id: 'occupation', header: 'Occupation', cell: ({ row }) => dash(row.occupation) },
    { id: 'location', header: 'Location', cell: ({ row }) => dash(row.location) },
    {
      id: 'shipment_count', header: 'Shipments', cell: ({ row }) =>
        <Badge variant={Number(row.shipment_count) > 0 ? 'info' : 'neutral'}>{row.shipment_count ?? 0}</Badge>,
    },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="inv-row-actions">
          <Button variant="ghost" size="sm" aria-label="Edit customer" onClick={() => setEditing({ ...blank(), ...row })}>
            <FiEdit2 />
          </Button>
          {canDelete ? (
            <Button variant="ghost" size="sm" aria-label="Delete customer" onClick={() => remove(row)}>
              <FiTrash2 />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const q = (table.search || '').toLowerCase();
  const filtered = customers.filter((c) =>
    !q || `${c.name} ${c.phone} ${c.occupation} ${c.location}`.toLowerCase().includes(q));
  const pageSize = table.pageSize || 10;
  const paged = filtered.slice((table.page - 1) * pageSize, table.page * pageSize);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Customer Register</CardTitle>
          <CardActions>
            <Button variant="primary" size="sm" onClick={() => setEditing(blank())}>
              <FiPlus /> New Customer
            </Button>
          </CardActions>
        </CardHeader>
        <Table variant="soft" paramPrefix="customers">
          <TableHeader><TableSearch placeholder="Search customers..." /></TableHeader>
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
            <DialogTitle>{editing?.id ? `Edit ${editing.name}` : 'New customer'}</DialogTitle>
            <DialogDescription>
              Only the name is required. The rest feeds the demographic breakdowns
              in the quarterly report.
            </DialogDescription>

            {editing ? (
              <div className="inv-form">
                <div className="inv-grid">
                  <Field><FieldLabel>Full name</FieldLabel><FieldControl>
                    <Input value={editing.name} onChange={setField('name')} />
                  </FieldControl></Field>
                  <Field><FieldLabel>Phone</FieldLabel><FieldControl>
                    <Input value={editing.phone} onChange={setField('phone')} />
                  </FieldControl></Field>
                  <Field><FieldLabel>Email</FieldLabel><FieldControl>
                    <Input value={editing.email} onChange={setField('email')} />
                  </FieldControl></Field>
                </div>

                <div className="inv-grid">
                  {[
                    ['gender', 'Gender', GENDERS],
                    ['marital_status', 'Marital status', MARITAL_STATUSES],
                    ['religion', 'Religion', RELIGIONS],
                    ['nationality', 'Nationality', NATIONALITIES],
                  ].map(([key, label, list]) => (
                    <Field key={key}>
                      <FieldLabel>{label}</FieldLabel>
                      <FieldControl>
                        <Dropdown
                          aria-label={label}
                          value={editing[key] || ''}
                          onValueChange={(v) => setEditing((s) => ({ ...s, [key]: v ?? '' }))}
                          options={opts(list)}
                          placeholder="Not recorded"
                          clearable
                        />
                      </FieldControl>
                    </Field>
                  ))}
                </div>

                <div className="inv-grid">
                  <Field><FieldLabel>Occupation</FieldLabel><FieldControl>
                    <Input value={editing.occupation} onChange={setField('occupation')} placeholder="e.g. Entrepreneur" />
                  </FieldControl></Field>
                  <Field><FieldLabel>Location</FieldLabel><FieldControl>
                    <Input value={editing.location} onChange={setField('location')} placeholder="e.g. Accra" />
                  </FieldControl></Field>
                </div>

                <p className="profile-note">
                  Religion and marital status are special personal data under
                  Ghana's Data Protection Act. Record them only where the customer
                  has been told why they are collected.
                </p>

                {error ? <p className="mgr-inline-error">{error}</p> : null}

                <div className="inv-actions">
                  <Button variant="primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save customer'}
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
