import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, TextField, Button,
  Autocomplete, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, CircularProgress, Divider, MenuItem, Select,
  FormControl, InputLabel, Chip,
} from '@mui/material';
import { Add, Delete, Save, ShoppingCart } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { supplierService, medicineService, purchaseService, companyService } from '../../services';
import type { Supplier, Medicine } from '../../types';

const PAYMENT_MODES = ['Cash', 'Credit', 'NEFT', 'Cheque'];

interface PurchaseRow {
  medicineId: number;
  medicineName?: string;
  batchNo: string;
  expiryDate: string;
  qty: number;
  freeQty: number;
  mrp: number;
  ptr: number;
  rate: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  amount: number;
}

const PurchaseEntry: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('Credit');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [medSearch, setMedSearch] = useState('');

  const { data: suppliersData } = useQuery({ queryKey: ['suppliers-list'], queryFn: () => supplierService.getList() });
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-pur-search', medSearch],
    queryFn: () => medicineService.getAll({ search: medSearch, limit: 20 }),
  });
  const { data: companyRes } = useQuery({ queryKey: ['company-details'], queryFn: () => companyService.get() });
  
  const company = companyRes?.data?.data || null;
  const isInterState = Boolean(company?.state && supplier?.state && company.state.trim().toLowerCase() !== supplier.state.trim().toLowerCase());

  const suppliers = (suppliersData?.data?.data as Supplier[] || []);
  const medicines = (medicinesData?.data?.data as Medicine[] || []);

  const addRow = () => setRows((prev) => [...prev, { medicineId: 0, batchNo: '', expiryDate: '', qty: 1, freeQty: 0, mrp: 0, ptr: 0, rate: 0, discount: 0, gstRate: 0, gstAmount: 0, amount: 0 }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const updateRow = (index: number, field: string, value: unknown) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const r = updated[index];
      const taxable = r.rate * r.qty * (1 - r.discount / 100);
      updated[index].gstAmount = taxable * (r.gstRate / 100);
      updated[index].amount = taxable + updated[index].gstAmount;
      return updated;
    });
  };

  const setMedForRow = (index: number, med: Medicine | null) => {
    if (!med) return;
    setRows((prev) => {
      const updated = [...prev];
      const gstRate = (med.gstSlab?.cgst || 0) + (med.gstSlab?.sgst || 0);
      updated[index] = { ...updated[index], medicineId: med.id, medicineName: med.name, mrp: med.mrp || 0, rate: med.purchaseRate || 0, ptr: med.purchaseRate || 0, gstRate };
      const r = updated[index];
      const taxable = r.rate * r.qty * (1 - r.discount / 100);
      updated[index].gstAmount = taxable * (gstRate / 100);
      updated[index].amount = taxable + updated[index].gstAmount;
      return updated;
    });
  };

  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
  const totalTax = rows.reduce((s, r) => s + r.gstAmount, 0);

  const mutation = useMutation({
    mutationFn: (data: unknown) => purchaseService.create(data),
    onSuccess: () => {
      enqueueSnackbar('Purchase saved successfully!', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setRows([]); setSupplier(null); setSupplierInvoiceNo('');
    },
    onError: () => enqueueSnackbar('Error saving purchase', { variant: 'error' }),
  });

  const handleSave = () => {
    if (!supplier) { enqueueSnackbar('Select a supplier', { variant: 'warning' }); return; }
    if (rows.length === 0) { enqueueSnackbar('Add at least one item', { variant: 'warning' }); return; }
    mutation.mutate({ supplierId: supplier.id, invoiceDate, supplierInvoiceNo, paymentMode, notes, grandTotal, items: rows.filter((r) => r.medicineId > 0) });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}><ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />Purchase Entry</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => { setRows([]); setSupplier(null); }}>New</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'Save Purchase'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Autocomplete options={suppliers} getOptionLabel={(o) => o.name} value={supplier} onChange={(_, v) => setSupplier(v)}
                    sx={{ minWidth: 250 }}
                    renderInput={(params) => <TextField {...params} label="Supplier *" size="small" />} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}><TextField label="Invoice Date" type="date" size="small" fullWidth value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField label="Supplier Invoice No" size="small" fullWidth value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} /></Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Payment Mode</InputLabel>
                    <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} label="Payment Mode">
                      {PAYMENT_MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight={700}>Purchase Items</Typography>
                <Button startIcon={<Add />} size="small" variant="outlined" onClick={addRow}>Add Row</Button>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
                      <TableCell>#</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>Medicine</TableCell>
                      <TableCell sx={{ minWidth: 110 }}>Batch No</TableCell>
                      <TableCell sx={{ minWidth: 130 }}>Expiry</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>Qty</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>Free</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>MRP</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>PTR</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>Rate</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>Disc%</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>{isInterState ? 'IGST%' : 'GST%'}</TableCell>
                      <TableCell sx={{ minWidth: 90 }}>GST Amt</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>Amount</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow><TableCell colSpan={14} align="center" sx={{ py: 4, color: 'text.secondary' }}>Click "Add Row" to start</TableCell></TableRow>
                    ) : rows.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Autocomplete options={medicines} getOptionLabel={(o) => o.name} size="small" sx={{ minWidth: 180 }}
                            onInputChange={(_, v) => setMedSearch(v)} onChange={(_, v) => setMedForRow(idx, v)}
                            renderInput={(params) => <TextField {...params} placeholder="Search" />} />
                        </TableCell>
                        <TableCell><TextField size="small" sx={{ width: 100 }} value={row.batchNo} onChange={(e) => updateRow(idx, 'batchNo', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" type="date" sx={{ width: 130 }} value={row.expiryDate} onChange={(e) => updateRow(idx, 'expiryDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.qty} onChange={(e) => updateRow(idx, 'qty', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.freeQty} onChange={(e) => updateRow(idx, 'freeQty', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 75 }} value={row.mrp} onChange={(e) => updateRow(idx, 'mrp', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 75 }} value={row.ptr} onChange={(e) => updateRow(idx, 'ptr', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 75 }} value={row.rate} onChange={(e) => updateRow(idx, 'rate', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.discount} onChange={(e) => updateRow(idx, 'discount', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.gstRate} onChange={(e) => updateRow(idx, 'gstRate', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>₹{row.gstAmount.toFixed(2)}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700} color="primary.main">₹{row.amount.toFixed(2)}</Typography></TableCell>
                        <TableCell><IconButton size="small" color="error" onClick={() => removeRow(idx)}><Delete fontSize="small" /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                <Box><Typography variant="body2" color="text.secondary">Total Tax:</Typography><Typography fontWeight={700}>₹{totalTax.toFixed(2)}</Typography></Box>
                <Box><Typography variant="body2" color="text.secondary">Grand Total:</Typography><Typography variant="h6" fontWeight={800} color="primary.main">₹{grandTotal.toFixed(2)}</Typography></Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PurchaseEntry;
