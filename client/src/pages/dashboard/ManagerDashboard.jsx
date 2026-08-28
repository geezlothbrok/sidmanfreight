import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, serverLogout, displayNameFromEmail, initialsFromEmail } from '../../utils/auth';
import { authFetch } from '../../utils/authFetch';
import ProfileMenu from './components/ProfileMenu';
import InvoiceManager from './components/InvoiceManager';
import ReportsPanel from './components/ReportsPanel';
import CustomerManager from './components/CustomerManager';
import { SHIPMENT_COLUMNS, TRANSACTION_COLUMNS, printReport } from '../../utils/reportExport';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiBarChart2, FiFileText, FiGrid, FiUsers, FiDollarSign, FiPackage, FiClock, FiUserCheck, FiCreditCard, FiRefreshCw, FiDownload, FiCheck, FiTrash2, FiPaperclip, FiMoreHorizontal, FiActivity, FiEdit2 } from 'react-icons/fi';
import {
  ThemeProvider, AppLayout, AppSidebar, AppBody, AppHeader, AppHeaderActions,   Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarNav, SidebarGroup, SidebarItem, SidebarLink,
  MetricCard, Card, CardHeader, CardTitle, CardActions, Button, Badge,
  ExportButton,
  Table, TableHeader, TableSearch, TableContent, TableBulkActions, TableFooter, TablePagination, useTableState,
  ToastProvider, Toaster, useToast,
  Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription,
  Popover, PopoverTrigger, PopoverContent, PopoverClose,
  AppSwitcher,
  Form, FormField, Field, FieldLabel, FieldControl, FieldError, Input, Textarea, Dropdown, UploadField,
} from '@rfdtech/components';
import '@rfdtech/components/style.css';
import IncomeExpenseChart from './components/IncomeExpenseChart';
import portalLogo from '../../assets/images/logo-trimmed.jpg';
import './ManagerDashboard.css';

const NAV_ITEMS = [
  { key: 'overview', label: 'Dashboard', icon: <FiGrid /> },
  { key: 'employees', label: 'Employees', icon: <FiUsers /> },
  { key: 'payroll', label: 'Payroll', icon: <FiCreditCard /> },
  { key: 'financials', label: 'Finances', icon: <FiDollarSign /> },
  { key: 'customers', label: 'Customers', icon: <FiUsers /> },
  { key: 'invoices', label: 'Invoices', icon: <FiFileText /> },
  { key: 'reports', label: 'Reports', icon: <FiBarChart2 /> },
  { key: 'audit', label: 'Audit Log', icon: <FiActivity /> },
];

const SWITCHER_APPS = [
  { id: 'executive', name: 'Executive Dashboard', icon: <FiGrid /> },
  { id: 'finance', name: 'Finance Portal', icon: <FiDollarSign /> },
  { id: 'agent', name: 'Field Agent Portal', icon: <FiUsers /> },
];

const TAB_META = {
  overview: { title: "Manager's Overview", subtitle: '', searchPlaceholder: 'Search manifest feed...' },
  employees: { title: 'Employees', subtitle: 'Manage field agents, roles, and accounts', searchPlaceholder: 'Search employees...' },
  payroll: { title: 'Payroll', subtitle: 'Review salaries and disburse payments', searchPlaceholder: 'Search payroll...' },
  financials: { title: 'Finances', subtitle: 'Track income, expenses, and account balance', searchPlaceholder: 'Search ledger entries...' },
  customers: { title: 'Customers', subtitle: 'Client register and demographics', searchPlaceholder: 'Search customers...' },
  reports: { title: 'Reports', subtitle: 'Operations and financial summary for any period', searchPlaceholder: '' },
  invoices: { title: 'Invoices', subtitle: 'Create, edit, and print client invoices', searchPlaceholder: 'Search invoices...' },
  audit: { title: 'Audit Log', subtitle: 'Every login, export, and change across the system', searchPlaceholder: 'Search audit log...' },
};

const AUDIT_EVENT_BADGE = {
  login: 'default',
  logout: 'default',
  create: 'success',
  approve: 'success',
  disburse: 'success',
  update: 'warning',
  export: 'primary',
  delete: 'error',
};

// Departments a new staff account can belong to. Purely a label/category —
// every employee still logs into the standard staff dashboard (portal access
// is unchanged; only the fixed manager/finance accounts reach their portals).
const DEPARTMENTS = [
  { value: 'Customer Service / Front Desk', label: 'Customer Service / Front Desk' },
  { value: 'Operations / Logistics', label: 'Operations / Logistics' },
];

const employeeFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().trim().min(1, 'Phone number is required'),
  role: z.string().trim().min(1, 'Role is required'),
  base_salary: z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).min(0, 'Salary must be 0 or more'),
  // Optional: only set when the manager is resetting this employee's password.
  password: z.string().trim().refine(v => v === '' || v.length >= 6, 'Password must be at least 6 characters').optional(),
});

const transactionFormSchema = z.object({
  type: z.enum(['Income', 'Expense']),
  category: z.string().trim().min(1, 'Purpose is required'),
  reference_no: z.string().trim().min(1, 'Invoice/Receipt number is required'),
  bill_of_lading: z.string().trim().optional(),
  identification_no: z.string().trim().optional(),
  amount: z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be greater than 0'),
});

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

const shipmentFormSchema = z.object({
  containerNo: z.string().trim().min(1, 'Container/Ref No is required'),
  clientName: z.string().trim().min(1, 'Client name is required'),
  status: z.string().trim().min(1, 'Status is required'),
  origin: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  notes: z.string().trim().optional(),
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
  id: (s) => s.id,
  container: (s) => s.containerNo || s.container_number || s.reference_no || '',
  client: (s) => s.clientName || s.client_name || '',
};
const EMPLOYEE_ACCESSORS = {
  id: (e) => e.id,
  name: (e) => e.name || '',
  email: (e) => e.email || '',
  salary: (e) => parseFloat(e.base_salary) || 0,
};
const TRANSACTION_ACCESSORS = {
  date: (t) => (t.date_logged ? new Date(t.date_logged).getTime() : 0),
  category: (t) => t.category || '',
};
const AUDIT_ACCESSORS = {
  timestamp: (a) => (a.created_at ? new Date(a.created_at).getTime() : 0),
  actor: (a) => a.actor_email || '',
};

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? '/backend/manager_api.php' : 'https://api.sidmanfreightconsult.com/manager_api.php');
// The manager's identity comes from the session, not a constant. The backend
// decides who the manager is (MANAGER_EMAIL in the environment) and returns
// role on login; hardcoding an address here meant that changing the deployed
// MANAGER_EMAIL locked the real manager out of this screen.

function ManagerDashboardInner() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState(''); 
  
  const [activeTab, setActiveTab] = useState('overview');
  const [shipmentView, setShipmentView] = useState('pending');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState(new Set());
  const [editingShipment, setEditingShipment] = useState(null);
  const [editShipFiles, setEditShipFiles] = useState(null);
  const editShipmentForm = useForm({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: { containerNo: '', clientName: '', status: 'Pending Customs Review', origin: '', destination: '', notes: '' },
  });

  const [stats, setStats] = useState({ total_shipments: 0, total_employees: 0, net_profit: 0, total_shipments_today: 0, net_profit_today: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allShipments, setAllShipments] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  
  // New Employee Form States
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  
  const [editingEmployee, setEditingEmployee] = useState(null);
  const editEmployeeForm = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { name: '', email: '', phone: '', role: 'Agent', base_salary: 0 },
  });

  const [txFiles, setTxFiles] = useState(null);
  const addTransactionForm = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: { type: 'Income', category: '', reference_no: '', bill_of_lading: '', identification_no: '', amount: 0 },
  });

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const editTransactionForm = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: { type: 'Income', category: '', reference_no: '', bill_of_lading: '', identification_no: '', amount: 0 },
  });

  const { toast } = useToast();
  const setMessage = useCallback((msg) => { if (msg) toast({ title: msg, variant: 'success' }); }, [toast]);
  const setError = useCallback((err) => { if (err) toast({ title: err, variant: 'error' }); }, [toast]);

  const [confirmState, setConfirmState] = useState(null);
  const confirmAction = (title, description, onConfirm) => {
    setConfirmState({ title, description, onConfirm });
  };

  const shipmentsTable = useTableState({ paramPrefix: 'shipments', defaultPageSize: 10 });
  const employeesTable = useTableState({ paramPrefix: 'employees', defaultPageSize: 10 });
  const payrollTable = useTableState({ paramPrefix: 'payroll', defaultPageSize: 10 });
  const transactionsTable = useTableState({ paramPrefix: 'ledger', defaultPageSize: 10 });
  const auditTable = useTableState({ paramPrefix: 'audit', defaultPageSize: 10 });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'Manager') {
      navigate('/login');
    } else {
      setUserEmail(user.email);
      setCheckingAuth(false);
    }
  }, [navigate]);

  const fetchData = useCallback(async () => {
    try {
      let resOverview = await authFetch(`${API_URL}?action=get_overview`);
      let dataOverview = await resOverview.json();

      // A failed/expired token surfaces as a well-formed {error: ...} JSON body
      // (see backend/auth_guard.php), which still passes a truthy check —
      // retry once before giving up, instead of silently zeroing out the stats.
      // (JWTs aren't refreshable client-side; a truly expired session will be
      // caught by the getCurrentUser() guard above and bounced to /login.)
      if (!resOverview.ok || dataOverview?.error) {
        resOverview = await authFetch(`${API_URL}?action=get_overview`);
        dataOverview = await resOverview.json();
      }

      if (resOverview.ok && !dataOverview?.error) {
        setStats({
          total_shipments: dataOverview.total_shipments || 0,
          total_employees: dataOverview.total_employees || 0,
          net_profit: dataOverview.net_profit !== undefined ? dataOverview.net_profit : 0,
          total_shipments_today: dataOverview.total_shipments_today || 0,
          net_profit_today: dataOverview.net_profit_today !== undefined ? dataOverview.net_profit_today : 0
        });
      } else {
        setError(dataOverview?.error || 'Failed to load dashboard statistics. Please refresh.');
      }
      setStatsLoading(false);

      if (activeTab === 'overview') {
        const resShipments = await authFetch(`${API_URL}?action=get_all_shipments`);
        const dataShipments = await resShipments.json();
        if (Array.isArray(dataShipments)) setAllShipments(dataShipments);
      } else if (activeTab === 'employees' || activeTab === 'payroll') {
        const res = await authFetch(`${API_URL}?action=get_employees`);
        const data = await res.json();
        if (Array.isArray(data)) setEmployees(data);
      } else if (activeTab === 'financials') {
        const res = await authFetch(`${API_URL}?action=get_transactions`);
        const data = await res.json();
        if (Array.isArray(data)) setTransactions(data);
      } else if (activeTab === 'audit') {
        const res = await authFetch(`${API_URL}?action=get_audit_log`);
        const data = await res.json();
        if (Array.isArray(data)) setAuditLog(data);
      }
    } catch (err) {
      console.error("Error pulling manager metrics:", err);
      setError('Failed to load dashboard statistics. Please refresh.');
      setStatsLoading(false);
    }
  }, [activeTab, setError]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefreshClick = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    const logFd = new FormData();
    logFd.append('event_type', 'logout');
    logFd.append('description', `${userEmail} logged out`);
    await authFetch(`${API_URL}?action=log_event`, { method: 'POST', body: logFd }).catch(() => {});
    // Expire the session cookie server-side, then return to the login screen.
    await serverLogout(API_URL);
    navigate('/login');
  };

  useEffect(() => {
    if (!checkingAuth) { fetchData(); }
  }, [activeTab, checkingAuth, fetchData]);

  // Attachments (both transaction receipts and shipment manifests) live in the
  // DB and are streamed back through the backend. `filesArr` is the row's
  // `files` list [{id, name, size}]; `action` picks the matching download
  // endpoint (download_transaction_file / download_shipment_file).
  const renderDocLinks = (filesArr, action) => {
    const files = Array.isArray(filesArr) ? filesArr : [];
    if (files.length === 0) return <span className="mgr-doc-empty">No docs attached</span>;

    return (
      <Popover>
        <PopoverTrigger className="mgr-doc-count-btn" aria-label="View attached files">
          <FiPaperclip /> {files.length} file{files.length === 1 ? '' : 's'}
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={4} className="clet-popover--menu">
          <div className="mgr-doc-list">
            {files.map((f) => (
              <a key={f.id} href={`${API_URL}?action=${action}&id=${f.id}`} target="_blank" rel="noreferrer" className="mgr-doc-link" title={f.name}>
                <FiPaperclip /> <span className="mgr-doc-link-name">{f.name}</span>
              </a>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const handleBulkApproveShipments = async (ids) => {
    try {
      await Promise.all(Array.from(ids).map((id) => {
        const fd = new FormData(); fd.append('shipment_id', id);
        return authFetch(`${API_URL}?action=approve_shipment`, { method: 'POST', body: fd });
      }));
      setSelectedShipmentIds(new Set());
      setMessage(`${ids.size} shipment${ids.size === 1 ? '' : 's'} approved.`);
      fetchData();
    } catch (err) {
      console.error('approve_shipment failed:', err);
      setError('Could not reach the server to approve. Please try again in a moment.');
    }
  };

  const handleBulkDeleteShipments = (ids) => {
    confirmAction(
      'Delete shipments?',
      `Are you sure you want to completely drop ${ids.size} entry card file(s)? This cannot be undone.`,
      async () => {
        await Promise.all(Array.from(ids).map((id) => {
          const fd = new FormData(); fd.append('shipment_id', id);
          return authFetch(`${API_URL}?action=delete_shipment`, { method: 'POST', body: fd });
        }));
        setSelectedShipmentIds(new Set());
        setMessage(`${ids.size} shipment${ids.size === 1 ? '' : 's'} deleted.`);
        fetchData();
      }
    );
  };

  const handleBulkEditShipment = (ids) => {
    if (ids.size !== 1) {
      setError('Select exactly one shipment to edit.');
      return;
    }
    const [id] = Array.from(ids);
    const shipment = allShipments.find((s) => s.id === id);
    if (!shipment) return;

    editShipmentForm.reset({
      containerNo: shipment.containerNo || '',
      clientName: shipment.clientName || '',
      status: shipment.status || 'Pending Customs Review',
      origin: shipment.origin || '',
      destination: shipment.destination || '',
      notes: shipment.notes || '',
    });
    setEditShipFiles(null);
    setEditingShipment(shipment);
  };

  const handleSaveShipmentEdit = async (values) => {
    const fd = new FormData();
    fd.append('shipment_id', editingShipment.id);
    fd.append('container_number', values.containerNo);
    fd.append('client_name', values.clientName);
    fd.append('status', values.status);
    fd.append('origin', values.origin || '');
    fd.append('destination', values.destination || '');
    fd.append('notes', values.notes || '');
    // Append any newly-added documents to the shipment's manifest.
    const editFilesArray = Array.isArray(editShipFiles) ? editShipFiles : (editShipFiles ? [editShipFiles] : []);
    editFilesArray.forEach((file) => fd.append('manifest_files[]', file));

    try {
      const res = await authFetch(`${API_URL}?action=update_shipment`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(data.message);
        setEditShipFiles(null);
        setEditingShipment(null);
        setSelectedShipmentIds(new Set());
        fetchData();
      } else {
        setError(data.error || `Could not update the shipment (error ${res.status}). Please try again in a moment.`);
      }
    } catch (err) {
      console.error('update_shipment failed:', err);
      setError('Could not reach the server. Please check your connection and try again.');
    }
  };

  const handleDisburseSalary = async (id) => {
    const fd = new FormData(); fd.append('employee_id', id);
    try {
      const res = await authFetch(`${API_URL}?action=disburse_salary`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) { setMessage(data.message); fetchData(); }
      else { setError(data.error || `Could not disburse salary (error ${res.status}). Please try again in a moment.`); }
    } catch (err) {
      console.error('disburse_salary failed:', err);
      setError('Could not reach the server. Please check your connection and try again.');
    }
  };

  const openEditEmployee = (emp) => {
    editEmployeeForm.reset({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      role: emp.role || 'Agent',
      base_salary: parseFloat(emp.base_salary) || 0,
      password: '',
    });
    setEditingEmployee(emp);
  };

  const handleSaveEmployeeEdit = async (values) => {
    const fd = new FormData();
    fd.append('employee_id', editingEmployee.id);
    fd.append('name', values.name);
    fd.append('email', values.email);
    fd.append('phone', values.phone);
    fd.append('role', values.role);
    fd.append('base_salary', values.base_salary);
    // Optional password reset: only sent when the manager types a new one.
    // Left blank, the backend keeps the employee's existing password.
    if (values.password && values.password.trim() !== '') {
      fd.append('password', values.password.trim());
    }

    try {
      const res = await authFetch(`${API_URL}?action=update_employee`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(data.message);
        setEditingEmployee(null);
        fetchData();
      } else {
        setError(data.error || `Could not update the employee (error ${res.status}). Please try again in a moment.`);
      }
    } catch (err) {
      console.error('update_employee failed:', err);
      setError('Could not reach the server. Please check your connection and try again.');
    }
  };

  const handleDeleteEmployee = (id, name) => {
    confirmAction(
      'Remove employee?',
      `Are you sure you want to completely remove ${name} from system registries? This cannot be undone.`,
      async () => {
        const fd = new FormData();
        fd.append('employee_id', id);

        try {
          const res = await authFetch(`${API_URL}?action=delete_employee`, { method: 'POST', body: fd });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            setMessage(data.message);
            fetchData();
          } else {
            setError(data.error || `Could not remove the employee (error ${res.status}). Please try again in a moment.`);
          }
        } catch (err) {
          console.error('delete_employee failed:', err);
          setError('Could not reach the server. Please check your connection and try again.');
        }
      }
    );
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

    try {
      const res = await authFetch(`${API_URL}?action=update_transaction`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setEditingTransaction(null);
        fetchData();
      } else {
        setError(data.error || "Failed to update financial item statement record.");
      }
    } catch (err) {
      setError("Network or API communication breakdown while altering ledger.");
    }
  };

  const handleDeleteTransaction = (id) => {
    confirmAction(
      'Delete ledger entry?',
      'Are you absolutely sure you want to completely delete this entry line item from the ledger sheet? This will alter balance statistics and cannot be undone.',
      async () => {
        const fd = new FormData();
        fd.append('transaction_id', id);

        try {
          const res = await authFetch(`${API_URL}?action=delete_transaction`, { method: 'POST', body: fd });
          const data = await res.json();
          if (data.success) {
            setMessage(data.message);
            fetchData();
          } else {
            setError(data.error || "Failed to remove transaction registry entry line.");
          }
        } catch (err) {
          setError("Network error encountered during ledger deletion.");
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
    printReport({ reportKey: filename, rows: dataArray, columns, generatedBy: getCurrentUser()?.email });
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    if (!empRole) { setError('Please choose a department for this employee.'); return; }
    const formData = new FormData();
    formData.append('name', empName);
    formData.append('email', empEmail);
    formData.append('phone', empPhone);
    formData.append('role', empRole);
    formData.append('base_salary', empSalary);
    formData.append('password', empPassword);

    // Surface real failures — including a portal that's briefly unreachable
    // during a deploy — instead of the form silently doing nothing.
    try {
      const res = await authFetch(`${API_URL}?action=add_employee`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(data.message); setEmpName(''); setEmpEmail(''); setEmpPhone(''); setEmpRole(''); setEmpSalary(''); setEmpPassword(''); setShowAddEmployee(false); fetchData();
      } else {
        setError(data.error || `Could not add the employee (error ${res.status}). Please try again in a moment.`);
      }
    } catch (err) {
      console.error('add_employee failed:', err);
      setError('Could not reach the server. Please check your connection and try again.');
    }
  };

  const handleAddTransaction = async (values) => {
    const formData = new FormData();
    formData.append('type', values.type);
    formData.append('amount', values.amount);
    formData.append('category', values.category.trim());
    formData.append('reference_no', values.reference_no.trim().toUpperCase());
    formData.append('bill_of_lading', (values.bill_of_lading || '').trim().toUpperCase());
    formData.append('identification_no', (values.identification_no || '').trim().toUpperCase());
    formData.append('notes', `Logged via pure ledger configuration.`);

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
        fetchData();
      } else {
        setError(data.error || `Could not save the entry (error ${res.status}). Please try again in a moment.`);
      }
    } catch (err) {
      console.error('add_transaction failed:', err);
      setError('Could not reach the server. Please check your connection and try again.');
    }
  };

  const pendingShipments = allShipments.filter(ship => Number(ship.approved) !== 1);
  const approvedShipments = allShipments.filter(ship => Number(ship.approved) === 1);

  const shipmentsSearchLower = shipmentsTable.search.trim().toLowerCase();
  const shipmentsBase = shipmentView === 'approved' ? approvedShipments : pendingShipments;
  const shipmentsSearched = shipmentsSearchLower
    ? shipmentsBase.filter(ship => [ship.containerNo, ship.container_number, ship.clientName, ship.client_name]
        .some(field => String(field || '').toLowerCase().includes(shipmentsSearchLower)))
    : shipmentsBase;
  const shipmentsSorted = sortRows(shipmentsSearched, shipmentsTable.sort, SHIPMENT_ACCESSORS);
  const shipmentsTotalPages = Math.max(1, Math.ceil(shipmentsSorted.length / shipmentsTable.pageSize));
  const shipmentsPageClamped = Math.min(shipmentsTable.page, shipmentsTotalPages);
  const shipmentsPaged = shipmentsSorted.slice(
    (shipmentsPageClamped - 1) * shipmentsTable.pageSize,
    shipmentsPageClamped * shipmentsTable.pageSize
  ).map((s, i) => ({ ...s, _rowNumber: (shipmentsPageClamped - 1) * shipmentsTable.pageSize + i + 1 }));

  const employeesSearchLower = employeesTable.search.trim().toLowerCase();
  const employeesSearched = employeesSearchLower
    ? employees.filter(emp => [emp.name, emp.email].some(field => String(field || '').toLowerCase().includes(employeesSearchLower)))
    : employees;
  const employeesSorted = sortRows(employeesSearched, employeesTable.sort, EMPLOYEE_ACCESSORS);
  const employeesTotalPages = Math.max(1, Math.ceil(employeesSorted.length / employeesTable.pageSize));
  const employeesPageClamped = Math.min(employeesTable.page, employeesTotalPages);
  const employeesPaged = employeesSorted.slice(
    (employeesPageClamped - 1) * employeesTable.pageSize,
    employeesPageClamped * employeesTable.pageSize
  ).map((e, i) => ({ ...e, _rowNumber: (employeesPageClamped - 1) * employeesTable.pageSize + i + 1 }));

  const payrollSearchLower = payrollTable.search.trim().toLowerCase();
  const payrollSearched = payrollSearchLower
    ? employees.filter(emp => [emp.name, emp.email].some(field => String(field || '').toLowerCase().includes(payrollSearchLower)))
    : employees;
  const payrollSorted = sortRows(payrollSearched, payrollTable.sort, EMPLOYEE_ACCESSORS);
  const payrollTotalPages = Math.max(1, Math.ceil(payrollSorted.length / payrollTable.pageSize));
  const payrollPageClamped = Math.min(payrollTable.page, payrollTotalPages);
  const payrollPaged = payrollSorted.slice(
    (payrollPageClamped - 1) * payrollTable.pageSize,
    payrollPageClamped * payrollTable.pageSize
  ).map((e, i) => ({ ...e, _rowNumber: (payrollPageClamped - 1) * payrollTable.pageSize + i + 1 }));

  const transactionsSearchLower = transactionsTable.search.trim().toLowerCase();
  const transactionsSearched = transactionsSearchLower
    ? transactions.filter(tx => [tx.category, tx.reference_no, tx.bill_of_lading, tx.identification_no].some(field => String(field || '').toLowerCase().includes(transactionsSearchLower)))
    : transactions;
  const transactionsSorted = sortRows(transactionsSearched, transactionsTable.sort, TRANSACTION_ACCESSORS);
  const transactionsTotalPages = Math.max(1, Math.ceil(transactionsSorted.length / transactionsTable.pageSize));
  const transactionsPageClamped = Math.min(transactionsTable.page, transactionsTotalPages);
  const transactionsPaged = transactionsSorted.slice(
    (transactionsPageClamped - 1) * transactionsTable.pageSize,
    transactionsPageClamped * transactionsTable.pageSize
  );

  const auditSearchLower = auditTable.search.trim().toLowerCase();
  const auditSearched = auditSearchLower
    ? auditLog.filter(a => [a.actor_email, a.event_type, a.description].some(field => String(field || '').toLowerCase().includes(auditSearchLower)))
    : auditLog;
  const auditSorted = sortRows(auditSearched, auditTable.sort, AUDIT_ACCESSORS);
  const auditTotalPages = Math.max(1, Math.ceil(auditSorted.length / auditTable.pageSize));
  const auditPageClamped = Math.min(auditTable.page, auditTotalPages);
  const auditPaged = auditSorted.slice(
    (auditPageClamped - 1) * auditTable.pageSize,
    auditPageClamped * auditTable.pageSize
  );

  const shipmentColumns = [
    { id: 'id', header: 'ID', accessorFn: (s) => `#${s._rowNumber}`, width: 70 },
    {
      id: 'container', header: 'Container/Ref No', sortable: true,
      cell: ({ row }) => <strong>{row.containerNo || row.container_number || row.reference_no || 'N/A'}</strong>,
    },
    { id: 'client', header: 'Client Name', sortable: true, accessorFn: (s) => s.clientName || s.client_name || 'N/A' },
    { id: 'route', header: 'Origin → Destination', accessorFn: (s) => `${s.origin || 'N/A'} → ${s.destination || 'N/A'}` },
    {
      id: 'status', header: 'Clearance Operations Status',
      cell: ({ row }) => <Badge variant={SHIPMENT_STATUS_BADGE[row.status] || 'default'}>{row.status || 'Active'}</Badge>,
    },
    {
      id: 'approved', header: 'Approved',
      cell: ({ row }) => <Badge variant={Number(row.approved) === 1 ? 'success' : 'default'}>{Number(row.approved) === 1 ? 'Yes' : 'No'}</Badge>,
    },
    {
      id: 'notes', header: 'Operational Notes',
      cell: ({ row }) => row.operational_notes || row.notes || row.operationalNotes || (
        <span style={{ color: 'var(--clet-text-secondary)', fontStyle: 'italic' }}>None Logged</span>
      ),
    },
    { id: 'docs', header: 'Attached Files', cell: ({ row }) => renderDocLinks(row.files, 'download_shipment_file') },
    { id: 'loggedBy', header: 'Logged By', accessorFn: (s) => s.updatedBy || s.agent_email || s.created_by || 'Terminal Agent' },
  ];

  const employeeColumns = [
    { id: 'id', header: 'ID', accessorFn: (e) => `#${e._rowNumber}`, width: 70 },
    { id: 'name', header: 'Name', sortable: true, cell: ({ row }) => <strong>{row.name}</strong> },
    { id: 'email', header: 'Email', sortable: true, accessorFn: (e) => e.email },
    {
      id: 'phone', header: 'Phone',
      cell: ({ row }) => row.phone || <span style={{ color: 'var(--clet-text-secondary)', fontStyle: 'italic' }}>N/A</span>,
    },
    { id: 'role', header: 'Department', cell: ({ row }) => <Badge variant={row.role === 'Manager' ? 'warning' : 'primary'}>{row.role || 'Agent'}</Badge> },
    {
      id: 'salary', header: 'Salary',
      accessorFn: (e) => { const v = parseFloat(e.base_salary); return `GH₵${!isNaN(v) ? v.toFixed(2) : '0.00'}`; },
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <Badge variant="success">{row.status || 'Active'}</Badge> },
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
                <button type="button" className="clet-popover__menu-item" role="menuitem" onClick={() => setViewingEmployee(row)}>
                  View
                </button>
              </PopoverClose>
              <PopoverClose asChild>
                <button type="button" className="clet-popover__menu-item" role="menuitem" onClick={() => openEditEmployee(row)}>
                  Edit
                </button>
              </PopoverClose>
              <PopoverClose asChild>
                <button
                  type="button"
                  className="clet-popover__menu-item clet-popover__menu-item--destructive"
                  role="menuitem"
                  onClick={() => handleDeleteEmployee(row.id, row.name)}
                >
                  Delete
                </button>
              </PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      ),
    },
  ];

  const payrollColumns = [
    { id: 'id', header: 'ID', accessorFn: (e) => `#${e._rowNumber}`, width: 70 },
    { id: 'name', header: 'Name', sortable: true, cell: ({ row }) => <strong>{row.name}</strong> },
    { id: 'email', header: 'Email', sortable: true, accessorFn: (e) => e.email },
    { id: 'role', header: 'Department', cell: ({ row }) => <Badge variant={row.role === 'Manager' ? 'warning' : 'primary'}>{row.role || 'Agent'}</Badge> },
    {
      id: 'salary', header: 'Salary', sortable: true,
      accessorFn: (e) => { const v = parseFloat(e.base_salary); return `GH₵${!isNaN(v) ? v.toFixed(2) : '0.00'}`; },
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <Badge variant="success">{row.status || 'Active'}</Badge> },
    {
      id: 'actions', header: 'Payroll Actions',
      cell: ({ row }) => {
        const alreadyPaid = row.status === 'Paid (Current Month)';
        return (
          <Button variant="success" size="sm" disabled={alreadyPaid} onClick={() => handleDisburseSalary(row.id)}>
            {alreadyPaid ? 'Paid' : 'Pay Salary'}
          </Button>
        );
      },
    },
  ];

  const transactionColumns = [
    { id: 'date', header: 'Date Placed', sortable: true, accessorFn: (t) => t.date_logged ? new Date(t.date_logged).toLocaleDateString() : 'N/A' },
    { id: 'category', header: 'Classification / Purpose', sortable: true, cell: ({ row }) => <strong>{row.category || 'N/A'}</strong> },
    {
      id: 'reference', header: 'Invoice/Receipt No.',
      cell: ({ row }) => (
        <span className="job-file-pill" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.8rem' }}>
          {row.reference_no || 'N/A'}
        </span>
      ),
    },
    {
      id: 'bill_of_lading', header: 'Bill of Lading',
      cell: ({ row }) => (
        <span className="job-file-pill" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.8rem' }}>
          {row.bill_of_lading || 'N/A'}
        </span>
      ),
    },
    {
      id: 'identification_no', header: 'Identification No.',
      cell: ({ row }) => (
        <span className="job-file-pill" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.8rem' }}>
          {row.identification_no || 'N/A'}
        </span>
      ),
    },
    { id: 'type', header: 'Stream Flow', cell: ({ row }) => <Badge variant={(row.type || 'Income') === 'Income' ? 'success' : 'error'}>{row.type || 'Income'}</Badge> },
    {
      id: 'amount', header: 'Net Amount',
      cell: ({ row }) => {
        const txTypeString = row.type || 'Income';
        const txAmountValue = parseFloat(row.amount);
        return (
          <span className={txTypeString === 'Income' ? 'text-green' : 'text-red'} style={{ fontWeight: '700' }}>
            {txTypeString === 'Income' ? '+' : '-'}GH₵{!isNaN(txAmountValue) ? txAmountValue.toFixed(2) : '0.00'}
          </span>
        );
      },
    },
    { id: 'docs', header: 'Attached Docs', cell: ({ row }) => renderDocLinks(row.files, 'download_transaction_file') },
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
                <button type="button" className="clet-popover__menu-item" role="menuitem" onClick={() => setViewingTransaction(row)}>
                  View
                </button>
              </PopoverClose>
              <PopoverClose asChild>
                <button type="button" className="clet-popover__menu-item" role="menuitem" onClick={() => openEditTransaction(row)}>
                  Edit
                </button>
              </PopoverClose>
              <PopoverClose asChild>
                <button
                  type="button"
                  className="clet-popover__menu-item clet-popover__menu-item--destructive"
                  role="menuitem"
                  onClick={() => handleDeleteTransaction(row.id)}
                >
                  Delete
                </button>
              </PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      ),
    },
  ];

  const auditColumns = [
    {
      id: 'timestamp', header: 'Timestamp', sortable: true,
      accessorFn: (a) => a.created_at ? new Date(a.created_at).toLocaleString() : 'N/A',
    },
    { id: 'actor', header: 'Actor', sortable: true, accessorFn: (a) => a.actor_email || 'Unknown' },
    {
      id: 'event', header: 'Event',
      cell: ({ row }) => <Badge variant={AUDIT_EVENT_BADGE[row.event_type] || 'default'}>{row.event_type}</Badge>,
    },
    { id: 'description', header: 'Description', accessorFn: (a) => a.description || '' },
  ];

  const netProfitValue = parseFloat(stats.net_profit);
  const netProfitIsNegative = !isNaN(netProfitValue) && netProfitValue < 0;
  const netProfitFormatted = `GH₵${!isNaN(netProfitValue) ? Math.abs(netProfitValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;

  const netProfitTodayValue = parseFloat(stats.net_profit_today);
  const netProfitTodayIsNegative = !isNaN(netProfitTodayValue) && netProfitTodayValue < 0;
  const netProfitTodayFormatted = `GH₵${!isNaN(netProfitTodayValue) ? Math.abs(netProfitTodayValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <h3 style={{ color: '#ffffff' }}>Verifying Executive Credentials...</h3>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <AppLayout>
        <AppHeader variant="primary">
          <AppHeaderActions>
            <AppSwitcher
              apps={SWITCHER_APPS}
              title="Switch Portal"
              triggerLabel="Switch portal"
              onAppSelect={(app) => {
                if (app.id === 'finance') navigate('/finance');
                else if (app.id === 'agent') navigate('/dashboard');
              }}
            />
            <ProfileMenu
              apiUrl={API_URL}
              email={userEmail}
              role={'Manager'}
              onSignOut={handleSignOut}
            />
          </AppHeaderActions>
        </AppHeader>

        <AppSidebar>
          <Sidebar>
            <SidebarHeader>
              <div className="clet-sidebar__header-brand">
                <img src={portalLogo} alt="Sidman Freight Consult" className="mgr-sidebar-logo" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarNav aria-label="Main">
                <SidebarGroup>
                  {NAV_ITEMS.map((item) => (
                    <SidebarItem key={item.key}>
                      <SidebarLink icon={item.icon} active={activeTab === item.key} onClick={() => setActiveTab(item.key)}>
                        {item.label}
                      </SidebarLink>
                    </SidebarItem>
                  ))}
                </SidebarGroup>
              </SidebarNav>
            </SidebarContent>
            <SidebarFooter>
              <span className="mgr-sidebar-wordmark">SIDMAN</span>
            </SidebarFooter>
          </Sidebar>
        </AppSidebar>

        <AppBody>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--clet-text)' }}>{TAB_META[activeTab].title}</h1>
            {TAB_META[activeTab].subtitle && (
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--clet-text-secondary)', fontSize: '0.9rem' }}>{TAB_META[activeTab].subtitle}</p>
            )}
          </div>

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="mgr-metric-section">
                <h4 className="mgr-metric-section-label">Today</h4>
                <div className="mgr-metric-grid">
                  <MetricCard variant="soft" animate mark="nkyimkyim" icon={<FiPackage />} label="Shipments Logged Today" value={statsLoading ? '…' : stats.total_shipments_today} description="Since midnight" />
                  <MetricCard
                    variant="soft"
                    animate
                    mark="nyansapo"
                    mark="osram-ne-nsroma"
                    icon={<FiCreditCard />}
                    label="Net Activity Today"
                    value={statsLoading ? '…' : netProfitTodayFormatted}
                    description="Income minus expenses, since midnight"
                    trend={netProfitTodayIsNegative ? 'down' : 'up'}
                    classNames={{ value: netProfitTodayIsNegative ? 'mgr-value-negative' : 'mgr-value-positive' }}
                  />
                </div>
              </div>

              <div className="mgr-metric-section">
                <h4 className="mgr-metric-section-label">All-Time</h4>
                <div className="mgr-metric-grid">
                  <MetricCard variant="soft" animate mark="hwemudua" icon={<FiPackage />} label="Total Logged Shipments" value={statsLoading ? '…' : stats.total_shipments} description="All-time total" />
                  <MetricCard variant="soft" animate mark="mate-masie" icon={<FiClock />} label="Pending Review" value={statsLoading ? '…' : pendingShipments.length} description="Awaiting manager approval" />
                  <MetricCard variant="soft" animate mark="akoma-ntoaso" icon={<FiUserCheck />} label="Registered Field Agents" value={statsLoading ? '…' : stats.total_employees} description="Active accounts" />
                  <MetricCard
                    variant="soft"
                    animate
                    icon={<FiCreditCard />}
                    label="Corporate Net Account Balance"
                    value={statsLoading ? '…' : netProfitFormatted}
                    description="Income minus expenses, all-time"
                    trend={netProfitIsNegative ? 'down' : 'up'}
                    classNames={{ value: netProfitIsNegative ? 'mgr-value-negative' : 'mgr-value-positive' }}
                  />
                </div>
              </div>

              <Card className="mgr-table-wrapper">
                <CardHeader>
                  <CardTitle>
                    {shipmentView === 'approved' ? 'Approved Shipments Archive' : 'Live Master Manifest Feed (Pending Review)'}
                  </CardTitle>
                  <CardActions style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button
                      variant={shipmentView === 'pending' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => { setShipmentView('pending'); setSelectedShipmentIds(new Set()); }}
                    >
                      Pending ({pendingShipments.length})
                    </Button>
                    <Button
                      variant={shipmentView === 'approved' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => { setShipmentView('approved'); setSelectedShipmentIds(new Set()); }}
                    >
                      Approved ({approvedShipments.length})
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleRefreshClick} disabled={refreshing}>
                      <FiRefreshCw className={refreshing ? 'mgr-spin' : ''} /> Refresh
                    </Button>
                    <ExportButton
                      variant="secondary"
                      size="sm"
                      data={shipmentView === 'approved' ? approvedShipments : pendingShipments}
                      columns={SHIPMENT_COLUMNS}
                      title={shipmentView === 'approved' ? 'Approved Shipments' : 'Pending Shipments'}
                      filename={shipmentView === 'approved' ? 'Approved_Shipments' : 'Pending_Shipments'}
                      formats={['csv', 'xlsx']}
                    />
                    <Button variant="secondary" size="sm" onClick={() => exportPdf(shipmentView === 'approved' ? approvedShipments : pendingShipments, shipmentView === 'approved' ? 'Approved_Shipments' : 'Pending_Shipments', SHIPMENT_COLUMNS)}>
                      <FiDownload /> PDF
                    </Button>
                  </CardActions>
                </CardHeader>
                <Table variant="soft" paramPrefix="shipments">
                  <TableHeader><TableSearch placeholder="Search manifest feed..." /></TableHeader>
                  <TableContent variant="soft"
                    columns={shipmentColumns}
                    data={shipmentsPaged}
                    rowKey={(s) => s.id}
                    selectable
                    selectedIds={selectedShipmentIds}
                    onSelectionChange={setSelectedShipmentIds}
                  />
                  <TableBulkActions
                    selectedIds={selectedShipmentIds}
                    onClear={() => setSelectedShipmentIds(new Set())}
                    actions={[
                      ...(shipmentView !== 'approved' ? [{ id: 'approve', label: 'Approve', icon: <FiCheck size={14} />, onClick: handleBulkApproveShipments }] : []),
                      { id: 'edit', label: 'Edit', icon: <FiEdit2 size={14} />, onClick: handleBulkEditShipment },
                      { id: 'delete', label: 'Delete', icon: <FiTrash2 size={14} />, onClick: handleBulkDeleteShipments, destructive: true },
                    ]}
                  />
                  <TableFooter><TablePagination totalPages={shipmentsTotalPages} totalItems={shipmentsSorted.length} /></TableFooter>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'employees' && (
            <Card className="mgr-table-wrapper">
              <CardHeader>
                <CardTitle>Authorized Security Register</CardTitle>
                <CardActions>
                  <Button variant="primary" size="sm" onClick={() => setShowAddEmployee(true)}>+ Add New Employee</Button>
                </CardActions>
              </CardHeader>
              <Table variant="soft" paramPrefix="employees">
                <TableHeader><TableSearch placeholder="Search employees..." /></TableHeader>
                <TableContent variant="soft" columns={employeeColumns} data={employeesPaged} rowKey={(e) => e.id} />
                <TableFooter><TablePagination totalPages={employeesTotalPages} totalItems={employeesSorted.length} /></TableFooter>
              </Table>
            </Card>
          )}

          <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
            <DialogPortal>
              <DialogOverlay />
              <DialogContent showCloseButton>
                <DialogTitle>Add New Employee</DialogTitle>
                <form onSubmit={handleAddEmployee} className="mgr-panel-form mgr-panel-form--in-dialog" style={{ marginTop: '1rem' }}>
                  <input type="text" placeholder="Full Employee Name" value={empName} onChange={e => setEmpName(e.target.value)} required />
                  <input type="email" placeholder="Corporate Gmail Address" value={empEmail} onChange={e => setEmpEmail(e.target.value)} required />
                  <input type="text" placeholder="Phone Number" value={empPhone} onChange={e => setEmpPhone(e.target.value)} required />
                  <Dropdown
                    aria-label="Department"
                    placeholder="Select Department"
                    value={empRole || null}
                    onValueChange={(v) => setEmpRole(v || '')}
                    options={DEPARTMENTS}
                  />
                  <input type="number" placeholder="Base Salary Monthly (GH₵)" value={empSalary} onChange={e => setEmpSalary(e.target.value)} required />
                  <input type="password" placeholder="Set Login Password (min. 6 characters)" value={empPassword} onChange={e => setEmpPassword(e.target.value)} minLength={6} required />
                  <Button type="submit" variant="primary">Add New Employee</Button>
                </form>
              </DialogContent>
            </DialogPortal>
          </Dialog>

          <Dialog open={!!viewingEmployee} onOpenChange={(open) => { if (!open) setViewingEmployee(null); }}>
            <DialogPortal>
              <DialogOverlay />
              <DialogContent showCloseButton>
                <DialogTitle>{viewingEmployee?.name}</DialogTitle>
                <DialogDescription>Employee record #{viewingEmployee?.id}</DialogDescription>
                <div className="mgr-view-details">
                  <div><span>Email</span><strong>{viewingEmployee?.email}</strong></div>
                  <div><span>Phone</span><strong>{viewingEmployee?.phone || 'N/A'}</strong></div>
                  <div><span>Department</span><strong>{viewingEmployee?.role || 'Agent'}</strong></div>
                  <div><span>Base Salary</span><strong>GH₵{!isNaN(parseFloat(viewingEmployee?.base_salary)) ? parseFloat(viewingEmployee?.base_salary).toFixed(2) : '0.00'}</strong></div>
                  <div><span>Status</span><strong>{viewingEmployee?.status || 'Active'}</strong></div>
                </div>
              </DialogContent>
            </DialogPortal>
          </Dialog>

          <Dialog open={!!editingEmployee} onOpenChange={(open) => { if (!open) setEditingEmployee(null); }}>
            <DialogPortal>
              <DialogOverlay />
              <DialogContent showCloseButton>
                <DialogTitle>Edit Employee</DialogTitle>
                <Form {...editEmployeeForm}>
                  <form onSubmit={editEmployeeForm.handleSubmit(handleSaveEmployeeEdit)} className="mgr-panel-form mgr-panel-form--in-dialog" style={{ marginTop: '1rem' }}>
                    <FormField
                      control={editEmployeeForm.control}
                      name="name"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Full Name</FieldLabel>
                          <FieldControl><Input {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editEmployeeForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Corporate Gmail Address</FieldLabel>
                          <FieldControl><Input type="email" {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editEmployeeForm.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Phone Number</FieldLabel>
                          <FieldControl><Input {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editEmployeeForm.control}
                      name="role"
                      render={({ field, fieldState }) => {
                        // Keep an existing non-standard role (e.g. an older
                        // "COO"/"Field Agent" label) selectable so editing an
                        // account doesn't silently blank/change its department.
                        const opts = (!field.value || DEPARTMENTS.some(d => d.value === field.value))
                          ? DEPARTMENTS
                          : [{ value: field.value, label: `${field.value} (current)` }, ...DEPARTMENTS];
                        return (
                          <Field invalid={!!fieldState.error}>
                            <FieldLabel>Department</FieldLabel>
                            <FieldControl>
                              <Dropdown
                                aria-label="Department"
                                placeholder="Select Department"
                                value={field.value || null}
                                onValueChange={(v) => field.onChange(v || '')}
                                options={opts}
                              />
                            </FieldControl>
                            <FieldError>{fieldState.error?.message}</FieldError>
                          </Field>
                        );
                      }}
                    />
                    <FormField
                      control={editEmployeeForm.control}
                      name="base_salary"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Base Salary Monthly (GH₵)</FieldLabel>
                          <FieldControl><Input type="number" step="0.01" {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editEmployeeForm.control}
                      name="password"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Reset Login Password</FieldLabel>
                          <FieldControl>
                            <Input type="password" placeholder="Leave blank to keep current password" autoComplete="new-password" {...field} />
                          </FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!editEmployeeForm.formState.isDirty || editEmployeeForm.formState.isSubmitting}
                    >
                      {editEmployeeForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
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
                <div className="mgr-view-details">
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
                  <form onSubmit={editTransactionForm.handleSubmit(handleSaveTransactionEdit)} className="mgr-panel-form mgr-panel-form--in-dialog" style={{ marginTop: '1rem' }}>
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

          <Dialog open={!!editingShipment} onOpenChange={(open) => { if (!open) setEditingShipment(null); }}>
            <DialogPortal>
              <DialogOverlay />
              <DialogContent showCloseButton>
                <DialogTitle>Edit Shipment</DialogTitle>
                <Form {...editShipmentForm}>
                  <form onSubmit={editShipmentForm.handleSubmit(handleSaveShipmentEdit)} className="mgr-panel-form mgr-panel-form--in-dialog" style={{ marginTop: '1rem' }}>
                    <FormField
                      control={editShipmentForm.control}
                      name="containerNo"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Container / Bill of Lading No.</FieldLabel>
                          <FieldControl><Input {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editShipmentForm.control}
                      name="clientName"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Client Name</FieldLabel>
                          <FieldControl><Input {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editShipmentForm.control}
                      name="status"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Status</FieldLabel>
                          <FieldControl>
                            <Dropdown
                              aria-label="Shipment status"
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
                      control={editShipmentForm.control}
                      name="origin"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Origin Port</FieldLabel>
                          <FieldControl><Input {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editShipmentForm.control}
                      name="destination"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Destination Port</FieldLabel>
                          <FieldControl><Input {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <FormField
                      control={editShipmentForm.control}
                      name="notes"
                      render={({ field, fieldState }) => (
                        <Field invalid={!!fieldState.error}>
                          <FieldLabel>Operational Notes</FieldLabel>
                          <FieldControl><Textarea rows={3} {...field} /></FieldControl>
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                    <Field>
                      <FieldLabel>Add Documents (attach to manifest)</FieldLabel>
                      <FieldControl>
                        <UploadField multiple value={editShipFiles} onChange={setEditShipFiles} />
                      </FieldControl>
                    </Field>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={(!editShipmentForm.formState.isDirty && !(editShipFiles && editShipFiles.length)) || editShipmentForm.formState.isSubmitting}
                    >
                      {editShipmentForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </DialogPortal>
          </Dialog>

          {activeTab === 'payroll' && (
            <Card className="mgr-table-wrapper">
              <CardHeader><CardTitle>Payroll</CardTitle></CardHeader>
              <Table variant="soft" paramPrefix="payroll">
                <TableHeader><TableSearch placeholder="Search payroll..." /></TableHeader>
                <TableContent variant="soft" columns={payrollColumns} data={payrollPaged} rowKey={(e) => e.id} />
                <TableFooter><TablePagination totalPages={payrollTotalPages} totalItems={payrollSorted.length} /></TableFooter>
              </Table>
            </Card>
          )}

          {activeTab === 'financials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="mgr-finances-row">
            <Card>
              <CardHeader><CardTitle>Income vs. Expense Trend</CardTitle></CardHeader>
              <IncomeExpenseChart transactions={transactions} />
            </Card>

            <Card className="mgr-panel-form-card">
              <h3 style={{ marginTop: 0 }}>Post Financial Action Entry</h3>
              <Form {...addTransactionForm}>
                <form onSubmit={addTransactionForm.handleSubmit(handleAddTransaction)} className="mgr-panel-form mgr-panel-form--in-dialog">
                  <FormField
                    control={addTransactionForm.control}
                    name="type"
                    render={({ field, fieldState }) => (
                      <Field invalid={!!fieldState.error}>
                        <FieldLabel>Type</FieldLabel>
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
                    control={addTransactionForm.control}
                    name="category"
                    render={({ field, fieldState }) => (
                      <Field invalid={!!fieldState.error}>
                        <FieldLabel>Classification / Purpose</FieldLabel>
                        <FieldControl><Input placeholder="e.g. Shipping Charges" {...field} /></FieldControl>
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
                    <FieldLabel>Attach Supporting Documents (Any Type)</FieldLabel>
                    <FieldControl>
                      <UploadField multiple value={txFiles} onChange={setTxFiles} />
                    </FieldControl>
                  </Field>

                  <Button type="submit" variant="primary" disabled={addTransactionForm.formState.isSubmitting}>
                    {addTransactionForm.formState.isSubmitting ? 'Saving...' : 'Commit Entry to Books'}
                  </Button>
                </form>
              </Form>
            </Card>
          </div>

          <Card className="mgr-table-wrapper">
            <CardHeader>
              <CardTitle>Corporate Ledger History Audit</CardTitle>
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
              </CardActions>
            </CardHeader>
            <Table variant="soft" paramPrefix="ledger">
              <TableHeader><TableSearch placeholder="Search ledger entries..." /></TableHeader>
              <TableContent variant="soft" columns={transactionColumns} data={transactionsPaged} rowKey={(t) => t.id} />
              <TableFooter><TablePagination totalPages={transactionsTotalPages} totalItems={transactionsSorted.length} /></TableFooter>
            </Table>
          </Card>
          </div>
          )}

          {activeTab === 'customers' && (
            <CustomerManager apiUrl={API_URL} canDelete onToast={toast} />
          )}

          {activeTab === 'reports' && (
            <ReportsPanel apiUrl={API_URL} />
          )}

          {activeTab === 'invoices' && (
            <InvoiceManager apiUrl={API_URL} onToast={toast} />
          )}

          {activeTab === 'audit' && (
            <Card className="mgr-table-wrapper">
              <CardHeader><CardTitle>System Audit Log</CardTitle></CardHeader>
              <Table variant="soft" paramPrefix="audit">
                <TableHeader><TableSearch placeholder="Search audit log..." /></TableHeader>
                <TableContent variant="soft" columns={auditColumns} data={auditPaged} rowKey={(a) => a.id} />
                <TableFooter><TablePagination totalPages={auditTotalPages} totalItems={auditSorted.length} /></TableFooter>
              </Table>
            </Card>
          )}
        </AppBody>
      </AppLayout>

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

function ManagerDashboard() {
  return (
    <ToastProvider>
      <ManagerDashboardInner />
      <Toaster />
    </ToastProvider>
  );
}

export default ManagerDashboard;