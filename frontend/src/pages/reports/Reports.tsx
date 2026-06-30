import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Tab, Tabs, Chip, InputAdornment, CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { FileDownload, Assessment } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { reportService } from '../../services';

const formatCurrency = (v: number) => `₹${v?.toFixed(2) || '0.00'}`;

const ReportTable: React.FC<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; align?: 'right' | 'left'; format?: (v: unknown) => string }[] }> = ({ rows, columns }) => (
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
                {c.format ? c.format(row[c.key]) : String(row[c.key] ?? '')}
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
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading, refetch } = useQuery({ queryKey: ['report-sales', params], queryFn: () => reportService.getSales(params) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []);
  const total = rows.reduce((s, r) => s + (r.grandTotal as number || 0), 0);
  const cols = [
    { key: 'invoiceNo', label: 'Invoice No' },
    { key: 'invoiceDate', label: 'Date', format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('en-IN') : '' },
    { key: 'customerName', label: 'Customer', format: (_: unknown, row?: Record<string, unknown>) => (row?.customer as Record<string, unknown>)?.name as string || 'Walk-in' },
    { key: 'grandTotal', label: 'Amount', align: 'right' as const, format: (v: unknown) => formatCurrency(v as number) },
    { key: 'paymentMode', label: 'Payment' },
    { key: 'status', label: 'Status' },
  ];
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ Invoice: r.invoiceNo, Date: r.invoiceDate, Customer: (r.customer as Record<string, unknown>)?.name || 'Walk-in', Amount: r.grandTotal, Payment: r.paymentMode })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'SalesReport.xlsx');
  };
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}><Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />Sales Report</Typography>
      <ReportFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={handleExport} loading={isLoading} />
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip label={`Total: ${formatCurrency(total)}`} color="primary" />
      </Box>
      <ReportTable rows={rows.map((r) => ({ ...r, customerName: (r.customer as Record<string, unknown>)?.name || 'Walk-in' }))} columns={cols} />
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
