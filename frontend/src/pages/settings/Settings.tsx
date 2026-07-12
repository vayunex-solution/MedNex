import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Tab, Tabs, Divider, CircularProgress, Autocomplete, FormControlLabel, Checkbox
} from '@mui/material';
import { Save, Business, Receipt, Email, PlayArrow } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { companyService, stateService, cityService, tenantSettingsService } from '../../services';

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  const { data } = useQuery({
    queryKey: ['company'],
    queryFn: () => companyService.get(),
  });

  const { data: tenantSettings } = useQuery({
    queryKey: ['tenantSettings'],
    queryFn: () => tenantSettingsService.get(),
  });

  const { data: statesData } = useQuery({ queryKey: ['states'], queryFn: () => stateService.list() });
  const { data: citiesData } = useQuery({ queryKey: ['cities'], queryFn: () => cityService.list() });

  const states = (statesData?.data?.data as { id: number; name: string }[]) || [];
  const allCities = (citiesData?.data?.data as { id: number; name: string; stateId: number; state?: { name: string } }[]) || [];

  const selectedState = states.find(s => s.name === form.state);
  const cities = selectedState ? allCities.filter(c => c.stateId === selectedState.id) : allCities;

  React.useEffect(() => {
    const d = data?.data?.data as Record<string, string> | undefined;
    const ts = tenantSettings as Record<string, string> | undefined;
    if (d && ts && !initialized) {
      setForm({ ...d, ...ts });
      setInitialized(true);
    }
  }, [data, tenantSettings, initialized]);

  const mutation = useMutation({
    mutationFn: (d: Record<string, string>) => {
      if (tab === 2) {
        const smtpData: Record<string, string> = {};
        Object.keys(d).forEach(k => {
          if (k.startsWith('smtp.')) smtpData[k] = d[k];
        });
        return tenantSettingsService.update(smtpData);
      }
      return companyService.update(d);
    },
    onSuccess: () => {
      enqueueSnackbar('Settings saved!', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['tenantSettings'] });
    },
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

  const sel = (name: string, label: string, options: { name: string }[]) => (
    <Box sx={{ width: '100%', display: 'flex', minWidth: 200 }}>
      <Autocomplete
        fullWidth
        sx={{ width: '100%', flexGrow: 1 }}
        size="small"
        options={options}
        getOptionLabel={(option) => option.name}
        value={options.find(o => o.name === form[name]) || null}
        onChange={(_, newValue) => {
          setForm((prev) => {
             let updates = { ...prev, [name]: newValue ? newValue.name : '' };
             if (name === 'state' && (!newValue || newValue.name !== prev.state)) {
               updates.city = ''; // reset city when state changes
             }
             return updates;
          });
        }}
        renderInput={(params) => <TextField {...params} fullWidth label={label} />}
      />
    </Box>
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
              <Grid item xs={12} sm={6}>{sel('state', 'State', states)}</Grid>
              <Grid item xs={12} sm={6}>{sel('city', 'City', cities)}</Grid>
              <Grid item xs={12} sm={6}>{f('pincode', 'PIN Code')}</Grid>
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
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>SMTP Settings</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your organization's SMTP server to send invoice emails to customers. Leave empty to fallback to platform defaults.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>{f('smtp.host', 'SMTP Host (e.g. smtp.gmail.com)')}</Grid>
              <Grid item xs={12} sm={3}>{f('smtp.port', 'SMTP Port (e.g. 587)', { type: 'number' })}</Grid>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form['smtp.secure'] === 'true' || form['smtp.secure'] === true}
                      onChange={(e) => setForm(prev => ({ ...prev, 'smtp.secure': e.target.checked ? 'true' : 'false' }))}
                    />
                  }
                  label="SSL/TLS (Secure)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>{f('smtp.user', 'SMTP Username / Email')}</Grid>
              <Grid item xs={12} sm={6}>{f('smtp.pass', 'SMTP Password', { type: 'password' })}</Grid>
              <Grid item xs={12} sm={6}>{f('smtp.from', 'Sender Email (e.g. billing@myorg.com)')}</Grid>

              {form['smtp.status'] && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, borderLeft: '4px solid', borderColor: form['smtp.status'] === 'healthy' ? 'success.main' : 'error.main' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                      SMTP Status: {form['smtp.status']}
                    </Typography>
                    {form['smtp.last_success'] && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Last Success: {new Date(form['smtp.last_success']).toLocaleString()}
                      </Typography>
                    )}
                    {form['smtp.last_error'] && (
                      <Typography variant="caption" color="error.main" display="block">
                        Last Error: {form['smtp.last_error']}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}

              <Grid item xs={12} sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={testingSmtp ? <CircularProgress size={16} /> : <PlayArrow />}
                  disabled={testingSmtp}
                  onClick={async () => {
                    setTestingSmtp(true);
                    try {
                      await tenantSettingsService.testSmtp({
                        host: form['smtp.host'],
                        port: form['smtp.port'],
                        secure: form['smtp.secure'],
                        user: form['smtp.user'],
                        pass: form['smtp.pass'],
                      });
                      enqueueSnackbar('SMTP Connection Test Succeeded!', { variant: 'success' });
                    } catch (err: any) {
                      enqueueSnackbar(err.response?.data?.message || 'SMTP Connection Failed', { variant: 'error' });
                    } finally {
                      setTestingSmtp(false);
                    }
                  }}
                >
                  Test Connection
                </Button>
              </Grid>
            </Grid>
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
