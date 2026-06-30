import React from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import CrudPage from '../../components/common/CrudPage';
import CustomerForm from './CustomerForm';
import { customerService } from '../../services';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Customer Name', flex: 1, minWidth: 180 },
  { field: 'phone', headerName: 'Phone', width: 140 },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 160 },
  { field: 'gstin', headerName: 'GSTIN', width: 180 },
  { field: 'city', headerName: 'City', width: 120 },
  { field: 'state', headerName: 'State', width: 120 },
  {
    field: 'isActive',
    headerName: 'Status',
    width: 100,
    renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" />,
  },
];

const Customers: React.FC = () => (
  <CrudPage
    title="Customer Master"
    queryKey="customers"
    service={customerService}
    columns={columns}
    FormComponent={CustomerForm}
    searchPlaceholder="Search by name, phone, email..."
    addButtonLabel="Add Customer"
    exportFilename="Customers"
  />
);

export default Customers;
