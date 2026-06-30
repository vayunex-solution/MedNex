// Doctors page
import React from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import CrudPage from '../../components/common/CrudPage';
import SimpleForm from '../../components/common/SimpleForm';
import { doctorService, medicineCategoryService, medicineCompanyService, hsnService, gstService, unitService, rackService } from '../../services';

const makeSimpleFormWrapper = (title: string, queryKey: string, service: { create: (d: unknown) => Promise<unknown>; update: (id: number, d: unknown) => Promise<unknown> }, fields: Array<{ name: string; label: string; required?: boolean; type?: string }>) => {
  return (props: { open: boolean; onClose: () => void; editData?: unknown }) => (
    <SimpleForm {...props} title={title} queryKey={queryKey} service={service} fields={fields} />
  );
};

// ─── Doctor columns
const doctorCols: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Doctor Name', flex: 1, minWidth: 180 },
  { field: 'qualification', headerName: 'Qualification', width: 150 },
  { field: 'specialization', headerName: 'Specialization', width: 160 },
  { field: 'phone', headerName: 'Phone', width: 140 },
  { field: 'regNo', headerName: 'Reg. No.', width: 130 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];
export const Doctors: React.FC = () => (
  <CrudPage title="Doctor Master" queryKey="doctors" service={doctorService} columns={doctorCols} FormComponent={makeSimpleFormWrapper('Doctor', 'doctors', doctorService, [
    { name: 'name', label: 'Doctor Name', required: true },
    { name: 'qualification', label: 'Qualification' },
    { name: 'specialization', label: 'Specialization' },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    { name: 'regNo', label: 'Reg. Number' },
    { name: 'address', label: 'Address' },
  ])} searchPlaceholder="Search doctors..." addButtonLabel="Add Doctor" />
);

// ─── Medicine Category
const catCols: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Category Name', flex: 1 },
  { field: 'description', headerName: 'Description', flex: 1 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];
export const MedicineCategories: React.FC = () => (
  <CrudPage title="Medicine Categories" queryKey="medicine-categories" service={medicineCategoryService} columns={catCols} FormComponent={makeSimpleFormWrapper('Category', 'medicine-categories', medicineCategoryService, [
    { name: 'name', label: 'Category Name', required: true },
    { name: 'description', label: 'Description' },
  ])} searchPlaceholder="Search categories..." addButtonLabel="Add Category" />
);

// ─── Medicine Company
const compCols: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Company Name', flex: 1, minWidth: 200 },
  { field: 'phone', headerName: 'Phone', width: 140 },
  { field: 'email', headerName: 'Email', flex: 1 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];
export const MedicineCompanies: React.FC = () => (
  <CrudPage title="Medicine Companies" queryKey="medicine-companies" service={medicineCompanyService} columns={compCols} FormComponent={makeSimpleFormWrapper('Company', 'medicine-companies', medicineCompanyService, [
    { name: 'name', label: 'Company Name', required: true },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    { name: 'address', label: 'Address' },
  ])} searchPlaceholder="Search companies..." addButtonLabel="Add Company" />
);

// ─── HSN Codes
const hsnCols: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'hsnCode', headerName: 'HSN Code', width: 140 },
  { field: 'description', headerName: 'Description', flex: 1 },
  { field: 'gstRate', headerName: 'GST Rate %', width: 120 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];
export const HsnCodes: React.FC = () => (
  <CrudPage title="HSN Codes" queryKey="hsn-codes" service={hsnService} columns={hsnCols} FormComponent={makeSimpleFormWrapper('HSN Code', 'hsn-codes', hsnService, [
    { name: 'hsnCode', label: 'HSN Code', required: true },
    { name: 'description', label: 'Description' },
    { name: 'gstRate', label: 'GST Rate %', type: 'number' },
  ])} searchPlaceholder="Search HSN codes..." addButtonLabel="Add HSN" />
);

// ─── GST Slabs
const gstCols: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'slab', headerName: 'GST Slab', width: 120 },
  { field: 'cgst', headerName: 'CGST %', width: 100 },
  { field: 'sgst', headerName: 'SGST %', width: 100 },
  { field: 'igst', headerName: 'IGST %', width: 100 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];
export const GstSlabs: React.FC = () => (
  <CrudPage title="GST Slabs" queryKey="gst-slabs" service={gstService} columns={gstCols} FormComponent={makeSimpleFormWrapper('GST Slab', 'gst-slabs', gstService, [
    { name: 'slab', label: 'Slab (e.g. 5%)', required: true },
    { name: 'cgst', label: 'CGST %', type: 'number' },
    { name: 'sgst', label: 'SGST %', type: 'number' },
    { name: 'igst', label: 'IGST %', type: 'number' },
  ])} searchPlaceholder="Search GST slabs..." addButtonLabel="Add GST Slab" />
);

// ─── Units
const unitCols: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Unit Name', flex: 1 },
  { field: 'shortName', headerName: 'Short Name', width: 120 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];
export const Units: React.FC = () => (
  <CrudPage title="Units" queryKey="units" service={unitService} columns={unitCols} FormComponent={makeSimpleFormWrapper('Unit', 'units', unitService, [
    { name: 'name', label: 'Unit Name', required: true },
    { name: 'shortName', label: 'Short Name' },
  ])} searchPlaceholder="Search units..." addButtonLabel="Add Unit" />
);

// ─── Racks
const rackCols: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Rack Name', flex: 1 },
  { field: 'isActive', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'error'} size="small" /> },
];
export const Racks: React.FC = () => (
  <CrudPage title="Rack Master" queryKey="racks" service={rackService} columns={rackCols} FormComponent={makeSimpleFormWrapper('Rack', 'racks', rackService, [
    { name: 'name', label: 'Rack Name', required: true },
  ])} searchPlaceholder="Search racks..." addButtonLabel="Add Rack" />
);
