import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Tab, Tabs, Divider, CircularProgress,
} from '@mui/material';
import { Save, Business, Receipt, Email } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { companyService } from '../../services';

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { data } = useQuery({
    queryKey: ['company'],
    queryFn: () => companyService.get(),
  });

  React.useEffect(() => {
    const d = data?.data?.data as Record<string, string> | undefined;
    if (d && !initialized) { setForm(d); setInitialized(true); }
  }, [data, initialized]);

  const mutation = useMutation({
    mutationFn: (d: unknown) => companyService.update(d),
    onSuccess: () => { enqueueSnackbar('Settings saved!', { variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['company'] }); },
    onError: () => enqueueSnackbar('Error saving settings', { variant: 'error' }),
  });

  const f = (name: string, label: string, props: Record<string, unknown> = {}) => (
    <TextField
      label={label}
      value={form[name] || ''}
      onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
      fullWidth size="small" {...props}
    />
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Settings</Typography>
      <Tabs value={tab} onChange={(_e: React.SyntheticEvent, v: number) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Business />} label="Company" iconPosition="start" />
        <Tab icon={<Receipt />} label="Invoice" iconPosition="start" />
        <Tab icon={<Email />} label="Email/SMS" iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Company Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>{f('name', 'Company Name *')}</Grid>
              <Grid item xs={12} sm={6}>{f('gstin', 'GSTIN')}</Grid>
              <Grid item xs={12} sm={6}>{f('drugLicense', 'Drug License No')}</Grid>
              <Grid item xs={12} sm={6}>{f('phone', 'Phone')}</Grid>
              <Grid item xs={12} sm={6}>{f('mobile', 'Mobile')}</Grid>
              <Grid item xs={12} sm={6}>{f('email', 'Email')}</Grid>
              <Grid item xs={12} sm={6}>{f('website', 'Website')}</Grid>
              <Grid item xs={12}>{f('address', 'Address', { multiline: true, rows: 2 })}</Grid>
              <Grid item xs={12} sm={4}>{f('city', 'City')}</Grid>
              <Grid item xs={12} sm={4}>{f('state', 'State')}</Grid>
              <Grid item xs={12} sm={4}>{f('pincode', 'PIN Code')}</Grid>
              <Grid item xs={12}><Divider><Typography variant="caption">Bank Details</Typography></Divider></Grid>
              <Grid item xs={12} sm={4}>{f('bankName', 'Bank Name')}</Grid>
              <Grid item xs={12} sm={4}>{f('bankAccount', 'Account Number')}</Grid>
              <Grid item xs={12} sm={4}>{f('bankIFSC', 'IFSC Code')}</Grid>
              <Grid item xs={12}>{f('termsConditions', 'Terms & Conditions', { multiline: true, rows: 3 })}</Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Invoice Settings</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>{f('invoicePrefix', 'Invoice Prefix')}</Grid>
              <Grid item xs={12} sm={4}>{f('invoiceCounter', 'Invoice Start Number', { type: 'number' })}</Grid>
              <Grid item xs={12} sm={4}>{f('purchasePrefix', 'Purchase Prefix')}</Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Email/SMS Settings</Typography>
            <Typography variant="body2" color="text.secondary">Email and SMS integration settings will be configured here.</Typography>
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<Save />} onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
