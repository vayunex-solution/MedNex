import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, TextField, Button, MenuItem, CircularProgress, Autocomplete } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { financeService, customerService, supplierService } from '../../services';
import { Save } from '@mui/icons-material';

const CashBankEntry: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    entryType: 'Receipt',
    mode: 'Cash',
    partyType: 'Customer',
    customerId: '',
    supplierId: '',
    accountName: '',
    amount: '',
    bankName: '',
    chequeNo: '',
    transactionRef: '',
    notes: '',
  });

  const { data: editEntryRes } = useQuery({
    queryKey: ['cash-bank-edit-item', editId],
    queryFn: () => financeService.getCashBankById(Number(editId)),
    enabled: !!editId,
  });

  useEffect(() => {
    if (editEntryRes?.data?.data) {
      const entry = editEntryRes.data.data;
      setFormData({
        date: entry.date,
        entryType: entry.entryType,
        mode: entry.mode,
        partyType: entry.partyType,
        customerId: entry.customerId || '',
        supplierId: entry.supplierId || '',
        accountName: entry.accountName || '',
        amount: String(entry.amount),
        bankName: entry.bankName || '',
        chequeNo: entry.chequeNo || '',
        transactionRef: entry.transactionRef || '',
        notes: entry.notes || '',
      });
    }
  }, [editEntryRes]);

  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: () => customerService.getList() });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers-list'], queryFn: () => supplierService.getList() });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleAutocomplete = (name: string, value: any) => {
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      enqueueSnackbar('Amount must be greater than zero', { variant: 'error' });
      return;
    }
    if (formData.partyType === 'Customer' && !formData.customerId) {
      enqueueSnackbar('Please select a customer', { variant: 'error' }); return;
    }
    if (formData.partyType === 'Supplier' && !formData.supplierId) {
      enqueueSnackbar('Please select a supplier', { variant: 'error' }); return;
    }
    if (formData.partyType === 'General' && !formData.accountName) {
      enqueueSnackbar('Please enter account name', { variant: 'error' }); return;
    }

    try {
      setSaving(true);
      const payload: any = { ...formData, amount: Number(formData.amount) };
      if (payload.partyType !== 'Customer') delete payload.customerId;
      if (payload.partyType !== 'Supplier') delete payload.supplierId;
      if (payload.partyType !== 'General') delete payload.accountName;
      if (payload.mode === 'Cash') {
        delete payload.bankName; delete payload.chequeNo; delete payload.transactionRef;
      }

      if (editId) {
        await financeService.updateCashBank(Number(editId), payload);
        enqueueSnackbar(`${payload.mode} ${payload.entryType} updated successfully!`, { variant: 'success' });
        setSearchParams({});
      } else {
        await financeService.createCashBank(payload);
        enqueueSnackbar(`${payload.mode} ${payload.entryType} saved successfully!`, { variant: 'success' });
      }
      
      // Invalidate ALL queries to trigger auto-refresh in all dropdowns, lists, and reports
      queryClient.invalidateQueries();

      // Reset form
      setFormData(p => ({ ...p, amount: '', notes: '', chequeNo: '', transactionRef: '' }));
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save entry', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>{editId ? 'Edit Cash / Bank Entry' : 'Cash / Bank Entry'}</Typography>
      <Card>
        <CardContent>
          <form onSubmit={handleSave}>
            <Grid container spacing={3}>
              {/* Row 1 */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField select fullWidth label="Mode" name="mode" value={formData.mode} onChange={handleChange} required>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank">Bank</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField select fullWidth label="Entry Type" name="entryType" value={formData.entryType} onChange={handleChange} required>
                      <MenuItem value="Receipt">Receipt (In)</MenuItem>
                      <MenuItem value="Payment">Payment (Out)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth type="date" label="Date" name="date" value={formData.date} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField select fullWidth label="Party Type" name="partyType" value={formData.partyType} onChange={handleChange} required>
                      <MenuItem value="Customer">Customer</MenuItem>
                      <MenuItem value="Supplier">Supplier</MenuItem>
                      <MenuItem value="General">General / Others</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Grid>

              {/* Row 2 */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  {formData.partyType === 'Customer' && (
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        options={customers?.data?.data || []}
                        getOptionLabel={(c: any) => c.name}
                        value={(customers?.data?.data || []).find((c: any) => c.id === formData.customerId) || null}
                        onChange={(_, v) => handleAutocomplete('customerId', v ? v.id : '')}
                        renderInput={(params) => <TextField {...params} label="Select Customer" required />}
                      />
                    </Grid>
                  )}
                  {formData.partyType === 'Supplier' && (
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        options={suppliers?.data?.data || []}
                        getOptionLabel={(s: any) => s.name}
                        value={(suppliers?.data?.data || []).find((s: any) => s.id === formData.supplierId) || null}
                        onChange={(_, v) => handleAutocomplete('supplierId', v ? v.id : '')}
                        renderInput={(params) => <TextField {...params} label="Select Supplier" required />}
                      />
                    </Grid>
                  )}
                  {formData.partyType === 'General' && (
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Account / Party Name" name="accountName" value={formData.accountName} onChange={handleChange} required />
                    </Grid>
                  )}

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="number" label="Amount (₹)" name="amount" value={formData.amount} onChange={handleChange} required inputProps={{ step: "0.01", min: "0.01" }} />
                  </Grid>
                </Grid>
              </Grid>

              {/* Row 3 - Bank Details */}
              {formData.mode === 'Bank' && (
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Cheque / UTR No." name="chequeNo" value={formData.chequeNo} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Transaction Ref" name="transactionRef" value={formData.transactionRef} onChange={handleChange} />
                    </Grid>
                  </Grid>
                </Grid>
              )}

              {/* Row 4 - Notes */}
              <Grid item xs={12}>
                <TextField fullWidth label="Notes / Narration" name="notes" value={formData.notes} onChange={handleChange} multiline rows={2} />
              </Grid>

              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" type="submit" disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <Save />}>
                  {saving ? 'Saving...' : 'Save Entry'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CashBankEntry;
