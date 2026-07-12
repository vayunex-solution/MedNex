'use strict';

const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userController');
const medicineCtrl = require('../controllers/medicineController');
const purchaseCtrl = require('../controllers/purchaseController');
const saleCtrl = require('../controllers/saleController');
const stockCtrl = require('../controllers/stockController');
const reportCtrl = require('../controllers/reportController');
const dashboardCtrl = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', authenticate, authorize('super_admin', 'admin'), userCtrl.getAll);
router.get('/users/list', authenticate, userCtrl.listAll);
router.get('/users/:id', authenticate, userCtrl.getById);
router.post('/users', authenticate, authorize('super_admin', 'admin'), userCtrl.create);
router.put('/users/:id', authenticate, authorize('super_admin', 'admin'), userCtrl.update);
router.delete('/users/:id', authenticate, authorize('super_admin'), userCtrl.remove);

// ─── Medicines ────────────────────────────────────────────────────────────────
router.get('/medicines', authenticate, medicineCtrl.getAll);
router.get('/medicines/list', authenticate, medicineCtrl.listAll);
router.get('/medicines/:id', authenticate, medicineCtrl.getById);
router.post('/medicines', authenticate, authorize('super_admin', 'admin', 'pharmacist'), upload.single('image'), medicineCtrl.create);
router.put('/medicines/:id', authenticate, authorize('super_admin', 'admin', 'pharmacist'), upload.single('image'), medicineCtrl.update);
router.delete('/medicines/:id', authenticate, authorize('super_admin', 'admin'), medicineCtrl.remove);

// ─── Purchases ────────────────────────────────────────────────────────────────
router.get('/purchases', authenticate, purchaseCtrl.getAll);
router.get('/purchases/:id', authenticate, purchaseCtrl.getById);
router.post('/purchases', authenticate, authorize('super_admin', 'admin', 'pharmacist'), purchaseCtrl.create);
router.put('/purchases/:id', authenticate, authorize('super_admin', 'admin', 'pharmacist'), purchaseCtrl.update);
router.delete('/purchases/:id', authenticate, authorize('super_admin', 'admin'), purchaseCtrl.remove);

// ─── Sales ────────────────────────────────────────────────────────────────────
router.get('/sales', authenticate, saleCtrl.getAll);
router.get('/sales/:id', authenticate, saleCtrl.getById);
router.post('/sales', authenticate, saleCtrl.create);
router.put('/sales/:id', authenticate, authorize('super_admin', 'admin', 'pharmacist'), saleCtrl.update);
router.put('/sales/:id/cancel', authenticate, authorize('super_admin', 'admin'), saleCtrl.cancel);

// ─── Stock ────────────────────────────────────────────────────────────────────
router.get('/stock/current', authenticate, stockCtrl.getCurrentStock);
router.get('/stock/batch-wise', authenticate, stockCtrl.getBatchWiseStock);
router.get('/stock/expiry', authenticate, stockCtrl.getExpiryStock);
router.get('/stock/near-expiry', authenticate, stockCtrl.getNearExpiry);
router.post('/stock/adjustments', authenticate, authorize('super_admin', 'admin', 'pharmacist'), stockCtrl.createAdjustment);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports/sales', authenticate, reportCtrl.getSalesReport);
router.get('/reports/purchase', authenticate, reportCtrl.getPurchaseReport);
router.get('/reports/gst', authenticate, reportCtrl.getGstReport);
router.get('/reports/profit', authenticate, reportCtrl.getProfitReport);
router.get('/reports/customer-ledger', authenticate, reportCtrl.getCustomerLedger);
router.get('/reports/supplier-ledger', authenticate, reportCtrl.getSupplierLedger);
router.get('/reports/item-ledger', authenticate, reportCtrl.getItemLedger);
router.get('/reports/cash-book', authenticate, reportCtrl.getCashBook);
router.get('/reports/bank-book', authenticate, reportCtrl.getBankBook);
router.get('/reports/journal-book', authenticate, reportCtrl.getJournalBook);
router.get('/reports/audit-trail', authenticate, reportCtrl.getAuditTrailReport);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', authenticate, dashboardCtrl.getStats);
router.get('/dashboard/sales-chart', authenticate, dashboardCtrl.getMonthlySalesChart);
router.get('/dashboard/purchase-chart', authenticate, dashboardCtrl.getMonthlyPurchaseChart);
router.get('/dashboard/recent-sales', authenticate, dashboardCtrl.getRecentSales);

// ─── Finance ──────────────────────────────────────────────────────────────────
router.use('/finance', require('./financeRoutes'));

module.exports = router;
