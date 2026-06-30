import React from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import CrudPage from '../../components/common/CrudPage';
import SimpleForm from '../../components/common/SimpleForm';
import { userService } from '../../services';

const userFormFields = [
  { name: 'name', label: 'Full Name', required: true },
  { name: 'email', label: 'Email', required: true },
  { name: 'password', label: 'Password (leave blank to keep)', type: 'password' },
  { name: 'phone', label: 'Phone' },
  { name: 'role', label: 'Role (super_admin/admin/pharmacist/cashier)' },
];

const UserFormWrapper = (props: { open: boolean; onClose: () => void; editData?: unknown }) => (
  <SimpleForm {...props} title="User" queryKey="users" service={userService} fields={userFormFields} />
);

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
  { field: 'role', headerName: 'Role', width: 140, renderCell: (p) => <Chip label={p.value} color="primary" size="small" variant="outlined" /> },
  { field: 'phone', headerName: 'Phone', width: 140 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];

const Users: React.FC = () => (
  <CrudPage title="User Master" queryKey="users" service={userService} columns={columns} FormComponent={UserFormWrapper} searchPlaceholder="Search users..." addButtonLabel="Add User" roles={['super_admin', 'admin']} />
);

export default Users;
