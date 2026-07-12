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
  list: () => api.get(`${endpoint}/list`),
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
export const stateService = crudService('/states');
export const cityService = crudService('/cities');

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
  update: (id: number, data: unknown) => api.put(`/purchases/${id}`, data),
  remove: (id: number) => api.delete(`/purchases/${id}`),
};

// ─── Sales ────────────────────────────────────────────────────────────────────
export const saleService = {
  getAll: (params?: Record<string, unknown>) => api.get('/sales', { params }),
  getById: (id: number) => api.get(`/sales/${id}`),
  create: (data: unknown) => api.post('/sales', data),
  update: (id: number, data: unknown) => api.put(`/sales/${id}`, data),
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
  getItemLedger: (params?: Record<string, unknown>) => api.get('/reports/item-ledger', { params }),
  getCashBook: (params?: Record<string, unknown>) => api.get('/reports/cash-book', { params }),
  getBankBook: (params?: Record<string, unknown>) => api.get('/reports/bank-book', { params }),
  getJournalBook: (params?: Record<string, unknown>) => api.get('/reports/journal-book', { params }),
};

// ─── Finance ──────────────────────────────────────────────────────────────────
export const financeService = {
  getCashBank: (params?: Record<string, unknown>) => api.get('/finance/cash-bank', { params }),
  createCashBank: (data: unknown) => api.post('/finance/cash-bank', data),
  updateCashBank: (id: number, data: unknown) => api.put(`/finance/cash-bank/${id}`, data),
  getCashBankById: (id: number) => api.get(`/finance/cash-bank/${id}`),
  getJournal: (params?: Record<string, unknown>) => api.get('/finance/journal', { params }),
  createJournal: (data: unknown) => api.post('/finance/journal', data),
  updateJournal: (id: number, data: unknown) => api.put(`/finance/journal/${id}`, data),
  getJournalById: (id: number) => api.get(`/finance/journal/${id}`),
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

// ─── Platform Management (Super Admin Control Panel) ───────────────────────────
export const platformTenantService = {
  getAll: (params?: Record<string, unknown>) => api.get('/platform/tenants', { params }).then(r => ({ data: r.data.data, total: r.data.pagination?.total || 0 })),
  getById: (uuid: string) => api.get(`/platform/tenants/${uuid}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/platform/tenants', data),
  update: (uuid: string, data: unknown) => api.put(`/platform/tenants/${uuid}`, data),
  activate: (uuid: string) => api.post(`/platform/tenants/${uuid}/activate`),
  suspend: (uuid: string) => api.post(`/platform/tenants/${uuid}/suspend`),
  archive: (uuid: string) => api.post(`/platform/tenants/${uuid}/archive`),
};

export const platformUserService = {
  getAll: (params?: Record<string, unknown>) => api.get('/platform/users', { params }).then(r => r.data),
  getById: (uuid: string) => api.get(`/platform/users/${uuid}`).then(r => r.data.data),
  create: (data: unknown) => api.post('/platform/users', data),
  update: (uuid: string, data: unknown) => api.put(`/platform/users/${uuid}`, data),
  remove: (uuid: string) => api.delete(`/platform/users/${uuid}`),
  activate: (uuid: string) => api.post(`/platform/users/${uuid}/activate`),
  suspend: (uuid: string) => api.post(`/platform/users/${uuid}/suspend`),
  resetPassword: (uuid: string, data: unknown) => api.post(`/platform/users/${uuid}/reset-password`, data),
};

export const auditTrailService = {
  getReport: (params?: Record<string, unknown>) => api.get('/reports/audit-trail', { params }),
};

export const tenantSettingsService = {
  get: () => api.get('/tenant/settings').then(r => r.data.data),
  update: (data: unknown) => api.put('/tenant/settings', data),
  testSmtp: (data: unknown) => api.post('/tenant/settings/test-smtp', data),
};

export const developerService = {
  listKeys: () => api.get('/developer/keys').then(r => r.data.data),
  generateKey: (data: unknown) => api.post('/developer/keys', data).then(r => r.data.data),
  revokeKey: (id: number) => api.delete(`/developer/keys/${id}`),
  listWebhooks: () => api.get('/developer/webhooks').then(r => r.data.data),
  createWebhook: (data: unknown) => api.post('/developer/webhooks', data).then(r => r.data.data),
  deleteWebhook: (id: number) => api.delete(`/developer/webhooks/${id}`),
  getWebhookLogs: () => api.get('/developer/webhooks/logs').then(r => r.data.data),
};

export const campaignService = {
  list: () => api.get('/marketing/campaigns').then(r => r.data.data),
  create: (data: unknown) => api.post('/marketing/campaigns', data),
  getSegments: () => api.get('/marketing/segments').then(r => r.data.data),
  send: (id: number) => api.post(`/marketing/campaigns/${id}/send`),
};

export const offerService = {
  list: () => api.get('/offers').then(r => r.data.data),
  create: (data: unknown) => api.post('/offers', data),
  toggleStatus: (id: number, isActive: boolean) => api.put(`/offers/${id}/status`, { isActive }),
  remove: (id: number) => api.delete(`/offers/${id}`),
};
