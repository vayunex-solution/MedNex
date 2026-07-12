import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, CircularProgress, Chip, IconButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { reportService } from '../../services';
import * as XLSX from 'xlsx';
import { FileDownload, Edit } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (v: number | string) => `₹${Number(v || 0).toFixed(2)}`;

const ReportFilter: React.FC<{ from: Dayjs | null; to: Dayjs | null; setFrom: any; setTo: any; onSearch: () => void; onExport: () => void; loading: boolean }> = ({ from, to, setFrom, setTo, onSearch, onExport, loading }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <DatePicker label="From Date" value={from} onChange={setFrom} slotProps={{ textField: { size: 'small' } }} />
          <DatePicker label="To Date" value={to} onChange={setTo} slotProps={{ textField: { size: 'small' } }} />
          <Button variant="contained" onClick={onSearch} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Search'}
          </Button>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={onExport}>Export Excel</Button>
        </Box>
      </CardContent>
    </Card>
  </LocalizationProvider>
);

const LedgerTable: React.FC<{ rows: any[], isJournal?: boolean }> = ({ rows, isJournal }) => {
  const navigate = useNavigate();

  const handleEdit = (r: any) => {
    if (r.type === 'Sale') {
      navigate(`/sales?editId=${r.id}`);
    } else if (r.type === 'Purchase') {
      navigate(`/purchase?editId=${r.id}`);
    } else if (r.type === 'CashBank') {
      navigate(`/finance/cash-bank?editId=${r.id}`);
    } else if (r.type === 'Journal') {
      navigate(`/finance/journal?editId=${r.id}`);
    }
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Date</TableCell>
            <TableCell>Voucher No.</TableCell>
            <TableCell>Particulars</TableCell>
            <TableCell align="right">Debit</TableCell>
            <TableCell align="right">Credit</TableCell>
            {!isJournal && <TableCell align="right">Balance</TableCell>}
            {isJournal && <TableCell>Notes</TableCell>}
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>No entries found</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={i} hover>
              <TableCell>{r.date ? new Date(r.date).toLocaleDateString('en-IN') : ''}</TableCell>
              <TableCell>{r.voucherNo}</TableCell>
              <TableCell>{r.particulars}</TableCell>
              <TableCell align="right">{Number(r.debit) > 0 ? formatCurrency(r.debit) : '-'}</TableCell>
              <TableCell align="right">{Number(r.credit) > 0 ? formatCurrency(r.credit) : '-'}</TableCell>
              {!isJournal && <TableCell align="right">{formatCurrency(r.balance)} {r.balanceType}</TableCell>}
              {isJournal && <TableCell>{r.notes}</TableCell>}
              <TableCell align="right">
                {r.id && r.type && (
                  <IconButton size="small" color="primary" onClick={() => handleEdit(r)}>
                    <Edit fontSize="small" />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export const CashBook: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading } = useQuery({ queryKey: ['report-cash-book', params], queryFn: () => reportService.getCashBook(params) });

  const rows = data?.data?.data || [];
  const lastRow = rows[rows.length - 1];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r: any) => ({
      Date: r.date, 'Voucher No': r.voucherNo, Particulars: r.particulars,
      Debit: r.debit, Credit: r.credit, Balance: `${r.balance} ${r.balanceType}`
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'CashBook');
    XLSX.writeFile(wb, 'CashBook.xlsx');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Cash Book</Typography>
      <ReportFilter from={from} to={to} setFrom={setFrom} setTo={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={handleExport} loading={isLoading} />
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip label={`Closing Balance: ${lastRow ? formatCurrency(lastRow.balance) : '0.00'} ${lastRow?.balanceType || 'Dr'}`} color="primary" />
      </Box>
      <LedgerTable rows={rows} />
    </Box>
  );
};

export const BankBook: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading } = useQuery({ queryKey: ['report-bank-book', params], queryFn: () => reportService.getBankBook(params) });

  const rows = data?.data?.data || [];
  const lastRow = rows[rows.length - 1];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r: any) => ({
      Date: r.date, 'Voucher No': r.voucherNo, Particulars: r.particulars,
      Debit: r.debit, Credit: r.credit, Balance: `${r.balance} ${r.balanceType}`
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'BankBook');
    XLSX.writeFile(wb, 'BankBook.xlsx');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Bank Book</Typography>
      <ReportFilter from={from} to={to} setFrom={setFrom} setTo={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={handleExport} loading={isLoading} />
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip label={`Closing Balance: ${lastRow ? formatCurrency(lastRow.balance) : '0.00'} ${lastRow?.balanceType || 'Dr'}`} color="secondary" />
      </Box>
      <LedgerTable rows={rows} />
    </Box>
  );
};

export const JournalBook: React.FC = () => {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [params, setParams] = useState({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') });
  const { data, isLoading } = useQuery({ queryKey: ['report-journal-book', params], queryFn: () => reportService.getJournalBook(params) });

  const rows = data?.data?.data || [];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r: any) => ({
      Date: r.date, 'Voucher No': r.voucherNo, Particulars: r.particulars,
      Debit: r.debit, Credit: r.credit, Notes: r.notes
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'JournalBook');
    XLSX.writeFile(wb, 'JournalBook.xlsx');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Journal Book</Typography>
      <ReportFilter from={from} to={to} setFrom={setFrom} setTo={setTo} onSearch={() => setParams({ from: from?.format('YYYY-MM-DD'), to: to?.format('YYYY-MM-DD') })} onExport={handleExport} loading={isLoading} />
      <LedgerTable rows={rows} isJournal />
    </Box>
  );
};
