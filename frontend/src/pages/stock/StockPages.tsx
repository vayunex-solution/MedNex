import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, IconButton
} from '@mui/material';
import { FileDownload, Warning, Search, Close } from '@mui/icons-material';

import { useQuery } from '@tanstack/react-query';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { stockService, batchService } from '../../services';


const MedicineBatchesModal: React.FC<{ open: boolean; onClose: () => void; medicineId: number | null; medicineName: string }> = ({ open, onClose, medicineId, medicineName }) => {
  const { data, isLoading } = useQuery({ 
    queryKey: ['batches', medicineId], 
    queryFn: () => batchService.getByMedicine(medicineId as number),
    enabled: !!medicineId && open
  });
  
  const rows = (data?.data?.data as Record<string, unknown>[] || []).map((r, i) => ({ ...r, id: r.id || i }));
  const cols: GridColDef[] = [
    { field: 'batchNo', headerName: 'Batch No', width: 130 },
    { field: 'expiryDate', headerName: 'Expiry', width: 120, renderCell: (p) => p.value ? new Date(p.value as string).toLocaleDateString('en-IN') : '-' },
    { field: 'qty', headerName: 'Current Stock', width: 110 },
    { field: 'mrp', headerName: 'MRP', width: 100, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
    { field: 'purchaseRate', headerName: 'Purchase Rate', width: 120, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
    { field: 'createdAt', headerName: 'Date Added', width: 120, renderCell: (p) => p.value ? new Date(p.value as string).toLocaleDateString('en-IN') : '-' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', m: 0, p: 2 }}>
        Purchase/Batch Details: {medicineName}
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ height: 400 }}>
          <DataGrid rows={rows} columns={cols} loading={isLoading} pageSizeOptions={[10, 25]} sx={{ border: 'none' }} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const CurrentStock: React.FC = () => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<{id: number, name: string} | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['stock-current', search], queryFn: () => stockService.getCurrent({ search }) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []).map((r, i) => ({ ...r, id: r.id || i }));
  
  const handleStockClick = (row: any) => {
    setSelectedMed({ id: row.id, name: row.name });
    setModalOpen(true);
  };

  const cols: GridColDef[] = [
    { field: 'name', headerName: 'Medicine', flex: 1, minWidth: 200 },
    { field: 'genericName', headerName: 'Generic Name', flex: 1, minWidth: 160 },
    { field: 'categoryName', headerName: 'Category', width: 140 },
    { field: 'companyName', headerName: 'Company', width: 160 },
    { field: 'currentStock', headerName: 'Current Stock', width: 130, renderCell: (p) => {
      const qty = p.value as number;
      const reorder = p.row.reorderLevel as number;
      return <Chip 
        label={qty} 
        color={qty <= 0 ? 'error' : qty <= reorder ? 'warning' : 'success'} 
        size="small" 
        onClick={() => handleStockClick(p.row)}
        sx={{ cursor: 'pointer' }}
      />;
    }},
    { field: 'reorderLevel', headerName: 'Reorder Level', width: 130 },
    { field: 'mrp', headerName: 'MRP', width: 100, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
    { field: 'saleRate', headerName: 'Sale Rate', width: 100, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
  ];
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, 'CurrentStock.xlsx');
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Current Stock</Typography>
        <Button startIcon={<FileDownload />} variant="outlined" onClick={handleExport}>Export</Button>
      </Box>
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Search fontSize="small" color="action" />
          <input
            placeholder="Search medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: '1px solid #ccc', borderRadius: 6, padding: '6px 12px', fontSize: 14, width: 320, outline: 'none' }}
          />
        </Box>
      </Paper>
      <Paper sx={{ height: 520 }}>
        <DataGrid rows={rows} columns={cols} loading={isLoading} pageSizeOptions={[20, 50, 100]} sx={{ border: 'none' }} />
      </Paper>
      {selectedMed && (
        <MedicineBatchesModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          medicineId={selectedMed.id}
          medicineName={selectedMed.name}
        />
      )}
    </Box>
  );
};

const ExpiryStock: React.FC<{ type: 'expiry' | 'near-expiry' }> = ({ type }) => {
  const { data, isLoading } = useQuery({ queryKey: ['stock-' + type], queryFn: () => type === 'expiry' ? stockService.getExpiry() : stockService.getNearExpiry(90) });
  const rows = (data?.data?.data as Record<string, unknown>[] || []).map((r, i) => ({ ...r, id: r.id || i }));
  const cols: GridColDef[] = [
    { field: 'batchNo', headerName: 'Batch No', width: 130 },
    { field: 'medicineName', headerName: 'Medicine', flex: 1, valueGetter: (_v: unknown, row: Record<string, unknown>) => (row.medicine as Record<string, unknown>)?.name as string || '' },
    { field: 'expiryDate', headerName: 'Expiry Date', width: 130, renderCell: (p) => new Date(p.value as string).toLocaleDateString('en-IN') },
    { field: 'qty', headerName: 'Qty', width: 100 },
    { field: 'mrp', headerName: 'MRP', width: 100, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
  ];
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Warning color={type === 'expiry' ? 'error' : 'warning'} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{type === 'expiry' ? 'Expired Stock' : 'Near Expiry (90 days)'}</Typography>
      </Box>
      <Paper sx={{ height: 520 }}>
        <DataGrid rows={rows} columns={cols} loading={isLoading} pageSizeOptions={[20, 50]} sx={{ border: 'none' }} />
      </Paper>
    </Box>
  );
};

const BatchWiseStock: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['stock-batch'], queryFn: () => stockService.getBatchWise() });
  const rows = (data?.data?.data as Record<string, unknown>[] || []).map((r, i) => ({ ...r, id: r.id || i }));
  const cols: GridColDef[] = [
    { field: 'batchNo', headerName: 'Batch No', width: 140 },
    { field: 'medicineName', headerName: 'Medicine', flex: 1, valueGetter: (_v: unknown, row: Record<string, unknown>) => (row.medicine as Record<string, unknown>)?.name as string || '' },
    { field: 'expiryDate', headerName: 'Expiry', width: 120, renderCell: (p) => new Date(p.value as string).toLocaleDateString('en-IN') },
    { field: 'qty', headerName: 'Stock', width: 100 },
    { field: 'mrp', headerName: 'MRP', width: 100, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
    { field: 'purchaseRate', headerName: 'Purchase Rate', width: 140, renderCell: (p) => `₹${Number(p.value || 0).toFixed(2)}` },
  ];
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Batch Wise Stock</Typography>
      <Paper sx={{ height: 520 }}>
        <DataGrid rows={rows} columns={cols} loading={isLoading} pageSizeOptions={[20, 50]} sx={{ border: 'none' }} />
      </Paper>
    </Box>
  );
};

export { CurrentStock, ExpiryStock, BatchWiseStock };
