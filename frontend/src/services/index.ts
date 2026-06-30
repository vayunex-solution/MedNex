import api from './api';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
};

// ─── Generic service factory ──────────────────────────────────────────────────
const crudService = (endpoint: string) => ({
  getAll: (params?: Record<string, unknown>) => api.get(endpoint, { params }),
  getList: () => api.get(`${endpoint}/list`),
  getById: (id: number) => api.get(`${endpoint}/${id}`),
  create: (data: unknown) => api.post(endpoint, data),
  update: (id: number, data: unknown) => api.put(`${endpoint}/${id}`, data),
  remove: (id: number) => api.delete(`${endpoint}/${id}`),
});

export const customerService = crudService('/customers');
export const supplierService = crudService('/suppliers');
export const doctorService = crudService('/doctors');
export const medicineCategoryService = crudService('/medicine-categories');
export const medicineCompanyService = crudService('/medicine-companies');
export const hsnService = crudService('/hsn-codes');
export const gstService = crudService('/gst-slabs');
export const unitService = crudService('/units');
export const rackService = crudService('/racks');
export const storeService = crudService('/stores');
export const userService = crudService('/users');

// ─── Medicine (with file upload) ──────────────────────────────────────────────
export const medicineService = {
  ...crudService('/medicines'),
  create: (data: FormData) => api.post('/medicines', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: FormData) => api.put(`/medicines/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Batches ──────────────────────────────────────────────────────────────────
export const batchService = {
  getByMedicine: (medicineId: number) => api.get('/batches', { params: { medicineId } }),
  getAll: (params?: Record<string, unknown>) => api.get('/batches', { params }),
};

// ─── Purchase ─────────────────────────────────────────────────────────────────
export const purchaseService = {
  getAll: (params?: Record<string, unknown>) => api.get('/purchases', { params }),
  getById: (id: number) => api.get(`/purchases/${id}`),
  create: (data: unknown) => api.post('/purchases', data),
  remove: (id: number) => api.delete(`/purchases/${id}`),
};

// ─── Sales ────────────────────────────────────────────────────────────────────
export const saleService = {
  getAll: (params?: Record<string, unknown>) => api.get('/sales', { params }),
  getById: (id: number) => api.get(`/sales/${id}`),
  create: (data: unknown) => api.post('/sales', data),
  cancel: (id: number) => api.put(`/sales/${id}/cancel`),
};

// ─── Stock ────────────────────────────────────────────────────────────────────
export const stockService = {
  getCurrent: (params?: Record<string, unknown>) => api.get('/stock/current', { params }),
  getBatchWise: (params?: Record<string, unknown>) => api.get('/stock/batch-wise', { params }),
  getExpiry: () => api.get('/stock/expiry'),
  getNearExpiry: (days?: number) => api.get('/stock/near-expiry', { params: { days } }),
  createAdjustment: (data: unknown) => api.post('/stock/adjustments', data),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportService = {
  getSales: (params?: Record<string, unknown>) => api.get('/reports/sales', { params }),
  getPurchase: (params?: Record<string, unknown>) => api.get('/reports/purchase', { params }),
  getGst: (params?: Record<string, unknown>) => api.get('/reports/gst', { params }),
  getProfit: (params?: Record<string, unknown>) => api.get('/reports/profit', { params }),
  getCustomerLedger: (params?: Record<string, unknown>) => api.get('/reports/customer-ledger', { params }),
  getSupplierLedger: (params?: Record<string, unknown>) => api.get('/reports/supplier-ledger', { params }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getSalesChart: (year?: number) => api.get('/dashboard/sales-chart', { params: { year } }),
  getPurchaseChart: (year?: number) => api.get('/dashboard/purchase-chart', { params: { year } }),
  getRecentSales: () => api.get('/dashboard/recent-sales'),
};

// ─── Company ──────────────────────────────────────────────────────────────────
export const companyService = {
  get: () => api.get('/company'),
  update: (data: unknown) => api.put('/company', data),
};
