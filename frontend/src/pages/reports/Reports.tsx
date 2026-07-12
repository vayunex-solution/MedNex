import React, { useState, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Tab, Tabs, Chip, InputAdornment, CircularProgress, Autocomplete, IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { FileDownload, Assessment, Print, Cancel as CancelIcon, Edit } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { useSnackbar } from 'notistack';
import { reportService, customerService, supplierService, medicineService, saleService, companyService, purchaseService } from '../../services';
import PrintableInvoice from '../../components/invoice/PrintableInvoice';

const formatCurrency = (v: number | string) => `₹${Number(v || 0).toFixed(2)}`;

const ReportTable: React.FC<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; align?: 'right' | 'left'; format?: (v: unknown, row: Record<string, unknown>) => React.ReactNode }[] }> = ({ rows, columns }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'action.hover', '& th': { fontWeight: 700, fontSize: '0.78rem' } }}>
          {columns.map((c) => <TableCell key={c.key} align={c.align || 'left'}>{c.label}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow><TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>No data found</TableCell></TableRow>
        ) : rows.map((row, i) => (
          <TableRow key={i} hover>
            {columns.map((c) => (
              <TableCell key={c.key} align={c.align || 'left'}>
                {c.format ? c.format(row[c.key], row) : String(row[c.key] ?? '')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Paper>
);

interface ReportFilterProps { from: Dayjs | null; to: Dayjs | null; onFromChange: (v: Dayjs | null) => void; onToChange: (v: Dayjs | null) => void; onSearch: () => void; onExport: () => void; loading?: boolean; }

const ReportFilter: React.FC<ReportFilterProps> = ({ from, to, onFromChange, onToChange, onSearch, onExport, loading }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <DatePicker label="From Date" value={from} onChange={onFromChange} slotProps={{ textField: { size: 'small' } }} />
          <DatePicker label="To Date" value={to} onChange={onToChange} slotProps={{ textField: { size: 'small' } }} />
          <Button variant="contained" onClick={onSearch} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Search'}
          </Button>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={onExport}>Export Excel</Button>
        </Box>
      </CardContent>
    </Card>
  </LocalizationProvider>
);

// ─── Sales Report ─────────────────────────────────────────────────────────────
export const SalesReport: React.FC = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading, refetch } = useQuery({ queryKey: ['report-sales', params], queryFn: () => reportService.getSales(params) });
  
  const { data: companyRes } = useQuery({ queryKey: ['company-details'], queryFn: () => companyService.get() });
  const company = companyRes?.data?.data || null;

  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const handleCancelSale = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this sale? This action will restore the stock.')) return;
    try {
      await saleService.cancel(id);
      enqueueSnackbar('Sale cancelled successfully', { variant: 'success' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['report-customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['report-item-ledger'] });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to cancel sale', { variant: 'error' });
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const [printInvoice, setPrintInvoice] = useState<unknown>(null);
  const handlePrintAction = useReactToPrint({ contentRef: printRef });

  const handlePrint = async (invoiceId: number) => {
    try {
      const res = await saleService.getById(invoiceId);
      setPrintInvoice(res.data.data);
      setTimeout(() => {
        handlePrintAction();
      }, 100);
    } catch (error) {
      console.error('Failed to load invoice for printing', error);
    }
  };

  const rows = (data?.data?.data as Record<string, unknown>[] || []);
  const total = rows.reduce((s, r) => s + Number(r.grandTotal || 0), 0);
  const cols = [
    { key: 'invoiceNo', label: 'Invoice No' },
    { key: 'invoiceDate', label: 'Date', format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('en-IN') : '' },
    { key: 'customerName', label: 'Customer', format: (_: unknown, row?: Record<string, unknown>) => (row?.customer as Record<string, unknown>)?.name as string || 'Walk-in' },
    { key: 'grandTotal', label: 'Amount', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'paymentMode', label: 'Payment' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Action', align: 'right' as const, format: (_: unknown, row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <IconButton size="small" color="primary" onClick={() => navigate(`/sales?editId=${row.id}`)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" color="primary" onClick={() => handlePrint(row.id as number)}>
          <Print fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" disabled={row.status === 'cancelled'} onClick={() => handleCancelSale(row.id as number)}>
          <CancelIcon fontSize="small" />
        </IconButton>
      </Box>
    )}
  ];
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ Invoice: r.invoiceNo, Date: r.invoiceDate, Customer: (r.customer as Record<string, unknown>)?.name || 'Walk-in', Amount: r.grandTotal, Payment: r.paymentMode })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'SalesReport.xlsx');
  };
  return (
    <Box>
      <Box sx={{ display: 'none' }}>
        <PrintableInvoice ref={printRef} invoice={printInvoice} company={company} />
      </Box>
      <Typography variant="h5" fontWeight={700} mb={2}><Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />Sales Report</Typography>
      <ReportFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={handleExport} loading={isLoading} />
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip label={`Total: ${formatCurrency(total)}`} color="primary" />
      </Box>
      <ReportTable rows={rows.map((r) => ({ ...r, customerName: (r.customer as Record<string, unknown>)?.name || 'Walk-in' }))} columns={cols} />
    </Box>
  );
};

// ─── Purchase Report ─────────────────────────────────────────────────────────────
export const PurchaseReport: React.FC = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading, refetch } = useQuery({ queryKey: ['report-purchase', params], queryFn: () => reportService.getPurchase(params) });
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const handleCancelPurchase = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this purchase? This action will deduct the stock.')) return;
    try {
      await purchaseService.remove(id);
      enqueueSnackbar('Purchase cancelled successfully', { variant: 'success' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['report-supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['report-item-ledger'] });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to cancel purchase', { variant: 'error' });
    }
  };

  const rows = (data?.data?.data as Record<string, unknown>[] || []);
  const total = rows.reduce((s, r) => s + Number(r.grandTotal || 0), 0);
  const cols = [
    { key: 'invoiceNo', label: 'Invoice No' },
    { key: 'invoiceDate', label: 'Date', format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('en-IN') : '' },
    { key: 'supplierName', label: 'Supplier', format: (_: unknown, row?: Record<string, unknown>) => (row?.supplier as Record<string, unknown>)?.name as string || 'Walk-in' },
    { key: 'grandTotal', label: 'Amount', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'paymentMode', label: 'Payment' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Action', align: 'right' as const, format: (_: unknown, row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <IconButton size="small" color="primary" onClick={() => navigate(`/purchase?editId=${row.id}`)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" disabled={row.status === 'cancelled'} onClick={() => handleCancelPurchase(row.id as number)}>
          <CancelIcon fontSize="small" />
        </IconButton>
      </Box>
    )}
  ];
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ Invoice: r.invoiceNo, Date: r.invoiceDate, Supplier: (r.supplier as Record<string, unknown>)?.name || 'Walk-in', Amount: r.grandTotal, Payment: r.paymentMode })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, 'PurchaseReport.xlsx');
  };
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}><Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />Purchase Report</Typography>
      <ReportFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={handleExport} loading={isLoading} />
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip label={`Total: ${formatCurrency(total)}`} color="secondary" />
      </Box>
      <ReportTable rows={rows.map((r) => ({ ...r, supplierName: (r.supplier as Record<string, unknown>)?.name || 'Walk-in' }))} columns={cols} />
    </Box>
  );
};

// ─── GST Report ────────────────────────────────────────────────────────────────
export const GstReport: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading } = useQuery({ queryKey: ['report-gst', params], queryFn: () => reportService.getGst(params) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []);
  const cols = [
    { key: 'hsnCode', label: 'HSN Code' },
    { key: 'cgstRate', label: 'CGST %' },
    { key: 'sgstRate', label: 'SGST %' },
    { key: 'taxable', label: 'Taxable Amt', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'cgstAmt', label: 'CGST Amt', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'sgstAmt', label: 'SGST Amt', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'totalGst', label: 'Total GST', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
  ];
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>GST Summary Report</Typography>
      <ReportFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={() => {}} loading={isLoading} />
      <ReportTable rows={rows} columns={cols} />
    </Box>
  );
};

// ─── Profit Report ─────────────────────────────────────────────────────────────
export const ProfitReport: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading } = useQuery({ queryKey: ['report-profit', params], queryFn: () => reportService.getProfit(params) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []);
  const cols = [
    { key: 'date', label: 'Date', format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('en-IN') : '' },
    { key: 'sales', label: 'Sales', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'purchases', label: 'Purchase', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'profit', label: 'Profit', align: 'right' as const, format: (_: unknown, row?: Record<string, unknown>) => formatCurrency(((row?.sales as number) || 0) - ((row?.purchases as number) || 0)) },
  ];
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Profit Report</Typography>
      <ReportFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={() => {}} loading={isLoading} />
      <ReportTable rows={rows} columns={cols} />
    </Box>
  );
};

// ─── Customer Ledger ─────────────────────────────────────────────────────────────
export const CustomerLedger: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD'), customerId: '' as number | string });

  const { data: customersData } = useQuery({ queryKey: ['customers-list'], queryFn: () => customerService.getList() });
  const customers = (customersData?.data?.data as {id: number, name: string}[] || []);

  const { data, isLoading } = useQuery({ queryKey: ['report-customer-ledger', params], queryFn: () => reportService.getCustomerLedger(params) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []);

  // Get closing balance from the last row
  const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
  const closingBalance = lastRow ? Number(lastRow.balance || 0) : 0;
  const closingType = lastRow ? (lastRow.balanceType as string || 'Dr') : 'Dr';

  const cols = [
    { key: 'date', label: 'Date', format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('en-IN') : '' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'type', label: 'Type' },
    { key: 'debit', label: 'Debit', align: 'right' as const, format: (v: unknown) => Number(v) > 0 ? formatCurrency(v as number) : '0' },
    { key: 'credit', label: 'Credit', align: 'right' as const, format: (v: unknown) => Number(v) > 0 ? formatCurrency(v as number) : '0' },
    { key: 'balance', label: 'Balance', align: 'right' as const, format: (_: unknown, row?: Record<string, unknown>) => `${formatCurrency(row?.balance as number)} ${row?.balanceType || 'Dr'}` },
  ];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Date: r.date ? new Date(r.date as string).toLocaleDateString('en-IN') : '',
      'Voucher No': r.voucherNo,
      Type: r.type,
      Debit: Number(r.debit || 0),
      Credit: Number(r.credit || 0),
      Balance: `${Number(r.balance || 0).toFixed(2)} ${r.balanceType || 'Dr'}`,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Customer Ledger');
    XLSX.writeFile(wb, 'CustomerLedger.xlsx');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Customer Ledger</Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Autocomplete
                options={customers}
                getOptionLabel={(o) => o.name}
                sx={{ width: 200 }}
                size="small"
                onChange={(_, v) => setCustomerId(v?.id || '')}
                renderInput={(params) => <TextField {...params} label="Select Customer" />}
              />
              <DatePicker label="From Date" value={from} onChange={setFrom} slotProps={{ textField: { size: 'small' } }} />
              <DatePicker label="To Date" value={to} onChange={setTo} slotProps={{ textField: { size: 'small' } }} />
              <Button variant="contained" onClick={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD'), customerId })} disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Search'}
              </Button>
              <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExport}>Export Excel</Button>
            </Box>
          </CardContent>
        </Card>
      </LocalizationProvider>
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip label={`Closing Balance: ${formatCurrency(closingBalance)} ${closingType}`} color="primary" />
      </Box>
      <ReportTable rows={rows} columns={cols} />
    </Box>
  );
};

// ─── Supplier Ledger ─────────────────────────────────────────────────────────────
export const SupplierLedger: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD'), supplierId: '' as number | string });

  const { data: suppliersData } = useQuery({ queryKey: ['suppliers-list'], queryFn: () => supplierService.getList() });
  const suppliers = (suppliersData?.data?.data as {id: number, name: string}[] || []);

  const { data, isLoading } = useQuery({ queryKey: ['report-supplier-ledger', params], queryFn: () => reportService.getSupplierLedger(params) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []);
  
  const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
  const closingBalance = lastRow ? Number(lastRow.balance || 0) : 0;
  const closingType = lastRow ? (lastRow.balanceType as string || 'Cr') : 'Cr';

  const cols = [
    { key: 'date', label: 'Date', format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('en-IN') : '' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'type', label: 'Type' },
    { key: 'debit', label: 'Debit', align: 'right' as const, format: (v: unknown) => Number(v) > 0 ? formatCurrency(v as number) : '0' },
    { key: 'credit', label: 'Credit', align: 'right' as const, format: (v: unknown) => Number(v) > 0 ? formatCurrency(v as number) : '0' },
    { key: 'balance', label: 'Balance', align: 'right' as const, format: (_: unknown, row?: Record<string, unknown>) => `${formatCurrency(row?.balance as number)} ${row?.balanceType || 'Cr'}` },
  ];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Date: r.date ? new Date(r.date as string).toLocaleDateString('en-IN') : '',
      'Voucher No': r.voucherNo,
      Type: r.type,
      Debit: Number(r.debit || 0),
      Credit: Number(r.credit || 0),
      Balance: `${Number(r.balance || 0).toFixed(2)} ${r.balanceType || 'Cr'}`,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Supplier Ledger');
    XLSX.writeFile(wb, 'SupplierLedger.xlsx');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Supplier Ledger</Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(o) => o.name}
                sx={{ width: 200 }}
                size="small"
                onChange={(_, v) => setSupplierId(v?.id || '')}
                renderInput={(params) => <TextField {...params} label="Select Supplier" />}
              />
              <DatePicker label="From Date" value={from} onChange={setFrom} slotProps={{ textField: { size: 'small' } }} />
              <DatePicker label="To Date" value={to} onChange={setTo} slotProps={{ textField: { size: 'small' } }} />
              <Button variant="contained" onClick={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD'), supplierId })} disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Search'}
              </Button>
              <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExport}>Export Excel</Button>
            </Box>
          </CardContent>
        </Card>
      </LocalizationProvider>
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip label={`Closing Balance: ${formatCurrency(closingBalance)} ${closingType}`} color="secondary" />
      </Box>
      <ReportTable rows={rows} columns={cols} />
    </Box>
  );
};

// ─── Item Ledger ─────────────────────────────────────────────────────────────
export const ItemLedger: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [medicineId, setMedicineId] = useState<number | ''>('');
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD'), medicineId: '' as number | string });

  const { data: medicinesData } = useQuery({ queryKey: ['medicines-list'], queryFn: () => medicineService.getList() });
  const medicines = (medicinesData?.data?.data as {id: number, name: string}[] || []);

  const { data, isLoading } = useQuery({ queryKey: ['report-item-ledger', params], queryFn: () => reportService.getItemLedger(params) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []);

  const cols = [
    { key: 'date', label: 'Date', format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('en-IN') : '' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'type', label: 'Transaction Type' },
    { key: 'partyName', label: 'Party Name', format: (v: unknown) => (v as string) || '-' },
    { key: 'itemCode', label: 'Item Code' },
    { key: 'medicineName', label: 'Item Name' },
    { key: 'unit', label: 'Unit', format: (v: unknown) => (v as string) || '-' },
    { key: 'openingQty', label: 'Opening Qty', align: 'right' as const },
    { key: 'inwardQty', label: 'Inward Qty', align: 'right' as const },
    { key: 'outwardQty', label: 'Outward Qty', align: 'right' as const },
    { key: 'closingQty', label: 'Closing Qty', align: 'right' as const },
    { key: 'rate', label: 'Rate', align: 'right' as const, format: (v: unknown) => Number(v) > 0 ? formatCurrency(v as number) : '-' },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Item Ledger Report</Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Autocomplete
                options={medicines}
                getOptionLabel={(o) => o.name}
                sx={{ width: 250 }}
                size="small"
                onChange={(_, v) => setMedicineId(v?.id || '')}
                renderInput={(params) => <TextField {...params} label="Select Medicine" />}
              />
              <DatePicker label="From Date" value={from} onChange={setFrom} slotProps={{ textField: { size: 'small' } }} />
              <DatePicker label="To Date" value={to} onChange={setTo} slotProps={{ textField: { size: 'small' } }} />
              <Button variant="contained" onClick={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD'), medicineId })} disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Search'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </LocalizationProvider>
      <ReportTable rows={rows} columns={cols} />
    </Box>
  );
};
