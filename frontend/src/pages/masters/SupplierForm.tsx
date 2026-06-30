import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, CircularProgress, IconButton, Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import * as yup from 'yup';
import { supplierService } from '../../services';
import type { Supplier } from '../../types';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  gstin: yup.string().nullable(),
  phone: yup.string().nullable(),
  mobile: yup.string().nullable(),
  email: yup.string().email().nullable(),
  address: yup.string().nullable(),
  city: yup.string().nullable(),
  state: yup.string().nullable(),
  pincode: yup.string().nullable(),
  bankName: yup.string().nullable(),
  bankAccount: yup.string().nullable(),
  bankIFSC: yup.string().nullable(),
});

type FormData = yup.InferType<typeof schema>;

interface Props { open: boolean; onClose: () => void; editData?: unknown; }

const SupplierForm: React.FC<Props> = ({ open, onClose, editData }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const supplier = editData as Supplier | null;
  const defaults = { name: '', gstin: '', phone: '', mobile: '', email: '', address: '', city: '', state: '', pincode: '', bankName: '', bankAccount: '', bankIFSC: '' };

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: yupResolver(schema), defaultValues: supplier || defaults });
  React.useEffect(() => { reset(supplier || defaults); }, [supplier, open]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => supplier ? supplierService.update(supplier.id, data) : supplierService.create(data),
    onSuccess: () => { enqueueSnackbar(supplier ? 'Supplier updated!' : 'Supplier created!', { variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
    onError: () => enqueueSnackbar('Error saving supplier', { variant: 'error' }),
  });

  const f = (name: keyof FormData, label: string, props: object = {}) => (
    <Controller name={name} control={control} render={({ field }) => <TextField {...field} label={label} fullWidth error={!!errors[name]} helperText={errors[name]?.message as string} value={field.value ?? ''} {...props} />} />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{supplier ? 'Edit Supplier' : 'Add Supplier'}</Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12} sm={6}>{f('name', 'Supplier Name *')}</Grid>
          <Grid item xs={12} sm={6}>{f('gstin', 'GSTIN')}</Grid>
          <Grid item xs={12} sm={6}>{f('phone', 'Phone')}</Grid>
          <Grid item xs={12} sm={6}>{f('mobile', 'Mobile')}</Grid>
          <Grid item xs={12} sm={6}>{f('email', 'Email')}</Grid>
          <Grid item xs={12}>{f('address', 'Address', { multiline: true, rows: 2 })}</Grid>
          <Grid item xs={12} sm={4}>{f('city', 'City')}</Grid>
          <Grid item xs={12} sm={4}>{f('state', 'State')}</Grid>
          <Grid item xs={12} sm={4}>{f('pincode', 'PIN Code')}</Grid>
          <Grid item xs={12}><Typography variant="subtitle2" fontWeight={600} color="text.secondary" mt={1}>Bank Details</Typography></Grid>
          <Grid item xs={12} sm={4}>{f('bankName', 'Bank Name')}</Grid>
          <Grid item xs={12} sm={4}>{f('bankAccount', 'Account Number')}</Grid>
          <Grid item xs={12} sm={4}>{f('bankIFSC', 'IFSC Code')}</Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button variant="contained" onClick={handleSubmit((d) => mutation.mutate(d))} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : (supplier ? 'Update' : 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupplierForm;
