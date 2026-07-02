import React, { useState } from 'react';
import {
  Box, Button, IconButton, TextField, InputAdornment,
  Tooltip, Chip, Typography, Paper, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, FileDownload,
} from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';

interface CrudPageProps {
  title: string;
  queryKey: string;
  service: {
    getAll: (params?: Record<string, unknown>) => Promise<{ data: { data: unknown[]; pagination?: { total: number } } }>;
    remove?: (id: number) => Promise<unknown>;
  };
  columns: GridColDef[];
  FormComponent: React.ComponentType<{ open: boolean; onClose: () => void; editData?: unknown }>;
  searchPlaceholder?: string;
  addButtonLabel?: string;
  exportFilename?: string;
}

const CrudPage: React.FC<CrudPageProps> = ({
  title, queryKey, service, columns, FormComponent,
  searchPlaceholder = 'Search...', addButtonLabel = 'Add New', exportFilename,
}) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<unknown>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [queryKey, search, page, pageSize],
    queryFn: () => service.getAll({ search, page: page + 1, limit: pageSize }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => service.remove!(id),
    onSuccess: () => {
      enqueueSnackbar('Deleted successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setDeleteId(null);
    },
    onError: () => enqueueSnackbar('Delete failed', { variant: 'error' }),
  });

  const rows = (data?.data?.data as Record<string, unknown>[] || []);
  const total = data?.data?.pagination?.total || 0;

  const handleEdit = (row: unknown) => {
    setEditData(row);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditData(null);
    setFormOpen(true);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${exportFilename || title}.xlsx`);
  };

  const actionColumn: GridColDef = {
    field: 'actions',
    headerName: 'Actions',
    width: 120,
    sortable: false,
    renderCell: (params: GridRenderCellParams) => (
      <Box>
        <Tooltip title="Edit">
          <IconButton size="small" color="primary" onClick={() => handleEdit(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        {service.remove && (
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    ),
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>{title}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()}><Refresh /></IconButton>
          </Tooltip>
          <Tooltip title="Export Excel">
            <IconButton onClick={handleExport}><FileDownload /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            {addButtonLabel}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          size="small"
          sx={{ width: 320 }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            },
          }}
        />
      </Paper>

      <Paper sx={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={[...columns, actionColumn]}
          rowCount={total}
          loading={isLoading}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
          pageSizeOptions={[10, 20, 50, 100]}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 700 } }}
        />
      </Paper>

      <FormComponent open={formOpen} onClose={() => { setFormOpen(false); setEditData(null); }} editData={editData} />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this record? This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button
            variant="contained" color="error"
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CrudPage;
