'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { createCrudController } = require('../controllers/crudController');
const {
  Customer, Supplier, Doctor, MedicineCategory, MedicineCompany,
  HsnCode, GstSlab, Unit, Rack, Store, Company, Batch,
} = require('../models');

// ─── Generic CRUD router factory ──────────────────────────────────────────────
const crudRouter = (ctrl, roles = []) => {
  const r = express.Router();
  r.get('/', authenticate, ctrl.getAll);
  r.get('/list', authenticate, ctrl.listAll);
  r.get('/:id', authenticate, ctrl.getById);
  r.post('/', authenticate, roles.length ? authorize(...roles) : (req, res, next) => next(), ctrl.create);
  r.put('/:id', authenticate, roles.length ? authorize(...roles) : (req, res, next) => next(), ctrl.update);
  r.delete('/:id', authenticate, authorize('super_admin', 'admin'), ctrl.remove);
  return r;
};

// ─── Master Routes ─────────────────────────────────────────────────────────────
const customerCtrl = createCrudController(Customer, { searchFields: ['name', 'phone', 'email', 'gstin'] });
const supplierCtrl = createCrudController(Supplier, { searchFields: ['name', 'phone', 'email', 'gstin'] });
const doctorCtrl = createCrudController(Doctor, { searchFields: ['name', 'qualification', 'regNo'] });
const categoryCtrl = createCrudController(MedicineCategory, { searchFields: ['name'] });
const companyCtrl = createCrudController(MedicineCompany, { searchFields: ['name'] });
const hsnCtrl = createCrudController(HsnCode, { searchFields: ['hsnCode', 'description'] });
const gstCtrl = createCrudController(GstSlab, { searchFields: ['slab'] });
const unitCtrl = createCrudController(Unit, { searchFields: ['name', 'shortName'] });
const rackCtrl = createCrudController(Rack, { searchFields: ['name'] });
const storeCtrl = createCrudController(Store, { searchFields: ['name'] });

const router = express.Router();
router.use('/customers', crudRouter(customerCtrl));
router.use('/suppliers', crudRouter(supplierCtrl));
router.use('/doctors', crudRouter(doctorCtrl));
router.use('/medicine-categories', crudRouter(categoryCtrl));
router.use('/medicine-companies', crudRouter(companyCtrl));
router.use('/hsn-codes', crudRouter(hsnCtrl));
router.use('/gst-slabs', crudRouter(gstCtrl));
router.use('/units', crudRouter(unitCtrl));
router.use('/racks', crudRouter(rackCtrl));
router.use('/stores', crudRouter(storeCtrl));

// Company settings
router.get('/company', authenticate, async (req, res) => {
  const c = await Company.findOne();
  return res.json({ success: true, data: c });
});
router.put('/company', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  let c = await Company.findOne();
  if (!c) c = await Company.create({ ...req.body, createdBy: req.user.id });
  else await c.update({ ...req.body, updatedBy: req.user.id });
  return res.json({ success: true, data: c, message: 'Company settings saved' });
});

// Batches
router.get('/batches', authenticate, async (req, res) => {
  const { medicineId } = req.query;
  const { Op } = require('sequelize');
  const where = { isDeleted: false, qty: { [Op.gt]: 0 }, expiryDate: { [Op.gte]: new Date() } };
  if (medicineId) where.medicineId = medicineId;
  const rows = await Batch.findAll({ where, order: [['expiryDate', 'ASC']] });
  return res.json({ success: true, data: rows });
});

module.exports = router;
