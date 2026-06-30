import React from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import CrudPage from '../../components/common/CrudPage';
import SupplierForm from './SupplierForm';
import { supplierService } from '../../services';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Supplier Name', flex: 1, minWidth: 200 },
  { field: 'gstin', headerName: 'GSTIN', width: 180 },
  { field: 'phone', headerName: 'Phone', width: 140 },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 160 },
  { field: 'state', headerName: 'State', width: 120 },
  { field: 'bankName', headerName: 'Bank', width: 150 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];

const Suppliers: React.FC = () => (
  <CrudPage title="Supplier Master" queryKey="suppliers" service={supplierService} columns={columns} FormComponent={SupplierForm} searchPlaceholder="Search by name, GSTIN..." addButtonLabel="Add Supplier" exportFilename="Suppliers" />
);
export default Suppliers;
