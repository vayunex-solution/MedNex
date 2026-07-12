import React, { useState } from 'react';
import {
  Box, Typography, Grid, TextField, Button, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Chip, Avatar,
} from '@mui/material';
import { Close, Upload } from '@mui/icons-material';
import type { GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import CrudPage from '../../components/common/CrudPage';
import { medicineService, medicineCategoryService, medicineCompanyService, hsnService, gstService, unitService, rackService } from '../../services';
import type { Medicine } from '../../types';

const MedicineForm: React.FC<{ open: boolean; onClose: () => void; editData?: unknown }> = ({ open, onClose, editData }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const medicine = editData as Medicine | null;
  const [form, setForm] = useState<Record<string, string | number | null>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  React.useEffect(() => {
    if (open) {
      setForm({
        name: medicine?.name || '',
        genericName: medicine?.genericName || '',
        companyId: medicine?.companyId || '',
        categoryId: medicine?.categoryId || '',
        hsnId: medicine?.hsnId || '',
        gstSlabId: medicine?.gstSlabId || '',
        schedule: medicine?.schedule || '',
        rackId: medicine?.rackId || '',
        unitId: medicine?.unitId || '',
        barcode: medicine?.barcode || '',
        minStock: medicine?.minStock || 0,
        maxStock: medicine?.maxStock || 0,
        reorderLevel: medicine?.reorderLevel || 0,
        mrp: medicine?.mrp || 0,
        purchaseRate: medicine?.purchaseRate || 0,
        saleRate: medicine?.saleRate || 0,
      });
      setImagePreview(medicine?.image ? `/uploads/${medicine.image}` : '');
      setImageFile(null);
    }
  }, [open, medicine]);

  const { data: catData } = useQuery({ queryKey: ['categories-list'], queryFn: () => medicineCategoryService.getList() });
  const { data: compData } = useQuery({ queryKey: ['medicine-companies-list'], queryFn: () => medicineCompanyService.getList() });
  const { data: hsnData } = useQuery({ queryKey: ['hsn-list'], queryFn: () => hsnService.getList() });
  const { data: gstData } = useQuery({ queryKey: ['gst-list'], queryFn: () => gstService.getList() });
  const { data: unitData } = useQuery({ queryKey: ['units-list'], queryFn: () => unitService.getList() });
  const { data: rackData } = useQuery({ queryKey: ['racks-list'], queryFn: () => rackService.getList() });

  const mutation = useMutation({
    mutationFn: (data: FormData) => medicine ? medicineService.update(medicine.id, data) : medicineService.create(data),
    onSuccess: () => { enqueueSnackbar(medicine ? 'Updated!' : 'Created!', { variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['medicines'] }); onClose(); },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error saving medicine';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  const handleSubmit = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, String(v)); });
    if (imageFile) fd.append('image', imageFile);
    mutation.mutate(fd);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const f = (name: string, label: string, props: object = {}) => (
    <Box sx={{ width: '100%', textAlign: 'left' }}>
      <Typography variant="body2" fontWeight={600} mb={0.5} color="text.secondary">{label}</Typography>
      <TextField value={form[name] || ''} onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))} fullWidth size="small" placeholder={label} {...props} />
    </Box>
  );
  const sel = (name: string, label: string, options: { id: number; name: string }[], onChangeOverride?: (val: unknown) => void) => (
    <Box sx={{ width: '100%', textAlign: 'left' }}>
      <Typography variant="body2" fontWeight={600} mb={0.5} color="text.secondary">{label}</Typography>
      <FormControl size="small" fullWidth>
        <Select value={form[name] || ''} onChange={(e) => {
          if (onChangeOverride) {
            onChangeOverride(e.target.value);
          } else {
            setForm((p) => ({ ...p, [name]: e.target.value }));
          }
        }} displayEmpty>
          <MenuItem value=""><em>Select {label}</em></MenuItem>
          {options.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
        </Select>
      </FormControl>
    </Box>
  );

  const categories = (catData?.data?.data as { id: number; name: string }[] || []);
  const companies = (compData?.data?.data as { id: number; name: string }[] || []);
  const rawHsns = (hsnData?.data?.data as { id: number; hsnCode: string; gstRate: number | string }[] || []);
  const rawGsts = (gstData?.data?.data as { id: number; slab: string; cgst: number | string; sgst: number | string }[] || []);
  
  const hsns = rawHsns.map((h) => ({ id: h.id, name: `${h.hsnCode}` }));
  const gsts = rawGsts.map((g) => ({ id: g.id, name: g.slab }));
  const units = (unitData?.data?.data as { id: number; name: string }[] || []);
  const racks = (rackData?.data?.data as { id: number; name: string }[] || []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{medicine ? 'Edit Medicine' : 'Add Medicine'}</Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {/* Image */}
          <Grid item xs={12} sm={3} md={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Avatar src={imagePreview} variant="rounded" sx={{ width: 120, height: 120, border: '2px dashed #ccc' }} />
              <Button component="label" size="small" startIcon={<Upload />} variant="outlined">
                Upload
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={9} md={10}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>{f('name', 'Medicine Name *')}</Grid>
              <Grid item xs={12} sm={6}>{f('genericName', 'Generic Name')}</Grid>
              
              <Grid item xs={12} sm={4}>{sel('companyId', 'Company', companies)}</Grid>
              <Grid item xs={12} sm={4}>{sel('categoryId', 'Category', categories)}</Grid>
              <Grid item xs={12} sm={4}>{f('schedule', 'Schedule (H/H1/X)')}</Grid>
              
              <Grid item xs={12} sm={4}>{sel('hsnId', 'HSN Code', hsns, (val) => {
                const selectedHsn = rawHsns.find(h => h.id === val);
                let newGstSlabId = form.gstSlabId;
                if (selectedHsn) {
                  const targetRate = Number(selectedHsn.gstRate);
                  const matchingGst = rawGsts.find(g => (Number(g.cgst) + Number(g.sgst)) === targetRate || Number(g.cgst) === targetRate /* fallback for single rate */);
                  if (matchingGst) newGstSlabId = matchingGst.id;
                }
                setForm(p => ({ ...p, hsnId: val as number, gstSlabId: newGstSlabId }));
              })}</Grid>
              <Grid item xs={12} sm={4}>{sel('gstSlabId', 'GST Slab', gsts)}</Grid>
              <Grid item xs={12} sm={4}>{f('barcode', 'Barcode')}</Grid>
              
              <Grid item xs={12} sm={3}>{sel('unitId', 'Unit', units)}</Grid>
              <Grid item xs={12} sm={3}>{sel('rackId', 'Rack', racks)}</Grid>
              <Grid item xs={12} sm={3}>{f('minStock', 'Min Stock', { type: 'number' })}</Grid>
              <Grid item xs={12} sm={3}>{f('maxStock', 'Max Stock', { type: 'number' })}</Grid>
              
              <Grid item xs={12} sm={3}>{f('reorderLevel', 'Reorder Level', { type: 'number' })}</Grid>
              <Grid item xs={12} sm={3}>{f('mrp', 'MRP', { type: 'number' })}</Grid>
              <Grid item xs={12} sm={3}>{f('purchaseRate', 'Purchase Rate', { type: 'number' })}</Grid>
              <Grid item xs={12} sm={3}>{f('saleRate', 'Sale Rate', { type: 'number' })}</Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : (medicine ? 'Update' : 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  {
    field: 'image', headerName: 'Image', width: 70,
    renderCell: (p) => <Avatar src={p.value ? `/uploads/${p.value}` : undefined} variant="rounded" sx={{ width: 36, height: 36 }} />,
  },
  { field: 'name', headerName: 'Medicine Name', flex: 1, minWidth: 200 },
  { field: 'genericName', headerName: 'Generic Name', flex: 1, minWidth: 160 },
  { field: 'category', headerName: 'Category', width: 140, valueGetter: (v) => (v as Record<string, unknown>)?.name as string || '' },
  { field: 'company', headerName: 'Company', width: 150, valueGetter: (v) => (v as Record<string, unknown>)?.name as string || '' },
  { field: 'mrp', headerName: 'MRP', width: 90, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
  { field: 'saleRate', headerName: 'Sale Rate', width: 100, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
  { field: 'barcode', headerName: 'Barcode', width: 130 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];

const Medicines: React.FC = () => (
  <CrudPage title="Medicine Master" queryKey="medicines" service={medicineService} columns={columns} FormComponent={MedicineForm} searchPlaceholder="Search by name, generic, barcode..." addButtonLabel="Add Medicine" exportFilename="Medicines" />
);

export default Medicines;
