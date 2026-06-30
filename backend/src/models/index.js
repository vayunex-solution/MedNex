'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ─── User ─────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('super_admin','admin','pharmacist','cashier'), defaultValue: 'cashier' },
  phone: { type: DataTypes.STRING(20) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  refreshToken: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'users' });

// ─── Company ──────────────────────────────────────────────────────────────────
const Company = sequelize.define('Company', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  gstin: { type: DataTypes.STRING(20), unique: true },
  drugLicense: { type: DataTypes.STRING(100) },
  phone: { type: DataTypes.STRING(20) },
  mobile: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  website: { type: DataTypes.STRING(200) },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING(100) },
  state: { type: DataTypes.STRING(100) },
  pincode: { type: DataTypes.STRING(10) },
  logo: { type: DataTypes.STRING(255) },
  invoicePrefix: { type: DataTypes.STRING(20), defaultValue: 'INV' },
  invoiceCounter: { type: DataTypes.INTEGER, defaultValue: 1 },
  purchasePrefix: { type: DataTypes.STRING(20), defaultValue: 'PUR' },
  purchaseCounter: { type: DataTypes.INTEGER, defaultValue: 1 },
  bankName: { type: DataTypes.STRING(150) },
  bankAccount: { type: DataTypes.STRING(50) },
  bankIFSC: { type: DataTypes.STRING(20) },
  bankBranch: { type: DataTypes.STRING(150) },
  termsConditions: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'companies' });

// ─── Store ────────────────────────────────────────────────────────────────────
const Store = sequelize.define('Store', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  address: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING(20) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'stores' });

// ─── Rack ─────────────────────────────────────────────────────────────────────
const Rack = sequelize.define('Rack', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  storeId: { type: DataTypes.INTEGER, references: { model: 'stores', key: 'id' } },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'racks' });

// ─── Unit ─────────────────────────────────────────────────────────────────────
const Unit = sequelize.define('Unit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  shortName: { type: DataTypes.STRING(20) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'units' });

// ─── GstSlab ──────────────────────────────────────────────────────────────────
const GstSlab = sequelize.define('GstSlab', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  slab: { type: DataTypes.STRING(20), allowNull: false },
  cgst: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'gst_slabs' });

// ─── HsnCode ──────────────────────────────────────────────────────────────────
const HsnCode = sequelize.define('HsnCode', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hsnCode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  gstRate: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'hsn_codes' });

// ─── MedicineCategory ─────────────────────────────────────────────────────────
const MedicineCategory = sequelize.define('MedicineCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'medicine_categories' });

// ─── MedicineCompany ──────────────────────────────────────────────────────────
const MedicineCompany = sequelize.define('MedicineCompany', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  address: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'medicine_companies' });

// ─── Medicine ─────────────────────────────────────────────────────────────────
const Medicine = sequelize.define('Medicine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  genericName: { type: DataTypes.STRING(200) },
  companyId: { type: DataTypes.INTEGER, references: { model: 'medicine_companies', key: 'id' } },
  categoryId: { type: DataTypes.INTEGER, references: { model: 'medicine_categories', key: 'id' } },
  hsnId: { type: DataTypes.INTEGER, references: { model: 'hsn_codes', key: 'id' } },
  gstSlabId: { type: DataTypes.INTEGER, references: { model: 'gst_slabs', key: 'id' } },
  schedule: { type: DataTypes.STRING(20) },
  rackId: { type: DataTypes.INTEGER, references: { model: 'racks', key: 'id' } },
  unitId: { type: DataTypes.INTEGER, references: { model: 'units', key: 'id' } },
  barcode: { type: DataTypes.STRING(100), unique: true },
  minStock: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  maxStock: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  reorderLevel: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  mrp: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  purchaseRate: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  saleRate: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  image: { type: DataTypes.STRING(255) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'medicines' });

// ─── Customer ─────────────────────────────────────────────────────────────────
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  mobile: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  gstin: { type: DataTypes.STRING(20) },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING(100) },
  state: { type: DataTypes.STRING(100) },
  pincode: { type: DataTypes.STRING(10) },
  openingBalance: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  creditLimit: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'customers' });

// ─── Supplier ─────────────────────────────────────────────────────────────────
const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  gstin: { type: DataTypes.STRING(20) },
  phone: { type: DataTypes.STRING(20) },
  mobile: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING(100) },
  state: { type: DataTypes.STRING(100) },
  pincode: { type: DataTypes.STRING(10) },
  bankName: { type: DataTypes.STRING(150) },
  bankAccount: { type: DataTypes.STRING(50) },
  bankIFSC: { type: DataTypes.STRING(20) },
  openingBalance: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'suppliers' });

// ─── Doctor ───────────────────────────────────────────────────────────────────
const Doctor = sequelize.define('Doctor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  qualification: { type: DataTypes.STRING(100) },
  specialization: { type: DataTypes.STRING(150) },
  phone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  address: { type: DataTypes.TEXT },
  regNo: { type: DataTypes.STRING(100) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'doctors' });

// ─── Batch ────────────────────────────────────────────────────────────────────
const Batch = sequelize.define('Batch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  medicineId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'medicines', key: 'id' } },
  batchNo: { type: DataTypes.STRING(100), allowNull: false },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: false },
  qty: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  mrp: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  purchaseRate: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  saleRate: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  supplierId: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'batches' });

// ─── PurchaseInvoice ──────────────────────────────────────────────────────────
const PurchaseInvoice = sequelize.define('PurchaseInvoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoiceNo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  supplierId: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false },
  supplierInvoiceNo: { type: DataTypes.STRING(100) },
  subtotal: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  discountAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  taxAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  grandTotal: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  paidAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  paymentMode: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.ENUM('pending','completed','cancelled'), defaultValue: 'completed' },
  notes: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'purchase_invoices' });

// ─── PurchaseItem ─────────────────────────────────────────────────────────────
const PurchaseItem = sequelize.define('PurchaseItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchaseId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'purchase_invoices', key: 'id' } },
  medicineId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'medicines', key: 'id' } },
  batchNo: { type: DataTypes.STRING(100) },
  expiryDate: { type: DataTypes.DATEONLY },
  qty: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  freeQty: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  mrp: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  ptr: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  rate: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  gstRate: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  cgst: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  gstAmount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'purchase_items' });

// ─── SaleInvoice ──────────────────────────────────────────────────────────────
const SaleInvoice = sequelize.define('SaleInvoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoiceNo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  customerId: { type: DataTypes.INTEGER, references: { model: 'customers', key: 'id' } },
  doctorId: { type: DataTypes.INTEGER, references: { model: 'doctors', key: 'id' } },
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false },
  transport: { type: DataTypes.STRING(100) },
  orderNo: { type: DataTypes.STRING(100) },
  lrNumber: { type: DataTypes.STRING(100) },
  cases: { type: DataTypes.INTEGER },
  eWayBill: { type: DataTypes.STRING(100) },
  subtotal: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  discountAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  cgstAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  sgstAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  igstAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  taxAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  roundOff: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  grandTotal: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  paidAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  paymentMode: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.ENUM('draft','completed','cancelled'), defaultValue: 'completed' },
  notes: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'sale_invoices' });

// ─── SaleItem ─────────────────────────────────────────────────────────────────
const SaleItem = sequelize.define('SaleItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  saleId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'sale_invoices', key: 'id' } },
  medicineId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'medicines', key: 'id' } },
  batchId: { type: DataTypes.INTEGER, references: { model: 'batches', key: 'id' } },
  batchNo: { type: DataTypes.STRING(100) },
  expiryDate: { type: DataTypes.DATEONLY },
  qty: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  free: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  pack: { type: DataTypes.STRING(50) },
  hsnCode: { type: DataTypes.STRING(20) },
  mrp: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  rate: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  cgst: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  gstAmount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'sale_items' });

// ─── StockAdjustment ──────────────────────────────────────────────────────────
const StockAdjustment = sequelize.define('StockAdjustment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  medicineId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'medicines', key: 'id' } },
  batchId: { type: DataTypes.INTEGER, references: { model: 'batches', key: 'id' } },
  adjustmentType: { type: DataTypes.ENUM('increase','decrease','damage','transfer'), defaultValue: 'increase' },
  qty: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  reason: { type: DataTypes.TEXT },
  date: { type: DataTypes.DATEONLY },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'stock_adjustments' });

// ─── AuditLog ─────────────────────────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  action: { type: DataTypes.STRING(50) },
  module: { type: DataTypes.STRING(100) },
  details: { type: DataTypes.TEXT },
  ipAddress: { type: DataTypes.STRING(50) },
}, { tableName: 'audit_logs', updatedAt: false });

// ─── Associations ─────────────────────────────────────────────────────────────
Store.hasMany(Rack, { foreignKey: 'storeId', as: 'racks' });
Rack.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

Medicine.belongsTo(MedicineCompany, { foreignKey: 'companyId', as: 'company' });
Medicine.belongsTo(MedicineCategory, { foreignKey: 'categoryId', as: 'category' });
Medicine.belongsTo(HsnCode, { foreignKey: 'hsnId', as: 'hsn' });
Medicine.belongsTo(GstSlab, { foreignKey: 'gstSlabId', as: 'gstSlab' });
Medicine.belongsTo(Rack, { foreignKey: 'rackId', as: 'rack' });
Medicine.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });

Batch.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });
Batch.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

PurchaseInvoice.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
PurchaseInvoice.hasMany(PurchaseItem, { foreignKey: 'purchaseId', as: 'items' });
PurchaseItem.belongsTo(PurchaseInvoice, { foreignKey: 'purchaseId', as: 'purchase' });
PurchaseItem.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });

SaleInvoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
SaleInvoice.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });
SaleInvoice.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items' });
SaleItem.belongsTo(SaleInvoice, { foreignKey: 'saleId', as: 'sale' });
SaleItem.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });
SaleItem.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });

StockAdjustment.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });
StockAdjustment.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });

module.exports = {
  sequelize,
  User, Company, Store, Rack, Unit, GstSlab, HsnCode,
  MedicineCategory, MedicineCompany, Medicine,
  Customer, Supplier, Doctor,
  Batch, PurchaseInvoice, PurchaseItem,
  SaleInvoice, SaleItem,
  StockAdjustment, AuditLog,
};
