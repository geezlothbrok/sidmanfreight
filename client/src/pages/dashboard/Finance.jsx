import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, serverLogout, displayNameFromEmail, initialsFromEmail } from '../../utils/auth';
import { authFetch } from '../../utils/authFetch';
import ProfileMenu from './components/ProfileMenu';
import { SHIPMENT_COLUMNS, TRANSACTION_COLUMNS, printReport } from '../../utils/reportExport';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiPlus, FiDownload, FiPaperclip, FiMoreHorizontal, FiGrid, FiUsers, FiEye, FiEyeOff } from 'react-icons/fi';
import {
  ThemeProvider, AppLayout, AppHeader, AppHeaderActions, AppBody,
  MetricCard, Card, CardHeader, CardTitle, CardActions, Badge, Button,
  ExportButton,
  Table, TableHeader, TableSearch, TableContent, TableFooter, TablePagination, useTableState,
  Form, FormField, Field, FieldLabel, FieldControl, FieldError, Input, Dropdown, UploadField,
  Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription,
  Popover, PopoverTrigger, PopoverContent, PopoverClose,
  AppSwitcher,
  ToastProvider, Toaster, useToast,
} from '@rfdtech/components';
import '@rfdtech/components/style.css';
import portalLogo from '../../assets/images/logo-trimmed.jpg';
import './Finance.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? '/backend/manager_api.php' : 'https://api.sidmanfreightconsult.com/manager_api.php');
// Who may open this screen. The backend returns `role` on login and
// require_finance_email() accepts either role server-side, so the manager keeps
// full access here. Addresses are deployment config and are never hardcoded.
const FINANCE_ROLES = ['Finance', 'Manager'];

const SWITCHER_APPS = [
  { id: 'executive', name: 'Executive Dashboard', icon: <FiGrid /> },
  { id: 'agent', name: 'Field Agent Portal', icon: <FiUsers /> },
];

const transactionFormSchema = z.object({
  type: z.enum(['Income', 'Expense']),
  category: z.string().trim().min(1, 'Purpose is required'),
  reference_no: z.string().trim().min(1, 'Invoice/Receipt number is required'),
  bill_of_lading: z.string().trim().optional(),
  identification_no: z.string().trim().optional(),
  amount: z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be greater than 0'),
});

function sortRows(rows, sort, accessors) {
  const getValue = sort && accessors[sort.column];
  if (!getValue) return rows;
  const dir = sort.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

const TRANSACTION_ACCESSORS = {
  date: (t) => (t.date_logged ? new Date(t.date_logged).getTime() : 0),
  category: (t) => t.category || '',
};

const SHIPMENT_STATUS_BADGE = {
  'Manifest Received': 'default',
  'Vessel Yet To Arrive': 'default',
  'Pending Customs Review': 'warning',
  'Customs Hold': 'error',
  'BOE Received': 'default',
  'Duty Paid': 'success',
  'Terminal Paid': 'success',
  'Customs Release': 'success',
  'Shipping Release': 'success',
  'Cleared At Port': 'success',
  'In Transit': 'primary',
  'Out For Delivery': 'primary',
  'Delivered': 'success',
  'Approved by Manager': 'success',
};

const SHIPMENT_ACCESSORS = {
  container: (s) => s.containerNo || s.container_number || '',
  client: (s) => s.clientName || s.client_name || '',
};

function FinanceInner() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const isManager = userRole === 'Manager';

  const [transactions, setTransactions] = useState([]);
  const transactionsTable = useTableState({ paramPrefix: 'ledger', defaultPageSize: 10 });

  const [shipments, setShipments] = useState([]);
  const [showShipments, setShowShipments] = useState(false);
  const shipmentsTable = useTableState({ paramPrefix: 'fin-shipments', defaultPageSize: 10 });

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [txFiles, setTxFiles] = useState(null);
  const addTransactionForm = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: { type: 'Income', category: '', reference_no: '', bill_of_lading: '', identification_no: '', amount: 0 },
  });

  const [editingTransaction, setEditingTransaction] = useState(null);
  const editTransactionForm = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: { type: 'Income', category: '', reference_no: '', bill_of_lading: '', identification_no: '', amount: 0 },
  });
  const [viewingTransaction, setViewingTransaction] = useState(null);

  const { toast } = useToast();
  const setMessage = useCallback((msg) => { if (msg) toast({ title: msg, variant: 'success' }); }, [toast]);
  const setError = useCallback((err) => { if (err) toast({ title: err, variant: 'error' }); }, [toast]);

  const [confirmState, setConfirmState] = useState(null);
  const confirmAction = (title, description, onConfirm) => setConfirmState({ title, description, onConfirm });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    if (FINANCE_ROLES.includes(user.role)) {
      setUserEmail(user.email);
      setUserRole(user.role);
      setCheckingAuth(false);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchLedgerData = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}?action=get_transactions`);
      const data = await res.json();
      if (Array.isArray(data)) setTransactions(data);
    } catch (err) {
      console.error("Ledger communication breakdown:", err);
      setError('Failed to load ledger data. Please refresh.');
    }
  }, [setError]);

  const fetchShipments = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}?action=get_all_shipments`);
      const data = await res.json();
      if (Array.isArray(data)) setShipments(data);
    } catch (err) {
      console.error("Shipment feed communication breakdown:", err);
      setError('Failed to load shipment feed. Please refresh.');
    }
  }, [setError]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchLedgerData();
      fetchShipments();
    }
  }, [checkingAuth, fetchLedgerData, fetchShipments]);

  const handleLogout = () => {
    const logFd = new FormData();
    logFd.append('event_type', 'logout');
    logFd.append('description', `${userEmail} logged out`);
    authFetch(`${API_URL}?action=log_event`, { method: 'POST', body: logFd })
      .catch(() => {})
      .finally(() => {
        serverLogout(API_URL).finally(() => navigate('/login'));
      });
  };

  const handleAddTransaction = async (values) => {
    const formData = new FormData();
    formData.append('type', values.type);
    formData.append('amount', values.amount);
    formData.append('category', values.category.trim());
    formData.append('reference_no', values.reference_no.trim().toUpperCase());
    formData.append('bill_of_lading', (values.bill_of_lading || '').trim().toUpperCase());
    formData.append('identification_no', (values.identification_no || '').trim().toUpperCase());
    formData.append('notes', 'Logged securely via specialized account terminal.');

    const filesArray = Array.isArray(txFiles) ? txFiles : (txFiles ? [txFiles] : []);
    filesArray.forEach((file) => formData.append('files[]', file));

    // Never let a network blip or a non-JSON error page fail silently — the
    // form must always tell the user what happened.
    try {
      const res = await authFetch(`${API_URL}?action=add_transaction`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(data.message);
        addTransactionForm.reset({ type: 'Income', category: '', reference_no: '', bill_of_lading: '', identification_no: '', amount: 0 });
        setTxFiles(null);
        setShowAddTransaction(false);
        fetchLedgerData();
      } else {
        setError(data.error || `Could not save the entry (error ${res.status}). Please try again in a moment.`);
      }
    } catch (err) {
      console.error('add_transaction failed:', err);
      setError('Could not reach the server. Please check your connection and try again.');
    }
  };

  const openEditTransaction = (tx) => {
    editTransactionForm.reset({
      type: tx.type || 'Income',
      category: tx.category || '',
      reference_no: tx.reference_no || '',
      bill_of_lading: tx.bill_of_lading || '',
      identification_no: tx.identification_no || '',
      amount: parseFloat(tx.amount) || 0,
    });
    setEditingTransaction(tx);
  };

  const handleSaveTransactionEdit = async (values) => {
    const fd = new FormData();
    fd.append('transaction_id', editingTransaction.id);
    fd.append('category', values.category.trim());
    fd.append('reference_no', values.reference_no.trim().toUpperCase());
    fd.append('bill_of_lading', (values.bill_of_lading || '').trim().toUpperCase());
    fd.append('identification_no', (values.identification_no || '').trim().toUpperCase());
    fd.append('amount', values.amount);
    fd.append('type', values.type);

    const res = await authFetch(`${API_URL}?action=update_transaction`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      setMessage(data.message);
      setEditingTransaction(null);
      fetchLedgerData();
    } else {
      setError(data.error || 'Failed to update financial item statement record.');
    }
  };

  const handleDeleteTransaction = (id) => {
    confirmAction(
      'Delete ledger entry?',
      'Are you sure you want to completely delete this entry from the ledger? This will alter balance totals and cannot be undone.',
      async () => {
        const fd = new FormData();
        fd.append('transaction_id', id);
        const res = await authFetch(`${API_URL}?action=delete_transaction`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          setMessage(data.message);
          fetchLedgerData();
        } else {
          setError(data.error || 'Failed to remove transaction registry entry.');
        }
      }
    );
  };

  // Both outputs come from src/utils/reportExport.js, so the letterhead PDF and
  // the spreadsheet always carry the same headings and formatting.
  // ExportButton (design system) handles CSV/Excel. PDF stays on our own
  // letterhead renderer because the design system's PDF has no logo or company
  // block. Both read the same column definitions, so the outputs agree.
  const logExport = (filename, mode, count) => {
    const fd = new FormData();
    fd.append('event_type', 'export');
    fd.append('description', `Exported ${String(filename).replace(/_/g, ' ')} as ${mode} (${count} row${count === 1 ? '' : 's'})`);
    authFetch(`${API_URL}?action=log_event`, { method: 'POST', body: fd }).catch(() => {});
  };

  const exportPdf = (dataArray, filename, columns) => {
    if (!dataArray || dataArray.length === 0) return;
    logExport(filename, 'PDF', dataArray.length);
    printReport({ reportKey: filename, rows: dataArray, columns, generatedBy: userEmail });
  };

  // Attachments (transaction receipts and shipment manifests) live in the DB and
  // are streamed back through the backend. `filesArr` is the row's `files` list
  // [{id, name, size}]; `action` selects the matching download endpoint.
  const renderDocLinks = (filesArr, action) => {
    const files = Array.isArray(filesArr) ? filesArr : [];
    if (files.length === 0) return <span className="fin-doc-empty">No docs attached</span>;

    return (
      <Popover>
        <PopoverTrigger className="fin-doc-count-btn" aria-label="View attached files">
          <FiPaperclip /> {files.length} file{files.length === 1 ? '' : 's'}
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={4} className="clet-popover--menu">
          <div className="fin-doc-list">
            {files.map((f) => (
              <a key={f.id} href={`${API_URL}?action=${action}&id=${f.id}`} target="_blank" rel="noreferrer" className="fin-doc-link" title={f.name}>
                <FiPaperclip /> <span className="fin-doc-link-name">{f.name}</span>
              </a>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const grossRevenue = transactions.filter((t) => t.type === 'Income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const operatingExpenditure = transactions.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const netMargin = grossRevenue - operatingExpenditure;

  const now = new Date();
  const todaysTransactions = transactions.filter((t) => {
    const logged = new Date(t.date_logged);
    return !isNaN(logged.getTime())
      && logged.getFullYear() === now.getFullYear()
      && logged.getMonth() === now.getMonth()
      && logged.getDate() === now.getDate();
  });
  const grossRevenueToday = todaysTransactions.filter((t) => t.type === 'Income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const operatingExpenditureToday = todaysTransactions.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const netMarginToday = grossRevenueToday - operatingExpenditureToday;

  const transactionsSearchLower = transactionsTable.search.trim().toLowerCase();
  const transactionsSearched = transactionsSearchLower
    ? transactions.filter((tx) => [tx.category, tx.reference_no, tx.bill_of_lading, tx.identification_no, tx.type].some((field) => String(field || '').toLowerCase().includes(transactionsSearchLower)))
    : transactions;
  const transactionsSorted = sortRows(transactionsSearched, transactionsTable.sort, TRANSACTION_ACCESSORS);
  const transactionsTotalPages = Math.max(1, Math.ceil(transactionsSorted.length / transactionsTable.pageSize));
  const transactionsPageClamped = Math.min(transactionsTable.page, transactionsTotalPages);
  const transactionsPaged = transactionsSorted.slice(
    (transactionsPageClamped - 1) * transactionsTable.pageSize,
    transactionsPageClamped * transactionsTable.pageSize
  );

  const transactionColumns = [
    { id: 'date', header: 'Date Placed', sortable: true, accessorFn: (t) => t.date_logged ? new Date(t.date_logged).toLocaleDateString() : 'N/A' },
    { id: 'category', header: 'Classification / Purpose', sortable: true, cell: ({ row }) => <strong>{row.category || 'N/A'}</strong> },
    { id: 'reference', header: 'Invoice/Receipt No.', cell: ({ row }) => <span className="fin-ref-pill">{row.reference_no || 'N/A'}</span> },
    { id: 'bill_of_lading', header: 'Bill of Lading', cell: ({ row }) => <span className="fin-ref-pill">{row.bill_of_lading || 'N/A'}</span> },
    { id: 'identification_no', header: 'Identification No.', cell: ({ row }) => <span className="fin-ref-pill">{row.identification_no || 'N/A'}</span> },
    { id: 'type', header: 'Stream Flow', cell: ({ row }) => <Badge variant={(row.type || 'Income') === 'Income' ? 'success' : 'error'}>{row.type || 'Income'}</Badge> },
    {
      id: 'amount', header: 'Net Amount',
      cell: ({ row }) => {
        const txType = row.type || 'Income';
        const txAmount = parseFloat(row.amount);
        return (
          <span className={txType === 'Income' ? 'fin-amt-credit' : 'fin-amt-debit'}>
            {txType === 'Income' ? '+' : '-'}GH₵{!isNaN(txAmount) ? txAmount.toFixed(2) : '0.00'}
          </span>
        );
      },
    },
    { id: 'docs', header: 'Attachments', cell: ({ row }) => renderDocLinks(row.files, 'download_transaction_file') },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <Popover>
          <PopoverTrigger className="clet-button clet-button--secondary clet-button--sm" aria-label="Row actions">
            <FiMoreHorizontal />
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" sideOffset={4} className="clet-popover--menu">
            <div className="clet-popover__menu" role="menu">
              <PopoverClose asChild>
                <button type="button" className="clet-popover__menu-item" role="menuitem" onClick={() => setViewingTransaction(row)}>View</button>
              </PopoverClose>
              <PopoverClose asChild>
                <button type="button" className="clet-popover__menu-item" role="menuitem" onClick={() => openEditTransaction(row)}>Edit</button>
              </PopoverClose>
              <PopoverClose asChild>
                <button type="button" className="clet-popover__menu-item clet-popover__menu-item--destructive" role="menuitem" onClick={() => handleDeleteTransaction(row.id)}>Delete</button>
              </PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      ),
    },
  ];

  const approvedShipments = shipments.filter((s) => Number(s.approved) === 1);
  const shipmentsSearchLower = shipmentsTable.search.trim().toLowerCase();
  const shipmentsSearched = shipmentsSearchLower
    ? approvedShipments.filter((s) => [s.containerNo, s.container_number, s.clientName, s.client_name]
        .some((field) => String(field || '').toLowerCase().includes(shipmentsSearchLower)))
    : approvedShipments;
  const shipmentsSorted = sortRows(shipmentsSearched, shipmentsTable.sort, SHIPMENT_ACCESSORS);
  const shipmentsTotalPages = Math.max(1, Math.ceil(shipmentsSorted.length / shipmentsTable.pageSize));
  const shipmentsPageClamped = Math.min(shipmentsTable.page, shipmentsTotalPages);
  const shipmentsPaged = shipmentsSorted.slice(
    (shipmentsPageClamped - 1) * shipmentsTable.pageSize,
    shipmentsPageClamped * shipmentsTable.pageSize
  ).map((s, i) => ({ ...s, _rowNumber: (shipmentsPageClamped - 1) * shipmentsTable.pageSize + i + 1 }));

  const shipmentColumns = [
    { id: 'id', header: 'ID', accessorFn: (s) => `#${s._rowNumber}`, width: 70 },
    {
      id: 'container', header: 'Container/Ref No', sortable: true,
      cell: ({ row }) => <strong>{row.containerNo || row.container_number || 'N/A'}</strong>,
    },
    { id: 'client', header: 'Client Name', sortable: true, accessorFn: (s) => s.clientName || s.client_name || 'N/A' },
    { id: 'route', header: 'Origin → Destination', accessorFn: (s) => `${s.origin || 'N/A'} → ${s.destination || 'N/A'}` },
    {
      id: 'status', header: 'Clearance Operations Status',
      cell: ({ row }) => <Badge variant={SHIPMENT_STATUS_BADGE[row.status] || 'default'}>{row.status || 'N/A'}</Badge>,
    },
    { id: 'docs', header: 'Attachments', cell: ({ row }) => renderDocLinks(row.files, 'download_shipment_file') },
    { id: 'loggedBy', header: 'Logged By', accessorFn: (s) => s.updatedBy || s.agent_email || 'N/A' },
  ];

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
        <h3 style={{ color: '#0f172a', fontFamily: 'sans-serif' }}>Authenticating Ledger Access Clearance...</h3>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <AppLayout>
        <AppHeader variant="primary">
          <div className="ds-header-brand">
            <img src={portalLogo} alt="Sidman Freight Consult" className="ds-header-logo" />
          </div>
          <AppHeaderActions>
            {isManager && (
              <AppSwitcher
                apps={SWITCHER_APPS}
                title="Switch Portal"
                triggerLabel="Switch portal"
                onAppSelect={(app) => {
                  if (app.id === 'executive') navigate('/manager-dashboard');
                  else if (app.id === 'agent') navigate('/dashboard');
                }}
              />
            )}
            <ProfileMenu
              apiUrl={API_URL}
              email={userEmail}
              role={isManager ? 'Manager' : 'Finance'}
              onSignOut={handleLogout}
            />
          </AppHeaderActions>
        </AppHeader>

        <AppBody>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--clet-text)' }}>Corporate Ledger</h1>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--clet-text-secondary)', fontSize: '0.9rem' }}>Track income, expenses, and account balance</p>
          </div>

          <div className="ds-metric-section">
            <h4 className="ds-metric-section-label">Today</h4>
            <div className="ds-metric-grid">
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--green" mark="epa" icon={<FiTrendingUp />} label="Gross Incoming Value" value={`GH₵${grossRevenueToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} description="Since midnight" />
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--red" mark="okodee-mmowere" icon={<FiTrendingDown />} label="Operational Expense Outflow" value={`GH₵${operatingExpenditureToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} description="Since midnight" />
              <MetricCard variant="soft" animate className={`sidman-metric ${netMarginToday < 0 ? 'sidman-metric--red' : 'sidman-metric--teal'}`} mark="nyansapo" icon={<FiDollarSign />} label="Liquid Balance Pool" value={`GH₵${netMarginToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} description={netMarginToday >= 0 ? 'Net positive today' : 'Net negative today'} />
            </div>
          </div>

          <div className="ds-metric-section">
            <h4 className="ds-metric-section-label">All-Time</h4>
            <div className="ds-metric-grid">
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--green" mark="epa" icon={<FiTrendingUp />} label="Gross Incoming Value" value={`GH₵${grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} description="All revenue recorded" />
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--red" mark="okodee-mmowere" icon={<FiTrendingDown />} label="Operational Expense Outflow" value={`GH₵${operatingExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} description="All expenses recorded" />
              <MetricCard variant="soft" animate className={`sidman-metric ${netMargin < 0 ? 'sidman-metric--red' : 'sidman-metric--teal'}`} mark="nyansapo" icon={<FiDollarSign />} label="Liquid Balance Pool" value={`GH₵${netMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} description={netMargin >= 0 ? 'Net positive' : 'Net negative'} />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Auditable Balance Flow Ledger</CardTitle>
              <CardActions>
                <ExportButton
                  variant="secondary"
                  size="sm"
                  data={transactions}
                  columns={TRANSACTION_COLUMNS}
                  title={'Financial Ledger'}
                  filename={'Financial_Ledger'}
                  formats={['csv', 'xlsx']}
                />
                <Button variant="secondary" size="sm" onClick={() => exportPdf(transactions, 'Financial_Ledger', TRANSACTION_COLUMNS)}>
                  <FiDownload /> PDF
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowAddTransaction(true)}>
                  <FiPlus /> Post New Entry
                </Button>
              </CardActions>
            </CardHeader>
            <Table variant="soft" paramPrefix="ledger">
              <TableHeader><TableSearch placeholder="Search ledger entries..." /></TableHeader>
              <TableContent variant="soft" columns={transactionColumns} data={transactionsPaged} rowKey={(t) => t.id} />
              <TableFooter><TablePagination totalPages={transactionsTotalPages} totalItems={transactionsSorted.length} /></TableFooter>
            </Table>
          </Card>

          <Card style={{ marginTop: '1.75rem' }}>
            <CardHeader>
              <CardTitle>Approved Shipments</CardTitle>
              <CardActions>
                {showShipments && (
                  <>
                    <ExportButton
                      variant="secondary"
                      size="sm"
                      data={approvedShipments}
                      columns={SHIPMENT_COLUMNS}
                      title={'Approved Shipments'}
                      filename={'Approved_Shipments'}
                      formats={['csv', 'xlsx']}
                    />
                    <Button variant="secondary" size="sm" onClick={() => exportPdf(approvedShipments, 'Approved_Shipments', SHIPMENT_COLUMNS)}>
                      <FiDownload /> PDF
                    </Button>
                  </>
                )}
                <Button variant="primary" size="sm" onClick={() => setShowShipments((v) => !v)}>
                  {showShipments ? <><FiEyeOff /> Hide Shipments</> : <><FiEye /> View Shipments</>}
                </Button>
              </CardActions>
            </CardHeader>
            {showShipments && (
              <Table variant="soft" paramPrefix="fin-shipments">
                <TableHeader><TableSearch placeholder="Search approved shipments..." /></TableHeader>
                <TableContent variant="soft" columns={shipmentColumns} data={shipmentsPaged} rowKey={(s) => s.id} />
                <TableFooter><TablePagination totalPages={shipmentsTotalPages} totalItems={shipmentsSorted.length} /></TableFooter>
              </Table>
            )}
          </Card>
        </AppBody>
      </AppLayout>

      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton>
            <DialogTitle>Post New Entry</DialogTitle>
            <Form {...addTransactionForm}>
              <form onSubmit={addTransactionForm.handleSubmit(handleAddTransaction)} className="fin-form" style={{ marginTop: '1rem' }}>
                <FormField
                  control={addTransactionForm.control}
                  name="type"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Stream Classification</FieldLabel>
                      <FieldControl>
                        <Dropdown
                          aria-label="Transaction type"
                          value={field.value}
                          onValueChange={field.onChange}
                          options={[
                            { value: 'Income', label: 'Revenue Injection (+ Credit)' },
                            { value: 'Expense', label: 'Operational Expense (- Debit)' },
                          ]}
                        />
                      </FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={addTransactionForm.control}
                  name="category"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Classification / Purpose</FieldLabel>
                      <FieldControl><Input placeholder="e.g. Customs Clearance, Fuel Fleet" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={addTransactionForm.control}
                  name="reference_no"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Invoice/Receipt Number</FieldLabel>
                      <FieldControl><Input placeholder="e.g. INV-1001 / RCPT-2045" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={addTransactionForm.control}
                  name="bill_of_lading"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Bill of Lading <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></FieldLabel>
                      <FieldControl><Input placeholder="e.g. MSKU1234567" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={addTransactionForm.control}
                  name="identification_no"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Identification Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></FieldLabel>
                      <FieldControl><Input placeholder="e.g. GT-016-3086" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={addTransactionForm.control}
                  name="amount"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Transaction Amount (GH₵)</FieldLabel>
                      <FieldControl><Input type="number" step="0.01" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <Field>
                  <FieldLabel>Attach Supporting Documents</FieldLabel>
                  <FieldControl>
                    <UploadField multiple value={txFiles} onChange={setTxFiles} />
                  </FieldControl>
                </Field>

                <Button type="submit" variant="primary" disabled={addTransactionForm.formState.isSubmitting}>
                  {addTransactionForm.formState.isSubmitting ? 'Saving...' : 'Post Entry'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={!!viewingTransaction} onOpenChange={(open) => { if (!open) setViewingTransaction(null); }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton>
            <DialogTitle>{viewingTransaction?.category || 'Transaction'}</DialogTitle>
            <DialogDescription>Ledger entry #{viewingTransaction?.id}</DialogDescription>
            <div className="fin-view-details">
              <div><span>Date Placed</span><strong>{viewingTransaction?.date_logged ? new Date(viewingTransaction.date_logged).toLocaleDateString() : 'N/A'}</strong></div>
              <div><span>Invoice/Receipt Number</span><strong>{viewingTransaction?.reference_no || 'N/A'}</strong></div>
              <div><span>Bill of Lading</span><strong>{viewingTransaction?.bill_of_lading || 'N/A'}</strong></div>
              <div><span>Identification Number</span><strong>{viewingTransaction?.identification_no || 'N/A'}</strong></div>
              <div><span>Stream Flow</span><strong>{viewingTransaction?.type || 'Income'}</strong></div>
              <div><span>Net Amount</span><strong>GH₵{!isNaN(parseFloat(viewingTransaction?.amount)) ? parseFloat(viewingTransaction?.amount).toFixed(2) : '0.00'}</strong></div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={!!editingTransaction} onOpenChange={(open) => { if (!open) setEditingTransaction(null); }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton>
            <DialogTitle>Edit Ledger Entry</DialogTitle>
            <Form {...editTransactionForm}>
              <form onSubmit={editTransactionForm.handleSubmit(handleSaveTransactionEdit)} className="fin-form" style={{ marginTop: '1rem' }}>
                <FormField
                  control={editTransactionForm.control}
                  name="type"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Stream Flow</FieldLabel>
                      <FieldControl>
                        <Dropdown
                          aria-label="Transaction type"
                          value={field.value}
                          onValueChange={field.onChange}
                          options={[
                            { value: 'Income', label: 'Revenue (+ Received Credit)' },
                            { value: 'Expense', label: 'Expenditure (- Debit Charge)' },
                          ]}
                        />
                      </FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={editTransactionForm.control}
                  name="category"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Classification / Purpose</FieldLabel>
                      <FieldControl><Input {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={editTransactionForm.control}
                  name="reference_no"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Invoice/Receipt Number</FieldLabel>
                      <FieldControl><Input {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={editTransactionForm.control}
                  name="bill_of_lading"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Bill of Lading <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></FieldLabel>
                      <FieldControl><Input {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={editTransactionForm.control}
                  name="identification_no"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Identification Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></FieldLabel>
                      <FieldControl><Input {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={editTransactionForm.control}
                  name="amount"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Net Amount (GH₵)</FieldLabel>
                      <FieldControl><Input type="number" step="0.01" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!editTransactionForm.formState.isDirty || editTransactionForm.formState.isSubmitting}
                >
                  {editTransactionForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={!!confirmState} onOpenChange={(open) => { if (!open) setConfirmState(null); }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            <DialogDescription>{confirmState?.description}</DialogDescription>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setConfirmState(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const action = confirmState?.onConfirm;
                  setConfirmState(null);
                  action?.();
                }}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </ThemeProvider>
  );
}

function Finance() {
  return (
    <ToastProvider>
      <FinanceInner />
      <Toaster />
    </ToastProvider>
  );
}

export default Finance;
