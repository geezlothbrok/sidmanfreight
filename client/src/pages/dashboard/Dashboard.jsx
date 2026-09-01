import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, serverLogout, displayNameFromEmail, initialsFromEmail } from '../../utils/auth';
import { authFetch } from '../../utils/authFetch';
import ProfileMenu from './components/ProfileMenu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiPackage, FiClock, FiCheckCircle, FiCalendar, FiPlus, FiPaperclip, FiEdit2 } from 'react-icons/fi';
import {
  ThemeProvider, AppLayout, AppHeader, AppHeaderActions, AppBody,
  MetricCard, Card, CardHeader, CardTitle, CardActions, Badge, Tooltip, Dropdown, Combobox, Button,
  Table, TableHeader, TableSearch, TableContent, TableFooter, TablePagination, useTableState,
  Form, FormField, Field, FieldLabel, FieldControl, FieldError, Input, Textarea, UploadField,
  Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription,
  Popover, PopoverTrigger, PopoverContent,
  ToastProvider, Toaster, useToast,
} from '@rfdtech/components';
import '@rfdtech/components/style.css';
import portalLogo from '../../assets/images/logo-trimmed.jpg';
import './Dashboard.css';

const DELIVERED_STATUSES = ['Delivered', 'Cleared At Port', 'Approved by Manager'];
// The fixed manager/finance accounts are defined by the backend environment
// (MANAGER_EMAIL / FINANCE_EMAIL) and identified to the client by `role` on the
// session. Their addresses are deployment config, so they are never hardcoded
// here — doing so silently locked those accounts out when the deployed values
// differed.
const FIXED_ROLES = ['Manager', 'Finance'];

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

const SHIPMENT_STATUS_OPTIONS = [
  { value: 'Manifest Received', label: 'Manifest Received' },
  { value: 'Vessel Yet To Arrive', label: 'Vessel Yet To Arrive' },
  { value: 'Pending Customs Review', label: 'Pending Customs Review' },
  { value: 'Customs Hold', label: 'Customs Hold' },
  { value: 'BOE Received', label: 'BOE Received' },
  { value: 'Duty Paid', label: 'Duty Paid' },
  { value: 'Terminal Paid', label: 'Terminal Paid' },
  { value: 'Customs Release', label: 'Customs Release' },
  { value: 'Shipping Release', label: 'Shipping Release' },
  { value: 'Cleared At Port', label: 'Cleared At Port' },
  { value: 'In Transit', label: 'In Transit' },
  { value: 'Out For Delivery', label: 'Out For Delivery' },
  { value: 'Delivered', label: 'Delivered' },
];

const logShipmentFormSchema = z.object({
  containerNo: z.string().trim().min(1, 'Container / Bill of Lading No. is required'),
  clientName: z.string().trim().min(1, 'Client name is required'),
  status: z.string().trim().min(1, 'Status is required'),
  origin: z.string().trim().min(1, 'Origin port is required'),
  destination: z.string().trim().min(1, 'Destination port is required'),
  // Optional so existing workflows are not blocked, but the quarterly report
  // groups by these — anything left blank shows as "Unclassified".
  regime: z.string().optional(),
  consignmentType: z.string().optional(),
  customerId: z.string().optional(),
  notes: z.string().trim().optional(),
});

const progressFormSchema = z.object({
  status: z.string().trim().min(1, 'Status is required'),
  comment: z.string().trim().optional(),
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

const SHIPMENT_ACCESSORS = {
  container: (s) => s.containerNo || s.container_number || '',
  client: (s) => s.clientName || s.client_name || '',
};

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? '/backend/manager_api.php' : 'https://api.sidmanfreightconsult.com/manager_api.php');

function DashboardInner() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [showLogShipment, setShowLogShipment] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const logShipmentForm = useForm({
    resolver: zodResolver(logShipmentFormSchema),
    defaultValues: { containerNo: '', clientName: '', status: 'Pending Customs Review', origin: '', destination: '', regime: '', consignmentType: '', customerId: '', notes: '' },
  });

  const [myShipments, setMyShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const shipmentsTable = useTableState({ paramPrefix: 'my-shipments', defaultPageSize: 10 });

  const [editingProgressShipment, setEditingProgressShipment] = useState(null);
  const [progressFiles, setProgressFiles] = useState(null);
  const progressForm = useForm({
    resolver: zodResolver(progressFormSchema),
    defaultValues: { status: 'Pending Customs Review', comment: '' },
  });

  const { toast } = useToast();
  const setMessage = useCallback((msg) => { if (msg) toast({ title: msg, variant: 'success' }); }, [toast]);
  const setError = useCallback((err) => { if (err) toast({ title: err, variant: 'error' }); }, [toast]);

  // Manager-only: lets the manager view any agent's manifest console
  // read-only, without logging out and back in as that agent.
  const isManager = userRole === 'Manager';
  const [agentsList, setAgentsList] = useState([]);
  const [viewingAgentEmail, setViewingAgentEmail] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
    } else {
      setUserEmail(user.email);
      setUserRole(user.role);
      setCheckingAuth(false);
    }
  }, [navigate]);

  const fetchAgentShipments = useCallback(async (targetEmail) => {
    if (!getCurrentUser()) return;
    try {
      // With nobody picked in "Viewing as," everyone sees the same shared,
      // company-wide manifest feed — not just their own submissions. Picking
      // a specific agent (manager-only) narrows it down to just that
      // person's shipments, e.g. to log something on their behalf.
      const url = targetEmail
        ? `${API_URL}?action=get_my_shipments&agent_email=${encodeURIComponent(targetEmail)}`
        : `${API_URL}?action=get_all_shipments`;
      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyShipments(data);
      }
    } catch (err) {
      console.error("Error fetching manifest streams:", err);
    }
  }, []);

  useEffect(() => {
    if (!checkingAuth) {
      fetchAgentShipments(viewingAgentEmail);
    }
  }, [checkingAuth, viewingAgentEmail, fetchAgentShipments]);

  // Manager-only: pull the roster of field agents to populate the "Viewing as" picker.
  useEffect(() => {
    if (checkingAuth || !isManager) return;
    (async () => {
      try {
        // Customer records power the picker below; failure is non-fatal, the
        // field simply shows an empty list.
        authFetch(`${API_URL}?action=get_customers`)
          .then((r) => r.json())
          .then((d) => setCustomers(Array.isArray(d) ? d : []))
          .catch(() => {});
        const res = await authFetch(`${API_URL}?action=get_employees`);
        const data = await res.json();
        if (Array.isArray(data)) {
          // Manager/finance may also have employee rows for their own payroll
          // tracking — exclude them from the field-agent picker by email
          // (not just role text) so they never show up as an "agent" to view as.
          setAgentsList(data.filter((emp) => !FIXED_ROLES.includes(emp.role || 'Agent')));
        }
      } catch (err) {
        console.error("Error fetching agent roster:", err);
      }
    })();
  }, [checkingAuth, isManager]);

  const handleLogShipment = async (values) => {
    const formData = new FormData();
    formData.append('container_number', values.containerNo);
    formData.append('client_name', values.clientName);
    formData.append('status', values.status);
    formData.append('origin', values.origin);
    formData.append('destination', values.destination);
    formData.append('regime', values.regime || '');
    formData.append('consignment_type', values.consignmentType || '');
    formData.append('customer_id', values.customerId || '');
    formData.append('notes', values.notes || '');
    formData.append('agent_email', viewingAgentEmail || userEmail);

    const filesArray = Array.isArray(selectedFiles) ? selectedFiles : (selectedFiles ? [selectedFiles] : []);
    filesArray.forEach((file) => formData.append('manifest_files[]', file));

    try {
      const res = await authFetch(`${API_URL}?action=log_shipment`, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        // Some backends (or error pages) return HTML/text — try to parse JSON, otherwise show raw text
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Non-JSON response from API:', text);
          setError(text || 'Unexpected server response from backend.');
          return;
        }
      }

      if (res.ok && data && data.success) {
        setMessage(data.message || 'Shipment logged successfully.');
        logShipmentForm.reset({ containerNo: '', clientName: '', status: 'Pending Customs Review', origin: '', destination: '', regime: '', consignmentType: '', customerId: '', notes: '' });
        setSelectedFiles(null);
        setShowLogShipment(false);
        fetchAgentShipments(viewingAgentEmail);
      } else {
        const serverMsg = (data && (data.error || data.message)) || `Server returned ${res.status} ${res.statusText}`;
        setError(serverMsg);
      }
    } catch (err) {
      console.error('Error submitting shipment:', err);
      setError("Failed to connect to the logistics backend api.");
    }
  };

  const openEditProgress = (shipment) => {
    progressForm.reset({ status: shipment.status || 'Pending Customs Review', comment: '' });
    setProgressFiles(null);
    setEditingProgressShipment(shipment);
  };

  const handleSaveProgress = async (values) => {
    const formData = new FormData();
    formData.append('shipment_id', editingProgressShipment.id);
    formData.append('status', values.status);
    formData.append('comment', values.comment || '');

    const filesArray = Array.isArray(progressFiles) ? progressFiles : (progressFiles ? [progressFiles] : []);
    filesArray.forEach((file) => formData.append('manifest_files[]', file));

    try {
      const res = await authFetch(`${API_URL}?action=update_shipment_progress`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(data.message);
        setEditingProgressShipment(null);
        fetchAgentShipments(viewingAgentEmail);
      } else {
        setError(data.error || `Could not update the shipment (error ${res.status}). Please try again in a moment.`);
      }
    } catch (err) {
      console.error('update_shipment_progress failed:', err);
      setError('Failed to connect to the logistics backend api. Please try again.');
    }
  };

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

  // Manifest attachments live in the DB and are streamed back through the
  // backend's download_shipment_file action. `filesArr` is the shipment's
  // `files` list [{id, name, size}]; edits append new documents rather than
  // replacing old ones, so all attachments show under one "N files" count.
  const renderDocumentLinks = (filesArr) => {
    const files = Array.isArray(filesArr) ? filesArr : [];
    if (files.length === 0) return <span className="ds-doc-empty">No docs attached</span>;

    return (
      <Popover>
        <PopoverTrigger className="doc-count-btn" aria-label="View attached files">
          <FiPaperclip /> {files.length} file{files.length === 1 ? '' : 's'}
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={4} className="clet-popover--menu">
          <div className="doc-links-container">
            {files.map((f) => (
              <a key={f.id} href={`${API_URL}?action=download_shipment_file&id=${f.id}`} target="_blank" rel="noreferrer" className="doc-link-btn" title={f.name}>
                <FiPaperclip /> <span className="doc-link-name">{f.name}</span>
              </a>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const now = new Date();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const deliveredCount = myShipments.filter(s => DELIVERED_STATUSES.includes(s.status) || Number(s.approved) === 1).length;
  const pendingCount = myShipments.length - deliveredCount;
  const loggedThisWeekCount = myShipments.filter((s) => {
    const logged = new Date(s.timestamp || s.date_logged);
    return !isNaN(logged.getTime()) && logged.getTime() >= oneWeekAgo;
  }).length;
  const loggedTodayCount = myShipments.filter((s) => {
    const logged = new Date(s.timestamp || s.date_logged);
    return !isNaN(logged.getTime())
      && logged.getFullYear() === now.getFullYear()
      && logged.getMonth() === now.getMonth()
      && logged.getDate() === now.getDate();
  }).length;

  const shipmentsSearchLower = shipmentsTable.search.trim().toLowerCase();
  const shipmentsSearched = shipmentsSearchLower
    ? myShipments.filter(ship => [ship.containerNo, ship.container_number, ship.clientName, ship.client_name]
        .some(field => String(field || '').toLowerCase().includes(shipmentsSearchLower)))
    : myShipments;
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
      cell: ({ row }) => {
        const badge = <Badge variant={SHIPMENT_STATUS_BADGE[row.status] || 'default'}>{row.status || 'Active'}</Badge>;
        return row.edited_by ? (
          <Tooltip content={`Edited by ${row.edited_by}${row.edited_at ? ' on ' + new Date(row.edited_at).toLocaleString() : ''}`} side="top">
            <span>{badge}</span>
          </Tooltip>
        ) : badge;
      },
    },
    {
      id: 'notes', header: 'Operational Notes',
      cell: ({ row }) => row.notes
        ? <div style={{ whiteSpace: 'pre-wrap', maxWidth: 260 }}>{row.notes}</div>
        : <span style={{ color: 'var(--clet-text-secondary)', fontStyle: 'italic' }}>None Logged</span>,
    },
    { id: 'docs', header: 'Attached Files', cell: ({ row }) => renderDocumentLinks(row.files) },
    { id: 'loggedBy', header: 'Logged By', accessorFn: (s) => s.updatedBy || s.agent_email || 'N/A' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const approved = Number(row.approved) === 1;
        const editButton = (
          <Button variant="secondary" size="sm" disabled={!approved} onClick={() => openEditProgress(row)}>
            <FiEdit2 /> Edit
          </Button>
        );
        return approved ? editButton : (
          <Tooltip content="This shipment must be approved by the manager before its status can be edited." side="top">
            <span>{editButton}</span>
          </Tooltip>
        );
      },
    },
  ];

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
        <h3 style={{ color: '#0f172a', fontFamily: 'sans-serif' }}>Connecting to SQL Terminal Registry...</h3>
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
            <ProfileMenu
              apiUrl={API_URL}
              email={userEmail}
              role={isManager ? 'Manager' : 'Field Agent'}
              onSignOut={handleLogout}
            />
          </AppHeaderActions>
        </AppHeader>

        <AppBody>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--clet-text)' }}>Manifest Console</h1>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--clet-text-secondary)', fontSize: '0.9rem' }}>Log new shipments and track the full team's manifest feed</p>
          </div>

          {isManager && (
            <div className="mgr-view-as-bar">
              <label htmlFor="viewAsAgent">Viewing as:</label>
              <Dropdown
                aria-label="Viewing as"
                value={viewingAgentEmail}
                onValueChange={setViewingAgentEmail}
                placeholder="My Own"
                clearable
                options={agentsList.map((emp) => ({ value: emp.email, label: `${emp.name} (${emp.email})` }))}
              />
              {viewingAgentEmail && (
                <span className="mgr-view-as-banner">
                  Viewing {(agentsList.find((a) => a.email === viewingAgentEmail) || {}).name || viewingAgentEmail}'s manifest console as Manager — any shipment you log here will be recorded under their name.
                </span>
              )}
            </div>
          )}

          <div className="ds-metric-section">
            <h4 className="ds-metric-section-label">Today</h4>
            <div className="ds-metric-grid ds-metric-grid--today">
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--blue" mark="nkyimkyim" icon={<FiCalendar />} label="Shipments Logged Today" value={loggedTodayCount} description="Since midnight" />
            </div>
          </div>

          <div className="ds-metric-section">
            <h4 className="ds-metric-section-label">All-Time</h4>
            <div className="ds-metric-grid">
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--navy" mark="hwemudua" icon={<FiPackage />} label="Total Shipments Logged" value={myShipments.length} description="All-time total" />
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--amber" mark="mate-masie" icon={<FiClock />} label="Pending Review" value={pendingCount} description="Awaiting delivery/approval" />
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--green" mark="akofena" icon={<FiCheckCircle />} label="Delivered" value={deliveredCount} description="All-time total" />
              <MetricCard variant="soft" animate className="sidman-metric sidman-metric--teal" mark="osram-ne-nsroma" icon={<FiCalendar />} label="Logged This Week" value={loggedThisWeekCount} description="Last 7 days" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Real-Time Terminal Manifest Streams</CardTitle>
              <CardActions>
                <Button variant="primary" size="sm" onClick={() => setShowLogShipment(true)}>
                  <FiPlus /> Log New Shipment
                </Button>
              </CardActions>
            </CardHeader>
            <Table variant="soft" paramPrefix="my-shipments">
              <TableHeader><TableSearch placeholder="Search manifests..." /></TableHeader>
              <TableContent variant="soft" columns={shipmentColumns} data={shipmentsPaged} rowKey={(s) => s.id} />
              <TableFooter><TablePagination totalPages={shipmentsTotalPages} totalItems={shipmentsSorted.length} /></TableFooter>
            </Table>
          </Card>
        </AppBody>
      </AppLayout>

      <Dialog open={showLogShipment} onOpenChange={setShowLogShipment}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton>
            <DialogTitle>
              {viewingAgentEmail
                ? `Log Shipment for ${(agentsList.find((a) => a.email === viewingAgentEmail) || {}).name || viewingAgentEmail}`
                : 'Log Shipment'}
            </DialogTitle>
            <Form {...logShipmentForm}>
              <form onSubmit={logShipmentForm.handleSubmit(handleLogShipment)} className="ds-log-form" style={{ marginTop: '1rem' }}>
                <FormField
                  control={logShipmentForm.control}
                  name="containerNo"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Container / Bill of Lading Identification</FieldLabel>
                      <FieldControl><Input placeholder="e.g., MSKU948201" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={logShipmentForm.control}
                  name="clientName"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Consignee / Client Entity Name</FieldLabel>
                      <FieldControl><Input placeholder="e.g., Ahmed Kwabena Ltd" {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <div className="form-row-split">
                  <FormField
                    control={logShipmentForm.control}
                    name="origin"
                    render={({ field, fieldState }) => (
                      <Field invalid={!!fieldState.error}>
                        <FieldLabel>Origin Port</FieldLabel>
                        <FieldControl><Input placeholder="e.g., Shanghai, China" {...field} /></FieldControl>
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                  <FormField
                    control={logShipmentForm.control}
                    name="destination"
                    render={({ field, fieldState }) => (
                      <Field invalid={!!fieldState.error}>
                        <FieldLabel>Destination Port</FieldLabel>
                        <FieldControl><Input placeholder="e.g., Tema Port, Ghana" {...field} /></FieldControl>
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </div>

                <FormField
                  control={logShipmentForm.control}
                  name="customerId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Customer record (optional)</FieldLabel>
                      <FieldControl>
                        <Combobox
                          aria-label="Customer record"
                          value={field.value || ''}
                          onValueChange={(v) => field.onChange(v ?? '')}
                          options={customers.map((c) => ({ value: String(c.id), label: c.name }))}
                          placeholder="Link to a customer"
                          searchPlaceholder="Search customers..."
                          emptyMessage="No customer records yet."
                          clearable
                        />
                      </FieldControl>
                      <FieldError>
                        Linking a customer feeds the demographic breakdowns in the quarterly report.
                      </FieldError>
                    </Field>
                  )}
                />

                <div className="dash-form-row">
                  <FormField
                    control={logShipmentForm.control}
                    name="regime"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Regime</FieldLabel>
                        <FieldControl>
                          <Dropdown
                            aria-label="Regime"
                            value={field.value || ''}
                            onValueChange={(v) => field.onChange(v ?? '')}
                            placeholder="Select regime"
                            options={REGIMES.map((r) => ({ value: r, label: r }))}
                            clearable
                          />
                        </FieldControl>
                      </Field>
                    )}
                  />
                  <FormField
                    control={logShipmentForm.control}
                    name="consignmentType"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Consignment type</FieldLabel>
                        <FieldControl>
                          <Dropdown
                            aria-label="Consignment type"
                            value={field.value || ''}
                            onValueChange={(v) => field.onChange(v ?? '')}
                            placeholder="Select type"
                            options={CONSIGNMENT_TYPES.map((c) => ({ value: c, label: c }))}
                            clearable
                          />
                        </FieldControl>
                      </Field>
                    )}
                  />
                </div>

                <FormField
                  control={logShipmentForm.control}
                  name="status"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Clearance Operations Status</FieldLabel>
                      <FieldControl>
                        <Dropdown
                          aria-label="Clearance operations status"
                          value={field.value}
                          onValueChange={field.onChange}
                          options={SHIPMENT_STATUS_OPTIONS}
                        />
                      </FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={logShipmentForm.control}
                  name="notes"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Operational Processing Log Notes</FieldLabel>
                      <FieldControl><Textarea rows={3} placeholder="Add processing log instructions..." {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <Field>
                  <FieldLabel>Attach Manifest Document Files</FieldLabel>
                  <FieldControl>
                    <UploadField multiple value={selectedFiles} onChange={setSelectedFiles} />
                  </FieldControl>
                </Field>

                <button type="submit" className="commit-btn" disabled={logShipmentForm.formState.isSubmitting}>
                  {logShipmentForm.formState.isSubmitting ? 'Saving...' : 'Save Shipment'}
                </button>
              </form>
            </Form>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={!!editingProgressShipment} onOpenChange={(open) => { if (!open) setEditingProgressShipment(null); }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton>
            <DialogTitle>Update Clearance Progress</DialogTitle>
            <DialogDescription>{editingProgressShipment?.containerNo || editingProgressShipment?.container_number}</DialogDescription>
            {editingProgressShipment?.notes && (
              <div className="ds-progress-history">
                <div className="ds-progress-history-label">Activity Log</div>
                <div className="ds-progress-history-body">{editingProgressShipment.notes}</div>
              </div>
            )}
            <Form {...progressForm}>
              <form onSubmit={progressForm.handleSubmit(handleSaveProgress)} className="ds-log-form" style={{ marginTop: '1rem' }}>
                <FormField
                  control={progressForm.control}
                  name="status"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Clearance Operations Status</FieldLabel>
                      <FieldControl>
                        <Dropdown
                          aria-label="Clearance operations status"
                          value={field.value}
                          onValueChange={field.onChange}
                          options={SHIPMENT_STATUS_OPTIONS}
                        />
                      </FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <FormField
                  control={progressForm.control}
                  name="comment"
                  render={({ field, fieldState }) => (
                    <Field invalid={!!fieldState.error}>
                      <FieldLabel>Add a Comment (optional)</FieldLabel>
                      <FieldControl><Textarea rows={3} placeholder="e.g., Duty paid, awaiting vessel discharge..." {...field} /></FieldControl>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
                <Field>
                  <FieldLabel>Attach Additional Files (optional)</FieldLabel>
                  <FieldControl>
                    <UploadField multiple value={progressFiles} onChange={setProgressFiles} />
                  </FieldControl>
                </Field>

                <Button type="submit" variant="primary" disabled={progressForm.formState.isSubmitting}>
                  {progressForm.formState.isSubmitting ? 'Saving...' : 'Save Progress Update'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </ThemeProvider>
  );
}

function Dashboard() {
  return (
    <ToastProvider>
      <DashboardInner />
      <Toaster />
    </ToastProvider>
  );
}

export default Dashboard;
