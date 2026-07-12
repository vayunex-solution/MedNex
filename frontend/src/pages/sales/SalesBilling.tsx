import React, { useRef, useState, useEffect } from 'react';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { customerService, medicineService, batchService, saleService, companyService } from '../../services';
import type { Customer, Medicine, Batch, SaleItem } from '../../types';
import PrintableInvoice from '../../components/invoice/PrintableInvoice';

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'Card', 'Credit'];

interface BillRow extends SaleItem {
  medicineName?: string;
  taxable?: number;
  availableBatches?: Batch[];
  igst?: number;
}

const numberToWords = (n: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (isNaN(n) || n === 0) return 'Zero';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const printRef = useRef<HTMLDivElement>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [transport, setTransport] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [chequeNo, setChequeNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<BillRow[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [savedInvoice, setSavedInvoice] = useState<unknown>(null);
  const [medSearch, setMedSearch] = useState('');

  const { data: editSaleRes } = useQuery({
    queryKey: ['sales-edit-item', editId],
    queryFn: () => saleService.getById(Number(editId)),
    enabled: !!editId,
  });

  useEffect(() => {
    if (editSaleRes?.data?.data) {
      const sale = editSaleRes.data.data;
      setCustomer(sale.customer || null);
      setInvoiceDate(sale.invoiceDate);
      setTransport(sale.transport || '');
      setOrderNo(sale.orderNo || '');
      setLrNumber(sale.lrNumber || '');
      setPaymentMode(sale.paymentMode || 'Cash');
      setPaidAmount(Number(sale.paidAmount || 0));
      setChequeNo(sale.chequeNo || '');
      setBankName(sale.bankName || '');
      setTransactionRef(sale.transactionRef || '');
      setNotes(sale.notes || '');
      setDiscountType(sale.discountType || 'amount');
      setDiscountValue(Number(sale.discountValue || 0));
      setRows((sale.items || []).map((it: any) => ({
        id: it.id,
        medicineId: it.medicineId,
        medicineName: it.medicine?.name || '',
        batchId: it.batchId,
        batchNo: it.batchNo || '',
        expiryDate: it.expiryDate || '',
        qty: Number(it.qty || 0),
        free: Number(it.free || 0),
        pack: it.pack || '',
        hsnCode: it.hsnCode || '',
        mrp: Number(it.mrp || 0),
        rate: Number(it.rate || 0),
        discount: Number(it.discount || 0),
        sgst: Number(it.sgst || 0),
        cgst: Number(it.cgst || 0),
        gstAmount: Number(it.gstAmount || 0),
        amount: Number(it.amount || 0),
      })));
    }
  }, [editSaleRes]);

  const { data: customersData } = useQuery({ queryKey: ['customers-list'], queryFn: () => customerService.getList() });
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-search', medSearch],
    queryFn: () => medicineService.getAll({ search: medSearch, limit: 20 }),
  });
  const { data: companyRes } = useQuery({ queryKey: ['company-details'], queryFn: () => companyService.get() });
  const company = companyRes?.data?.data || null;
  const isInterState = Boolean(company?.state && customer?.state && company.state.trim().toLowerCase() !== customer.state.trim().toLowerCase());

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
      const taxable = Number(row.rate || 0) * Number(row.qty || 0) * (1 - Number(row.discount || 0) / 100);
      const cgstAmt = taxable * (Number(row.cgst || 0) / 100);
      const sgstAmt = taxable * (Number(row.sgst || 0) / 100);
      const igstAmt = taxable * (Number(row.igst || 0) / 100);
      updated[index].gstAmount = cgstAmt + sgstAmt + igstAmt;
      updated[index].amount = taxable + cgstAmt + sgstAmt + igstAmt;
      updated[index].taxable = taxable;
      return updated;
    });
  };

  const setMedicineForRow = async (index: number, med: Medicine | null) => {
    if (!med) return;
    try {
      const res = await batchService.getByMedicine(med.id);
      const batches = res.data?.data || [];
      setRows((prev) => {
        const updated = [...prev];
        const row = updated[index];
        const cgstRate = isInterState ? 0 : Number(med.gstSlab?.cgst || 0);
        const sgstRate = isInterState ? 0 : Number(med.gstSlab?.sgst || 0);
        const igstRate = isInterState ? Number(med.gstSlab?.igst || (Number(med.gstSlab?.cgst || 0) + Number(med.gstSlab?.sgst || 0))) : 0;
        const taxable = (med.saleRate || 0) * row.qty * (1 - (row.discount || 0) / 100);
        const cgstAmt = taxable * (cgstRate / 100);
        const sgstAmt = taxable * (sgstRate / 100);
        const igstAmt = taxable * (igstRate / 100);
        updated[index] = { 
          ...row, 
          medicineId: med.id, 
          medicineName: med.name, 
          hsnCode: med.hsn?.hsnCode || '', 
          mrp: med.mrp || 0, 
          rate: med.saleRate || 0, 
          cgst: cgstRate, 
          sgst: sgstRate, 
          igst: igstRate,
          gstAmount: cgstAmt + sgstAmt + igstAmt, 
          amount: taxable + cgstAmt + sgstAmt + igstAmt, 
          taxable,
          availableBatches: batches,
          batchNo: batches.length === 1 ? batches[0].batchNo : '',
          batchId: batches.length === 1 ? batches[0].id : undefined,
          expiryDate: batches.length === 1 ? batches[0].expiryDate.split('T')[0] : '',
        };
        return updated;
      });
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const subtotal = rows.reduce((s, r) => s + (r.taxable || 0), 0);
  const overallDiscount = discountType === 'percent'
    ? subtotal * (Math.min(discountValue, 100) / 100)
    : Math.min(discountValue, subtotal);
  const discountedSubtotal = subtotal - overallDiscount;
  // Proportionally apply overall discount to each row's taxable for GST calc
  const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;
  const totalCgst = isInterState ? 0 : rows.reduce((s, r) => s + ((r.taxable || 0) * discountRatio * ((r.cgst || 0) / 100)), 0);
  const totalSgst = isInterState ? 0 : rows.reduce((s, r) => s + ((r.taxable || 0) * discountRatio * ((r.sgst || 0) / 100)), 0);
  const totalIgst = isInterState ? rows.reduce((s, r) => s + ((r.taxable || 0) * discountRatio * ((r.igst || 0) / 100)), 0) : 0;
  const taxAmount = totalCgst + totalSgst + totalIgst;
  const grandTotal = discountedSubtotal + taxAmount;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const finalTotal = Math.round(grandTotal);
  const balanceDue = finalTotal - paidAmount;

  // Auto-update paidAmount when finalTotal changes (unless Credit mode)
  useEffect(() => {
    if (paymentMode === 'Credit') {
      setPaidAmount(0);
    } else {
      setPaidAmount(finalTotal);
    }
  }, [finalTotal, paymentMode]);

  // Reset conditional payment fields when payment mode changes
  useEffect(() => {
    setChequeNo('');
    setBankName('');
    setTransactionRef('');
  }, [paymentMode]);

  const mutation = useMutation({
    mutationFn: (data: unknown) => editId ? saleService.update(Number(editId), data) : saleService.create(data),
    onSuccess: (res) => {
      setSavedInvoice(res.data.data);
      enqueueSnackbar(editId ? 'Invoice updated successfully!' : 'Invoice saved successfully!', { variant: 'success' });
      queryClient.invalidateQueries(); // Auto-refresh all lists, dropdowns, and reports
      if (editId) {
        setSearchParams({});
      }
      setRows([]); 
      setCustomer(null); 
      setPaymentMode('Cash'); 
      setPaidAmount(0); 
      setChequeNo(''); 
      setBankName(''); 
      setTransactionRef(''); 
      setNotes(''); 
      setDiscountType('amount'); 
      setDiscountValue(0);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Error saving invoice';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  const handleSave = () => {
    if (rows.length === 0) { enqueueSnackbar('Add at least one item', { variant: 'warning' }); return; }
    const validRows = rows.filter((r) => r.medicineId > 0);
    if (validRows.length === 0) { enqueueSnackbar('Select medicines for all rows', { variant: 'warning' }); return; }
    mutation.mutate({
      customerId: customer?.id,
      invoiceDate,
      transport, orderNo, lrNumber, paymentMode, notes,
      subtotal, discountAmount: overallDiscount, discountType, discountValue,
      cgstAmount: totalCgst, sgstAmount: totalSgst, igstAmount: totalIgst, taxAmount,
      roundOff, grandTotal: finalTotal, paidAmount,
      chequeNo: chequeNo || null,
      bankName: bankName || null,
      transactionRef: transactionRef || null,
      items: validRows,
    });
  };

  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    if (savedInvoice) {
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  }, [savedInvoice, handlePrint]);

  const gstSummary = rows.reduce((acc, r) => {
    const rate = isInterState ? Number(r.igst || 0) : (Number(r.cgst || 0) + Number(r.sgst || 0));
    if (!acc[rate]) acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    acc[rate].taxable += r.taxable || 0;
    if (isInterState) {
      acc[rate].igst += (r.taxable || 0) * ((r.igst || 0) / 100);
    } else {
      acc[rate].cgst += (r.taxable || 0) * ((r.cgst || 0) / 100);
      acc[rate].sgst += (r.taxable || 0) * ((r.sgst || 0) / 100);
    }
    acc[rate].total += (r.taxable || 0) * (rate / 100);
    return acc;
  }, {} as Record<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }>);

  const customers = (customersData?.data?.data as Customer[] || []);
  const medicines = (medicinesData?.data?.data as Medicine[] || []);

  return (
    <Box>
      {/* Hidden print area */}
      <Box sx={{ display: 'none' }}>
        <PrintableInvoice ref={printRef} invoice={savedInvoice} company={company} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}><Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />Sales Billing</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Clear />} onClick={() => { setRows([]); setCustomer(null); setSavedInvoice(null); setPaymentMode('Cash'); setPaidAmount(0); setChequeNo(''); setBankName(''); setTransactionRef(''); setNotes(''); setDiscountType('amount'); setDiscountValue(0); }}>New</Button>
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
                    sx={{ minWidth: 250 }}
                    renderInput={(params) => <TextField {...params} label="Customer" size="small" fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField label="Invoice Date" type="date" size="small" fullWidth value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
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
                      {isInterState ? (
                        <TableCell sx={{ minWidth: 70 }}>IGST%</TableCell>
                      ) : (
                        <>
                          <TableCell sx={{ minWidth: 70 }}>SGST%</TableCell>
                          <TableCell sx={{ minWidth: 70 }}>CGST%</TableCell>
                        </>
                      )}
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
                            value={medicines.find((m) => m.id === row.medicineId) || (row.medicineId ? { id: row.medicineId, name: row.medicineName } : null) as any}
                            onInputChange={(_, v) => setMedSearch(v)}
                            onChange={(_, v) => setMedicineForRow(idx, v)}
                            renderInput={(params) => <TextField {...params} placeholder="Search medicine" />}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            sx={{ width: 150 }}
                            value={row.batchNo || ''}
                            displayEmpty
                            renderValue={(selected) => {
                              if (!selected) return <em>Select</em>;
                              const b = row.availableBatches?.find((x) => x.batchNo === selected);
                              return b ? `${b.batchNo} (Stock: ${b.qty})` : selected as React.ReactNode;
                            }}
                            onChange={(e) => {
                              const bNo = e.target.value as string;
                              const selectedBatch = row.availableBatches?.find((b) => b.batchNo === bNo);
                              updateRow(idx, 'batchNo', bNo);
                              if (selectedBatch) {
                                updateRow(idx, 'batchId', selectedBatch.id);
                                updateRow(idx, 'expiryDate', selectedBatch.expiryDate.split('T')[0]);
                              }
                            }}
                          >
                            <MenuItem value=""><em>Select</em></MenuItem>
                            {row.availableBatches?.map((b) => (
                              <MenuItem key={b.id} value={b.batchNo}>{b.batchNo} (Stock: {b.qty})</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell><TextField size="small" type="date" sx={{ width: 130 }} value={row.expiryDate || ''} onChange={(e) => updateRow(idx, 'expiryDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.qty} onChange={(e) => updateRow(idx, 'qty', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 55 }} value={row.free || 0} onChange={(e) => updateRow(idx, 'free', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" sx={{ width: 60 }} value={row.pack || ''} onChange={(e) => updateRow(idx, 'pack', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" sx={{ width: 90 }} value={row.hsnCode || ''} onChange={(e) => updateRow(idx, 'hsnCode', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 75 }} value={row.mrp} onChange={(e) => updateRow(idx, 'mrp', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 75 }} value={row.rate} onChange={(e) => updateRow(idx, 'rate', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.discount || 0} onChange={(e) => updateRow(idx, 'discount', parseFloat(e.target.value) || 0)} /></TableCell>
                        {isInterState ? (
                          <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.igst || 0} onChange={(e) => updateRow(idx, 'igst', parseFloat(e.target.value) || 0)} /></TableCell>
                        ) : (
                          <>
                            <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.sgst || 0} onChange={(e) => updateRow(idx, 'sgst', parseFloat(e.target.value) || 0)} /></TableCell>
                            <TableCell><TextField size="small" type="number" sx={{ width: 65 }} value={row.cgst || 0} onChange={(e) => updateRow(idx, 'cgst', parseFloat(e.target.value) || 0)} /></TableCell>
                          </>
                        )}
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
                    {!isInterState && <TableCell align="right">CGST</TableCell>}
                    {!isInterState && <TableCell align="right">SGST</TableCell>}
                    {isInterState && <TableCell align="right">IGST</TableCell>}
                    <TableCell align="right">Total Tax</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(gstSummary).map((g) => (
                    <TableRow key={g.rate}>
                      <TableCell>{g.rate}%</TableCell>
                      <TableCell align="right">₹{g.taxable.toFixed(2)}</TableCell>
                      {!isInterState && <TableCell align="right">₹{g.cgst.toFixed(2)}</TableCell>}
                      {!isInterState && <TableCell align="right">₹{g.sgst.toFixed(2)}</TableCell>}
                      {isInterState && <TableCell align="right">₹{g.igst.toFixed(2)}</TableCell>}
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Subtotal (Taxable)</Typography>
                <Typography variant="body2" fontWeight={500}>₹{subtotal.toFixed(2)}</Typography>
              </Box>

              {/* ─── Overall Discount ─────────────────────────── */}
              <Box sx={{ my: 1, p: 1.5, borderRadius: 2, bgcolor: overallDiscount > 0 ? 'success.50' : 'action.hover', border: overallDiscount > 0 ? '1px solid' : 'none', borderColor: 'success.light' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Overall Discount</Typography>
                <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                  <Grid item xs={4}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                      >
                        <MenuItem value="amount">₹ Flat</MenuItem>
                        <MenuItem value="percent">% Percent</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">{discountType === 'percent' ? '%' : '₹'}</InputAdornment> }, htmlInput: { min: 0, max: discountType === 'percent' ? 100 : subtotal, step: 0.01 } }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" fontWeight={600} color={overallDiscount > 0 ? 'success.main' : 'text.secondary'} sx={{ textAlign: 'right' }}>
                      - ₹{overallDiscount.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {[
                ...(isInterState 
                  ? [{ label: 'IGST', value: totalIgst }] 
                  : [{ label: 'CGST', value: totalCgst }, { label: 'SGST', value: totalSgst }]),
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
              {overallDiscount > 0 && (
                <Chip
                  label={`You saved ₹${overallDiscount.toFixed(2)}${discountType === 'percent' ? ` (${discountValue}%)` : ''}`}
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
              <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">Amount in Words:</Typography>
                <Typography variant="body2" fontWeight={600} fontStyle="italic">
                  {numberToWords(finalTotal)} Rupees Only
                </Typography>
              </Box>

              {/* ─── Payment Details ─────────────────────────────── */}
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Payment Details</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Payment Mode</InputLabel>
                    <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} label="Payment Mode">
                      {PAYMENT_MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Received Amount"
                    type="number"
                    size="small"
                    fullWidth
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                </Grid>
                {(paymentMode === 'Cheque') && (
                  <>
                    <Grid item xs={6}>
                      <TextField label="Cheque No." size="small" fullWidth value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Bank Name" size="small" fullWidth value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    </Grid>
                  </>
                )}
                {(paymentMode === 'Bank Transfer' || paymentMode === 'NEFT') && (
                  <>
                    <Grid item xs={6}>
                      <TextField label="Bank Name" size="small" fullWidth value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Transaction Ref." size="small" fullWidth value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
                    </Grid>
                  </>
                )}
                {paymentMode === 'UPI' && (
                  <Grid item xs={12}>
                    <TextField label="UPI Transaction Ref." size="small" fullWidth value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
                  </Grid>
                )}
              </Grid>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Received Amount</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">₹{paidAmount.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" fontWeight={700} color={balanceDue > 0 ? 'error.main' : 'text.secondary'}>Balance Due</Typography>
                <Typography variant="body2" fontWeight={700} color={balanceDue > 0 ? 'error.main' : 'success.main'}>₹{balanceDue.toFixed(2)}</Typography>
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
