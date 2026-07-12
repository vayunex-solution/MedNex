// Simple form factory for basic master entries (name + description pattern)
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, CircularProgress, IconButton, Typography,
  Switch, FormControlLabel, Autocomplete, Box
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

interface SimpleFormProps {
  open: boolean;
  onClose: () => void;
  editData?: unknown;
  title: string;
  queryKey: string;
  service: { create: (d: unknown) => Promise<unknown>; update: (id: number, d: unknown) => Promise<unknown> };
  fields: Array<{ name: string; label: string; required?: boolean; multiline?: boolean; type?: string; options?: { id: number; name: string }[] }>;
}

const SimpleForm: React.FC<SimpleFormProps> = ({ open, onClose, editData, title, queryKey, service, fields }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const record = editData as Record<string, unknown> | null;
  const defaultValues = Object.fromEntries(fields.map((f) => [f.name, record?.[f.name] ?? '']));

  const { control, handleSubmit, reset } = useForm({ defaultValues });
  React.useEffect(() => { reset(record ? Object.fromEntries(fields.map((f) => [f.name, record[f.name] ?? ''])) : defaultValues); }, [editData, open]);

  const mutation = useMutation({
    mutationFn: (data: unknown) => record ? service.update(record.id as number, data) : service.create(data),
    onSuccess: () => { enqueueSnackbar(record ? 'Updated successfully!' : 'Created successfully!', { variant: 'success' }); queryClient.invalidateQueries({ queryKey: [queryKey] }); onClose(); },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error saving record';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{record ? `Edit ${title}` : `Add ${title}`}</Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {fields.map((f) => (
            <Grid item xs={12} sm={f.multiline ? 12 : 6} key={f.name} sx={{ flexGrow: 1, minWidth: '45%' }}>
              <Controller name={f.name} control={control}
                render={({ field }) => (
                  f.options ? (
                    <Box sx={{ width: '100%', display: 'flex' }}>
                      <Autocomplete
                        fullWidth
                        sx={{ width: '100%', flexGrow: 1 }}
                        options={f.options}
                        getOptionLabel={(option) => option.name}
                        value={f.options.find(o => o.id === field.value) || null}
                        onChange={(_, newValue) => field.onChange(newValue ? newValue.id : '')}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth label={f.required ? `${f.label} *` : f.label} error={!!field.value && field.value === '' && f.required} />
                        )}
                      />
                    </Box>
                  ) : (
                    <TextField {...field} label={f.required ? `${f.label} *` : f.label} fullWidth type={f.type || 'text'} multiline={f.multiline} rows={f.multiline ? 2 : undefined} value={field.value ?? ''} />
                  )
                )}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button variant="contained" onClick={handleSubmit((d) => mutation.mutate(d))} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : (record ? 'Update' : 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SimpleForm;
