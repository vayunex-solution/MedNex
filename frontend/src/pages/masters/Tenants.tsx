import React, { useState } from 'react';
import {
  Box, Button, IconButton, TextField, InputAdornment,
  Tooltip, Chip, Typography, Paper, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import {
  Add, Edit, Search, Refresh, FileDownload, Block, CheckCircle, Visibility
} from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import { platformTenantService } from '../../services';
import api from '../../services/api';
import { useAppDispatch } from '../../hooks/useRedux';
import { setCredentials } from '../../redux/slices/authSlice';

// ─── Tenant Provisioning Form Component ───────────────────────────────────────
interface TenantFormProps {
  open: boolean;
  onClose: () => void;
}

const TenantForm: React.FC<TenantFormProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    tenantName: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  const provisionMutation = useMutation({
    mutationFn: (data: typeof formData) => platformTenantService.create(data),
    onSuccess: () => {
      enqueueSnackbar('Tenant provisioned and created successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['platformTenants'] });
      setFormData({ tenantName: '', slug: '', ownerName: '', ownerEmail: '', ownerPassword: '' });
      onClose();
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Failed to provision tenant';
      enqueueSnackbar(errMsg, { variant: 'error' });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantName || !formData.slug || !formData.ownerName || !formData.ownerEmail || !formData.ownerPassword) {
      enqueueSnackbar('Please fill in all fields', { variant: 'warning' });
      return;
    }
    provisionMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Provision New Tenant (Organization)</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="tenantName" label="Tenant/Org Name" fullWidth required
                value={formData.tenantName} onChange={handleChange} margin="dense" size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="slug" label="URL Slug (lowercase & numbers)" fullWidth required
                value={formData.slug} onChange={handleChange} margin="dense" size="small"
                helperText="e.g. apollo-pharmacy"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="ownerName" label="Owner Full Name" fullWidth required
                value={formData.ownerName} onChange={handleChange} margin="dense" size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="ownerEmail" label="Owner Email" type="email" fullWidth required
                value={formData.ownerEmail} onChange={handleChange} margin="dense" size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="ownerPassword" label="Owner Password" type="password" fullWidth required
                value={formData.ownerPassword} onChange={handleChange} margin="dense" size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={provisionMutation.isPending}>
            {provisionMutation.isPending ? <CircularProgress size={24} /> : 'Onboard Tenant'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ─── Main Tenants Management Screen ──────────────────────────────────────────
const Tenants: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platformTenants', search, page, pageSize],
    queryFn: () => platformTenantService.getAll({ search, page: page + 1, limit: pageSize }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'activate' | 'suspend' }) => 
      action === 'activate' ? platformTenantService.activate(uuid) : platformTenantService.suspend(uuid),
    onSuccess: (_, variables) => {
      enqueueSnackbar(`Tenant status changed successfully to ${variables.action === 'activate' ? 'Active' : 'Suspended'}`, { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['platformTenants'] });
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update status', { variant: 'error' });
    }
  });

  const rows = data?.data || [];
  const total = data?.total || 0;

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tenants');
    XLSX.writeFile(wb, `Tenants_List.xlsx`);
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Tenant Name', flex: 1, minWidth: 180 },
    { field: 'slug', headerName: 'Subdomain / Slug', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Contact Email', flex: 1, minWidth: 200 },
    { field: 'plan', headerName: 'Plan', width: 100, renderCell: (p) => <Chip label={p.value} color="primary" size="small" /> },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120, 
      renderCell: (p) => (
        <Chip 
          label={p.value} 
          color={p.value === 'active' ? 'success' : (p.value === 'suspended' ? 'warning' : 'error')} 
          size="small" 
        />
      ) 
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const { id, uuid, status, name } = params.row;
        
        const handleImpersonateClick = async () => {
          const reason = window.prompt(`Enter reason for impersonating ${name}:`);
          if (!reason) return;
          try {
            const res = await api.post('/platform/impersonate', {
              tenantId: id,
              reason: reason
            });
            const token = res.data?.data?.token;
            if (token) {
              localStorage.setItem('accessToken', token);
              const profileRes = await api.get('/auth/me');
              dispatch(setCredentials({
                user: profileRes.data.data,
                accessToken: token,
                refreshToken: localStorage.getItem('refreshToken') || '',
              }));
              window.location.reload();
            }
          } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to start impersonation');
          }
        };

        return (
          <Box display="flex" gap={0.5}>
            <Tooltip title="Impersonate Tenant Context">
              <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleImpersonateClick(); }}>
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            {status === 'active' ? (
              <Tooltip title="Suspend Tenant">
                <IconButton 
                  size="small" color="warning" 
                  onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ uuid, action: 'suspend' }); }}
                >
                  <Block fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Activate Tenant">
                <IconButton 
                  size="small" color="success" 
                  onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ uuid, action: 'activate' }); }}
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      }
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Platform Tenant Administration</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()}><Refresh /></IconButton>
          </Tooltip>
          <Tooltip title="Export Excel">
            <IconButton onClick={handleExport}><FileDownload /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setFormOpen(true)}>
            Onboard Tenant
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          placeholder="Search tenants by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          size="small"
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />
      </Paper>

      <Paper sx={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={total}
          loading={isLoading}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 700 } }}
        />
      </Paper>

      <TenantForm open={formOpen} onClose={() => setFormOpen(false)} />
    </Box>
  );
};

export default Tenants;
