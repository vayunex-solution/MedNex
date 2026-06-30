// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'pharmacist' | 'cashier';
  phone?: string;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Company
export interface Company {
  id: number;
  name: string;
  gstin?: string;
  drugLicense?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logo?: string;
  invoicePrefix?: string;
  purchasePrefix?: string;
  bankName?: string;
  bankAccount?: string;
  bankIFSC?: string;
  termsConditions?: string;
}

// Masters
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  openingBalance?: number;
  creditLimit?: number;
  isActive: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  gstin?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  state?: string;
  bankName?: string;
  bankAccount?: string;
  bankIFSC?: string;
  isActive: boolean;
}

export interface Doctor {
  id: number;
  name: string;
  qualification?: string;
  specialization?: string;
  phone?: string;
  email?: string;
  regNo?: string;
  isActive: boolean;
}

export interface MedicineCategory { id: number; name: string; description?: string; isActive: boolean; }
export interface MedicineCompany { id: number; name: string; address?: string; phone?: string; email?: string; isActive: boolean; }
export interface HsnCode { id: number; hsnCode: string; description?: string; gstRate: number; isActive: boolean; }
export interface GstSlab { id: number; slab: string; cgst: number; sgst: number; igst: number; isActive: boolean; }
export interface Unit { id: number; name: string; shortName: string; isActive: boolean; }
export interface Rack { id: number; name: string; storeId?: number; isActive: boolean; }
export interface Store { id: number; name: string; address?: string; isActive: boolean; }

export interface Medicine {
  id: number;
  name: string;
  genericName?: string;
  companyId?: number;
  categoryId?: number;
  hsnId?: number;
  gstSlabId?: number;
  schedule?: string;
  rackId?: number;
  unitId?: number;
  barcode?: string;
  minStock?: number;
  maxStock?: number;
  reorderLevel?: number;
  mrp?: number;
  purchaseRate?: number;
  saleRate?: number;
  image?: string;
  isActive: boolean;
  company?: MedicineCompany;
  category?: MedicineCategory;
  hsn?: HsnCode;
  gstSlab?: GstSlab;
  rack?: Rack;
  unit?: Unit;
}

export interface Batch {
  id: number;
  medicineId: number;
  batchNo: string;
  expiryDate: string;
  qty: number;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
  medicine?: Medicine;
}

// Billing
export interface SaleItem {
  id?: number;
  medicineId: number;
  batchId?: number;
  batchNo?: string;
  expiryDate?: string;
  qty: number;
  free?: number;
  pack?: string;
  hsnCode?: string;
  mrp: number;
  rate: number;
  discount?: number;
  sgst?: number;
  cgst?: number;
  gstAmount?: number;
  amount: number;
  medicine?: Medicine;
}

export interface SaleInvoice {
  id: number;
  invoiceNo: string;
  customerId?: number;
  doctorId?: number;
  invoiceDate: string;
  transport?: string;
  orderNo?: string;
  lrNumber?: string;
  cases?: number;
  eWayBill?: string;
  subtotal: number;
  discountAmount?: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount?: number;
  paymentMode?: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  customer?: Customer;
  doctor?: Doctor;
  items?: SaleItem[];
}

export interface PurchaseItem {
  id?: number;
  medicineId: number;
  batchNo?: string;
  expiryDate?: string;
  qty: number;
  freeQty?: number;
  mrp: number;
  ptr?: number;
  rate: number;
  discount?: number;
  gstRate?: number;
  gstAmount?: number;
  amount: number;
  medicine?: Medicine;
}

export interface PurchaseInvoice {
  id: number;
  invoiceNo: string;
  supplierId: number;
  invoiceDate: string;
  grandTotal: number;
  status: 'pending' | 'completed' | 'cancelled';
  supplier?: Supplier;
  items?: PurchaseItem[];
}

// Dashboard
export interface DashboardStats {
  todaySales: number;
  todayPurchase: number;
  todayProfit: number;
  monthSales: number;
  stockValue: number;
  totalCustomers: number;
  totalSuppliers: number;
  lowStock: number;
  expiredBatches: number;
  nearExpiryBatches: number;
}

export interface ChartDataPoint {
  month: number;
  total: number;
}
