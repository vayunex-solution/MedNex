import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, CircularProgress, IconButton, Typography,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, Autocomplete, Box,
  InputAdornment
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import * as yup from 'yup';
import { customerService, stateService, cityService } from '../../services';
import type { Customer } from '../../types';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  phone: yup.string().matches(/^[0-9+\-\s]*$/, 'Invalid phone').nullable(),
  mobile: yup.string().nullable(),
  email: yup.string().email('Invalid email').nullable(),
  gstin: yup.string().nullable(),
  address: yup.string().nullable(),
  city: yup.string().nullable(),
  state: yup.string().nullable(),
  pincode: yup.string().nullable(),
  openingBalance: yup.number().nullable().transform((v) => (isNaN(v) ? null : v)),
  creditLimit: yup.number().nullable().transform((v) => (isNaN(v) ? null : v)),
});

type FormData = yup.InferType<typeof schema>;

interface Props { open: boolean; onClose: () => void; editData?: unknown; }

const CustomerForm: React.FC<Props> = ({ open, onClose, editData }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const customer = editData as Customer | null;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: customer || { name: '', phone: '', mobile: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '', openingBalance: 0, creditLimit: 0 },
  });

  React.useEffect(() => {
    reset(customer || { name: '', phone: '', mobile: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '', openingBalance: 0, creditLimit: 0 });
  }, [customer, reset, open]);

  const { data: statesData } = useQuery({ queryKey: ['states'], queryFn: () => stateService.list() });
  const { data: citiesData } = useQuery({ queryKey: ['cities'], queryFn: () => cityService.list() });

  const states = (statesData?.data?.data as { id: number; name: string }[]) || [];
  const allCities = (citiesData?.data?.data as { id: number; name: string; stateId: number }[]) || [];

  const selectedState = useWatch({ control, name: 'state' });
  const stateObj = states.find(s => s.name === selectedState);
  const cities = stateObj ? allCities.filter(c => c.stateId === stateObj.id) : allCities;

  const mutation = useMutation({
    mutationFn: (data: FormData) => customer ? customerService.update(customer.id, data) : customerService.create(data),
    onSuccess: () => {
      enqueueSnackbar(customer ? 'Customer updated!' : 'Customer created!', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => enqueueSnackbar(err.response?.data?.message || 'Error', { variant: 'error' }),
  });

  const field = (name: keyof FormData, label: string, props: object = {}) => (
    <Controller name={name} control={control} render={({ field: f }) => (
      <TextField {...f} label={label} fullWidth error={!!errors[name]} helperText={errors[name]?.message as string} {...props} value={f.value ?? ''} />
    )} />
  );

  const selField = (name: keyof FormData, label: string, options: { name: string }[]) => (
    <Controller name={name} control={control} render={({ field: f }) => (
      <Box sx={{ width: '100%', display: 'flex', minWidth: 200 }}>
        <Autocomplete
          fullWidth
          sx={{ width: '100%', flexGrow: 1 }}
          options={options}
          getOptionLabel={(option) => option.name}
          value={options.find(o => o.name === f.value) || null}
          onChange={(_, newValue) => f.onChange(newValue ? newValue.name : '')}
          renderInput={(params) => (
            <TextField {...params} fullWidth label={label} error={!!errors[name]} helperText={errors[name]?.message as string} />
          )}
        />
      </Box>
    )} />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{customer ? 'Edit Customer' : 'Add Customer'}</Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12} sm={6}>{field('name', 'Customer Name *')}</Grid>
          <Grid item xs={12} sm={6}>{field('phone', 'Phone')}</Grid>
          <Grid item xs={12} sm={6}>{field('mobile', 'Mobile')}</Grid>
          <Grid item xs={12} sm={6}>{field('email', 'Email')}</Grid>
          <Grid item xs={12} sm={6}>{field('gstin', 'GSTIN')}</Grid>
          <Grid item xs={12}>{field('address', 'Address', { multiline: true, rows: 2 })}</Grid>
          <Grid item xs={12} sm={4}>{selField('state', 'State', states)}</Grid>
          <Grid item xs={12} sm={4}>{selField('city', 'City', cities)}</Grid>
          <Grid item xs={12} sm={4}>{field('pincode', 'PIN Code')}</Grid>
          <Grid item xs={12} sm={6}>{field('openingBalance', 'Opening Balance', { type: 'number', slotProps: { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } } })}</Grid>
          <Grid item xs={12} sm={6}>{field('creditLimit', 'Credit Limit', { type: 'number', slotProps: { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } } })}</Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button variant="contained" onClick={handleSubmit((d) => mutation.mutate(d))} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : (customer ? 'Update' : 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerForm;
