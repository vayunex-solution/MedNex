'use strict';

const express = require('express');
const router = express.Router();
const { authorizeApiKey, checkScope } = require('../middleware/apiKeyAuth');
const sequelize = require('../config/database');

// All external API endpoints are authenticated using API Key
router.use(authorizeApiKey);

/**
 * GET /api/v1/external/inventory
 * Scope: inventory:read
 */
router.get('/inventory', checkScope('inventory:read'), async (req, res) => {
  const [rows] = await sequelize.query(
    `SELECT m.id, m.name, m.genericName, m.mrp, m.saleRate, b.batchNo, b.expiryDate, b.qty 
     FROM medicines m
     LEFT JOIN batches b ON b.medicineId = m.id
     WHERE m.tenantId = ? AND m.isDeleted = 0`,
    { replacements: [req.user.tenantId] }
  );
  return res.json({ success: true, data: rows });
});

/**
 * GET /api/v1/external/customers
 * Scope: customers:read
 */
router.get('/customers', checkScope('customers:read'), async (req, res) => {
  const [rows] = await sequelize.query(
    'SELECT id, name, phone, email, gstin, city FROM customers WHERE tenantId = ? AND isDeleted = 0',
    { replacements: [req.user.tenantId] }
  );
  return res.json({ success: true, data: rows });
});

/**
 * POST /api/v1/external/sales
 * Scope: sales:write
 */
router.post('/sales', checkScope('sales:write'), async (req, res) => {
  // Simple proxy to trigger internal sale creation
  const saleCtrl = require('../controllers/saleController');
  // Inject req params
  return saleCtrl.create(req, res);
});

/**
 * POST /api/v1/external/purchases
 * Scope: purchases:write
 */
router.post('/purchases', checkScope('purchases:write'), async (req, res) => {
  const purchaseCtrl = require('../controllers/purchaseController');
  return purchaseCtrl.create(req, res);
});

module.exports = router;
