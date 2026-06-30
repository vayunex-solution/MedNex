import React, { useRef, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Autocomplete, IconButton, Table, TableBody, TableCell, TableHead, TableRow,
  Paper, Divider, Chip, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Tooltip, CircularProgress,
} from '@mui/material';
import {
  Add, Delete, Save, Print, Clear, QrCode, Receipt,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { customerService, medicineService, batchService, saleService } from '../../services';
import type { Customer, Medicine, Batch, SaleItem } from '../../types';
import PrintableInvoice from '../../components/invoice/PrintableInvoice';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'NEFT', 'Credit'];

interface BillRow extends SaleItem {
  medicineName?: string;
  taxable?: number;
}

const numberToWords = (n: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  const num = Math.floor(n);
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
};

const SalesBilling: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const printRef = useRef<HTMLDivElement>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [transport, setTransport] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<BillRow[]>([]);
  const [savedInvoice, setSavedInvoice] = useState<unknown>(null);
  const [medSearch, setMedSearch] = useState('');

  const { data: customersData } = useQuery({ queryKey: ['customers-list'], queryFn: () => customerService.getList() });
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-search', medSearch],
    queryFn: () => medicineService.getAll({ search: medSearch, limit: 20 }),
    enabled: medSearch.length > 0,
  });

  const addRow = () => {
    setRows((prev) => [...prev, {
      medicineId: 0, medicineName: '', batchNo: '', expiryDate: '', qty: 1, free: 0, pack: '',
      hsnCode: '', mrp: 0, rate: 0, discount: 0, sgst: 0, cgst: 0, gstAmount: 0, amount: 0,
    }]);
  };

  const updateRow = (index: number, field: string, value: unknown) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate
      const row = updated[index];
      const taxable = row.rate * row.qty * (1 - (row.discount || 0) / 100);
      const cgstAmt = taxable * ((row.cgst || 0) / 100);
      const sgstAmt = taxable * ((row.sgst || 0) / 100);
      updated[index].gstAmount = cgstAmt + sgstAmt;
      updated[index].amount = taxable + cgstAmt + sgstAmt;
      updated[index].taxable = taxable;
      return updated;
    });
  };

  const setMedicineForRow = (index: number, med: Medicine | null) => {
    if (!med) return;
    updateRow(index, 'medicineId', med.id);
    updateRow(index, 'medicineName', med.name);
    updateRow(index, 'hsnCode', med.hsn?.hsnCode || '');
    updateRow(index, 'mrp', med.mrp || 0);
    updateRow(index, 'rate', med.saleRate || 0);
    updateRow(index, 'cgst', med.gstSlab?.cgst || 0);
    updateRow(index, 'sgst', med.gstSlab?.sgst || 0);
    // Recalculate
    setRows((prev) => {
      const updated = [...prev];
      const row = updated[index];
      const taxable = row.rate * row.qty * (1 - (row.discount || 0) / 100);
      const cgstAmt = taxable * ((row.cgst || 0) / 100);
      const sgstAmt = taxable * ((row.sgst || 0) / 100);
      updated[index] = { ...updated[index], medicineId: med.id, medicineName: med.name, hsnCode: med.hsn?.hsnCode || '', mrp: med.mrp || 0, rate: med.saleRate || 0, cgst: med.gstSlab?.cgst || 0, sgst: med.gstSlab?.sgst || 0, gstAmount: cgstAmt + sgstAmt, amount: taxable + cgstAmt + sgstAmt, taxable };
      return updated;
    });
  };

  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const subtotal = rows.reduce((s, r) => s + (r.taxable || 0), 0);
  const totalCgst = rows.reduce((s, r) => s + ((r.taxable || 0) * ((r.cgst || 0) / 100)), 0);
  const totalSgst = rows.reduce((s, r) => s + ((r.taxable || 0) * ((r.sgst || 0) / 100)), 0);
  const taxAmount = totalCgst + totalSgst;
  const grandTotal = subtotal + taxAmount;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const finalTotal = Math.round(grandTotal);

  const mutation = useMutation({
    mutationFn: (data: unknown) => saleService.create(data),
    onSuccess: (res) => {
      setSavedInvoice(res.data.data);
      enqueueSnackbar('Invoice saved successfully!', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: () => enqueueSnackbar('Error saving invoice', { variant: 'error' }),
  });

  const handleSave = () => {
    if (rows.length === 0) { enqueueSnackbar('Add at least one item', { variant: 'warning' }); return; }
    const validRows = rows.filter((r) => r.medicineId > 0);
    if (validRows.length === 0) { enqueueSnackbar('Select medicines for all rows', { variant: 'warning' }); return; }
    mutation.mutate({
      customerId: customer?.id,
      invoiceDate,
      transport, orderNo, lrNumber, paymentMode, notes,
      subtotal, cgstAmount: totalCgst, sgstAmount: totalSgst, taxAmount,
      roundOff, grandTotal: finalTotal, paidAmount: finalTotal,
      items: validRows,
    });
  };

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const gstSummary = rows.reduce((acc, r) => {
    const rate = (r.cgst || 0) + (r.sgst || 0);
    if (!acc[rate]) acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, total: 0 };
    acc[rate].taxable += r.taxable || 0;
    acc[rate].cgst += (r.taxable || 0) * ((r.cgst || 0) / 100);
    acc[rate].sgst += (r.taxable || 0) * ((r.sgst || 0) / 100);
    acc[rate].total += (r.taxable || 0) * (rate / 100);
    return acc;
  }, {} as Record<number, { rate: number; taxable: number; cgst: number; sgst: number; total: number }>);

  const customers = (customersData?.data?.data as Customer[] || []);
  const medicines = (medicinesData?.data?.data as Medicine[] || []);

  return (
    <Box>
      {/* Hidden print area */}
      <Box sx={{ display: 'none' }}>
        <PrintableInvoice ref={printRef} invoice={savedInvoice} company={null} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}><Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />Sales Billing</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Clear />} onClick={() => { setRows([]); setCustomer(null); setSavedInvoice(null); }}>New</Button>
          <Button variant="outlined" startIcon={<Print />} onClick={handlePrint} disabled={!savedInvoice}>Print</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Invoice Header */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(o) => o.name}
                    value={customer}
                    onChange={(_, v) => setCustomer(v)}
                    renderInput={(params) => <TextField {...params} label="Customer" size="small" fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField label="Invoice Date" type="date" size="small" fullWidth value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField label="Transport" size="small" fullWidth value={transport} onChange={(e) => setTransport(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField label="Order No" size="small" fullWidth value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField label="LR Number" size="small" fullWidth value={lrNumber} onChange={(e) => setLrNumber(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={1}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Payment</InputLabel>
                    <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} label="Payment">
                      {PAYMENT_MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Medicine Grid */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700}>Medicine Items</Typography>
                <Button startIcon={<Add />} size="small" variant="outlined" onClick={addRow}>Add Row</Button>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
                      <TableCell>#</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>Medicine</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>Batch</TableCell>
                      <TableCell sx={{ minWidth: 110 }}>Expiry</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>Qty</TableCell>
                      <TableCell sx={{ minWidth: 60 }}>Free</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>Pack</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>HSN</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>MRP</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>Rate</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>Disc%</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>SGST%</TableCell>
                      <TableCell sx={{ minWidth: 70 }}>CGST%</TableCell>
                      <TableCell sx={{ minWidth: 90 }}>GST Amt</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>Amount</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={16} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          Click "Add Row" to start adding medicines
                        </TableCell>
                      </TableRow>
                    ) : rows.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Autocomplete
                            options={medicines}
                            getOptionLabel={(o) => o.name}
                            size="small"
                            sx={{ minWidth: 180 }}
                            onInputChange={(_, v) => setMedSearch(v)}
                            onChange={(_, v) => setMedicineForRow(idx, v)}
                            renderInput={(params) => <TextField {...params} placeholder="Search medicine" />}
                          />
                        </TableCell>
                        <TableCell><TextField size="small" sx={{ width: 100 }} value={row.batchNo || ''} onChange={(e) => updateRow(idx, 'batchNo', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" type="date" sx={{ width: 130 }} value={row.expiryDate || ''} onChange={(e) => updateRow(idx, 'expiryDate', e.target.value)} InputLabelProps={{ shrink: true }} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.qty} onChange={(e) => updateRow(idx, 'qty', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 55 }} value={row.free || 0} onChange={(e) => updateRow(idx, 'free', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" sx={{ width: 60 }} value={row.pack || ''} onChange={(e) => updateRow(idx, 'pack', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" sx={{ width: 90 }} value={row.hsnCode || ''} onChange={(e) => updateRow(idx, 'hsnCode', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 75 }} value={row.mrp} onChange={(e) => updateRow(idx, 'mrp', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 75 }} value={row.rate} onChange={(e) => updateRow(idx, 'rate', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.discount || 0} onChange={(e) => updateRow(idx, 'discount', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.sgst || 0} onChange={(e) => updateRow(idx, 'sgst', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.cgst || 0} onChange={(e) => updateRow(idx, 'cgst', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>₹{(row.gstAmount || 0).toFixed(2)}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700} color="primary.main">₹{(row.amount || 0).toFixed(2)}</Typography></TableCell>
                        <TableCell><IconButton size="small" color="error" onClick={() => removeRow(idx)}><Delete fontSize="small" /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* GST Summary + Bill Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>GST Summary</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem' } }}>
                    <TableCell>GST %</TableCell>
                    <TableCell align="right">Taxable</TableCell>
                    <TableCell align="right">CGST</TableCell>
                    <TableCell align="right">SGST</TableCell>
                    <TableCell align="right">Total Tax</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(gstSummary).map((g) => (
                    <TableRow key={g.rate}>
                      <TableCell>{g.rate}%</TableCell>
                      <TableCell align="right">₹{g.taxable.toFixed(2)}</TableCell>
                      <TableCell align="right">₹{g.cgst.toFixed(2)}</TableCell>
                      <TableCell align="right">₹{g.sgst.toFixed(2)}</TableCell>
                      <TableCell align="right">₹{g.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(gstSummary).length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>No items</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Bill Summary</Typography>
              {[
                { label: 'Subtotal (Taxable)', value: subtotal },
                { label: 'CGST', value: totalCgst },
                { label: 'SGST', value: totalSgst },
                { label: 'Total Tax', value: taxAmount },
                { label: 'Round Off', value: roundOff },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={500}>₹{value.toFixed(2)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={800}>Grand Total</Typography>
                <Typography variant="subtitle1" fontWeight={800} color="primary.main">₹{finalTotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">Amount in Words:</Typography>
                <Typography variant="body2" fontWeight={600} fontStyle="italic">
                  {numberToWords(finalTotal)} Rupees Only
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <TextField label="Terms & Conditions / Notes" fullWidth multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesBilling;
