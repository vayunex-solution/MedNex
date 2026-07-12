import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, TextField, Button, MenuItem, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Paper, Autocomplete } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { financeService, customerService, supplierService } from '../../services';
import { Save, Add, Delete } from '@mui/icons-material';

const formatCurrency = (v: number) => `₹${Number(v || 0).toFixed(2)}`;

const JournalVoucher: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState<any[]>([
    { id: 1, type: 'Dr', partyType: 'Customer', customerId: '', supplierId: '', accountName: '', amount: '' },
    { id: 2, type: 'Cr', partyType: 'Customer', customerId: '', supplierId: '', accountName: '', amount: '' },
  ]);

  const { data: editJournalRes } = useQuery({
    queryKey: ['journal-edit-item', editId],
    queryFn: () => financeService.getJournalById(Number(editId)),
    enabled: !!editId,
  });

  useEffect(() => {
    if (editJournalRes?.data?.data) {
      const jv = editJournalRes.data.data;
      setDate(jv.date);
      setNotes(jv.notes || '');
      setDetails((jv.details || []).map((d: any, idx: number) => ({
        id: d.id || idx,
        type: d.type,
        partyType: d.partyType,
        customerId: d.customerId || '',
        supplierId: d.supplierId || '',
        accountName: d.accountName || '',
        amount: String(d.amount),
      })));
    }
  }, [editJournalRes]);

  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: () => customerService.getList() });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers-list'], queryFn: () => supplierService.getList() });

  const handleAddRow = () => {
    setDetails(prev => [...prev, { id: Date.now(), type: 'Dr', partyType: 'Customer', customerId: '', supplierId: '', accountName: '', amount: '' }]);
  };

  const handleRemoveRow = (id: number) => {
    if (details.length <= 2) {
      enqueueSnackbar('Minimum 2 rows required', { variant: 'warning' });
      return;
    }
    setDetails(prev => prev.filter(d => d.id !== id));
  };

  const handleChange = (id: number, field: string, value: any) => {
    setDetails(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const totalDr = details.reduce((sum, d) => sum + (d.type === 'Dr' ? Number(d.amount || 0) : 0), 0);
  const totalCr = details.reduce((sum, d) => sum + (d.type === 'Cr' ? Number(d.amount || 0) : 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Math.abs(totalDr - totalCr) > 0.01) {
      enqueueSnackbar('Total Debit must be equal to Total Credit', { variant: 'error' });
      return;
    }
    if (totalDr <= 0) {
      enqueueSnackbar('Total amount must be greater than zero', { variant: 'error' });
      return;
    }

    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      if (!d.amount || Number(d.amount) <= 0) { enqueueSnackbar(`Amount is required in row ${i + 1}`, { variant: 'error' }); return; }
      if (d.partyType === 'Customer' && !d.customerId) { enqueueSnackbar(`Customer is required in row ${i + 1}`, { variant: 'error' }); return; }
      if (d.partyType === 'Supplier' && !d.supplierId) { enqueueSnackbar(`Supplier is required in row ${i + 1}`, { variant: 'error' }); return; }
      if (d.partyType === 'General' && !d.accountName) { enqueueSnackbar(`Account Name is required in row ${i + 1}`, { variant: 'error' }); return; }
    }

    try {
      setSaving(true);
      const payload = {
        date,
        notes,
        details: details.map(d => ({
          type: d.type,
          partyType: d.partyType,
          customerId: d.partyType === 'Customer' ? d.customerId : undefined,
          supplierId: d.partyType === 'Supplier' ? d.supplierId : undefined,
          accountName: d.partyType === 'General' ? d.accountName : undefined,
          amount: Number(d.amount)
        }))
      };

      if (editId) {
        await financeService.updateJournal(Number(editId), payload);
        enqueueSnackbar('Journal Voucher updated successfully!', { variant: 'success' });
        setSearchParams({});
      } else {
        await financeService.createJournal(payload);
        enqueueSnackbar('Journal Voucher saved successfully!', { variant: 'success' });
      }
      
      // Invalidate ALL queries to trigger auto-refresh in all dropdowns, lists, and reports
      queryClient.invalidateQueries();

      // Reset
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setDetails([
        { id: Date.now(), type: 'Dr', partyType: 'Customer', customerId: '', supplierId: '', accountName: '', amount: '' },
        { id: Date.now()+1, type: 'Cr', partyType: 'Customer', customerId: '', supplierId: '', accountName: '', amount: '' },
      ]);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save journal voucher', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>{editId ? 'Edit Journal Voucher' : 'Journal Voucher'}</Typography>
      <Card>
        <CardContent>
          <form onSubmit={handleSave}>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={3}>
                <TextField fullWidth type="date" label="Date" value={date} onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={12} md={9}>
                <TextField fullWidth label="Notes / Narration" value={notes} onChange={e => setNotes(e.target.value)} required />
              </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ mb: 3, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Dr/Cr</TableCell>
                    <TableCell>Party Type</TableCell>
                    <TableCell>Account / Party</TableCell>
                    <TableCell align="right">Debit (Dr)</TableCell>
                    <TableCell align="right">Credit (Cr)</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell width="12%">
                        <TextField select fullWidth size="small" value={row.type} onChange={(e) => handleChange(row.id, 'type', e.target.value)}>
                          <MenuItem value="Dr">Dr</MenuItem>
                          <MenuItem value="Cr">Cr</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell width="18%">
                        <TextField select fullWidth size="small" value={row.partyType} onChange={(e) => handleChange(row.id, 'partyType', e.target.value)}>
                          <MenuItem value="Customer">Customer</MenuItem>
                          <MenuItem value="Supplier">Supplier</MenuItem>
                          <MenuItem value="General">General</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell width="35%">
                        {row.partyType === 'Customer' && (
                          <Autocomplete
                            options={customers?.data?.data || []}
                            getOptionLabel={(c: any) => c.name}
                            value={(customers?.data?.data || []).find((c: any) => c.id === row.customerId) || null}
                            onChange={(_, v) => handleChange(row.id, 'customerId', v ? v.id : '')}
                            size="small"
                            sx={{ minWidth: 200 }}
                            renderInput={(params) => <TextField {...params} placeholder="Select Customer" />}
                          />
                        )}
                        {row.partyType === 'Supplier' && (
                          <Autocomplete
                            options={suppliers?.data?.data || []}
                            getOptionLabel={(s: any) => s.name}
                            value={(suppliers?.data?.data || []).find((s: any) => s.id === row.supplierId) || null}
                            onChange={(_, v) => handleChange(row.id, 'supplierId', v ? v.id : '')}
                            size="small"
                            sx={{ minWidth: 200 }}
                            renderInput={(params) => <TextField {...params} placeholder="Select Supplier" />}
                          />
                        )}
                        {row.partyType === 'General' && (
                          <TextField fullWidth size="small" sx={{ minWidth: 200 }} placeholder="Account Name" value={row.accountName} onChange={(e) => handleChange(row.id, 'accountName', e.target.value)} />
                        )}
                      </TableCell>
                      <TableCell width="15%">
                        <TextField fullWidth type="number" size="small" value={row.type === 'Dr' ? row.amount : ''} onChange={(e) => row.type === 'Dr' && handleChange(row.id, 'amount', e.target.value)} disabled={row.type === 'Cr'} />
                      </TableCell>
                      <TableCell width="15%">
                        <TextField fullWidth type="number" size="small" value={row.type === 'Cr' ? row.amount : ''} onChange={(e) => row.type === 'Cr' && handleChange(row.id, 'amount', e.target.value)} disabled={row.type === 'Dr'} />
                      </TableCell>
                      <TableCell align="center" width="10%">
                        <IconButton color="error" onClick={() => handleRemoveRow(row.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right"><b>Total:</b></TableCell>
                    <TableCell align="right"><b>{formatCurrency(totalDr)}</b></TableCell>
                    <TableCell align="right"><b>{formatCurrency(totalCr)}</b></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            <Box display="flex" justifyContent="space-between">
              <Button variant="outlined" startIcon={<Add />} onClick={handleAddRow}>Add Row</Button>
              <Button variant="contained" type="submit" disabled={saving || Math.abs(totalDr - totalCr) > 0.01 || totalDr === 0} startIcon={saving ? <CircularProgress size={20} /> : <Save />}>
                {saving ? 'Saving...' : 'Save Voucher'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default JournalVoucher;
