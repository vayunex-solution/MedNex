'use strict';

const { PurchaseInvoice, PurchaseItem, Medicine, Supplier, Batch, sequelize } = require('../models');
const { success, created, notFound, badRequest } = require('../helpers/response');
const { buildWhere, getPagination } = require('../helpers/queryHelper');
const { Company } = require('../models');

const getAll = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = buildWhere(req.query, ['invoiceNo'], { isDeleted: false });
  if (req.query.from) where.invoiceDate = { ...(where.invoiceDate || {}), $gte: req.query.from };
  if (req.query.to) where.invoiceDate = { ...(where.invoiceDate || {}), $lte: req.query.to };
  const { count, rows } = await PurchaseInvoice.findAndCountAll({
    where,
    include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name', 'gstin'] }],
    limit, offset,
    order: [['invoiceDate', 'DESC']],
  });
  return res.status(200).json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } });
};

const getById = async (req, res) => {
  const record = await PurchaseInvoice.findOne({
    where: { id: req.params.id, isDeleted: false },
    include: [
      { model: Supplier, as: 'supplier' },
      { model: PurchaseItem, as: 'items', include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name', 'genericName'] }] },
    ],
  });
  if (!record) return notFound(res);
  return success(res, record);
};

const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, ...invoiceData } = req.body;
    // Generate invoice number
    const company = await Company.findOne();
    const invoiceNo = `${company?.purchasePrefix || 'PUR'}-${String(company?.purchaseCounter || 1).padStart(6, '0')}`;
    if (company) await company.increment('purchaseCounter');

    const invoice = await PurchaseInvoice.create({ ...invoiceData, invoiceNo, createdBy: req.user?.id }, { transaction: t });

    let grandTotal = 0;
    for (const item of items || []) {
      const gstAmount = (((item.rate * item.qty) - ((item.rate * item.qty) * (item.discount / 100))) * (item.gstRate / 100));
      const amount = ((item.rate * item.qty) - ((item.rate * item.qty) * (item.discount / 100))) + gstAmount;
      grandTotal += amount;

      await PurchaseItem.create({ ...item, purchaseId: invoice.id, gstAmount, amount }, { transaction: t });

      // Update or create batch
      const [batch] = await Batch.findOrCreate({
        where: { medicineId: item.medicineId, batchNo: item.batchNo, expiryDate: item.expiryDate },
        defaults: { qty: item.qty + (item.freeQty || 0), mrp: item.mrp, purchaseRate: item.rate, saleRate: item.mrp, supplierId: invoiceData.supplierId },
        transaction: t,
      });
      if (!batch.isNewRecord) {
        await batch.increment('qty', { by: item.qty + (item.freeQty || 0), transaction: t });
      }
    }

    await invoice.update({ grandTotal }, { transaction: t });

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'CREATE', 'Purchase', `Created purchase bill ${invoiceNo} totaling ₹${grandTotal.toFixed(2)}`);

    await t.commit();
    return created(res, { ...invoice.toJSON(), invoiceNo });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, ...invoiceData } = req.body;
    const { id } = req.params;

    const invoice = await PurchaseInvoice.findOne({
      where: { id, isDeleted: false },
      include: [{ model: PurchaseItem, as: 'items' }],
      transaction: t,
    });
    if (!invoice) {
      await t.rollback();
      return notFound(res);
    }

    // 1. Deduct old purchase quantities from batch stock (restore stock to pre-purchase state)
    for (const oldItem of invoice.items) {
      const batch = await Batch.findOne({
        where: { medicineId: oldItem.medicineId, batchNo: oldItem.batchNo },
        transaction: t,
      });
      if (batch) {
        await batch.decrement('qty', { by: oldItem.qty + (oldItem.freeQty || 0), transaction: t });
      }
    }

    // Delete old items
    await PurchaseItem.destroy({ where: { purchaseId: id }, transaction: t });

    // 2. Process new items and calculate grandTotal
    let grandTotal = 0;
    for (const item of items || []) {
      const gstAmount = (((item.rate * item.qty) - ((item.rate * item.qty) * (item.discount / 100))) * (item.gstRate / 100));
      const amount = ((item.rate * item.qty) - ((item.rate * item.qty) * (item.discount / 100))) + gstAmount;
      grandTotal += amount;

      await PurchaseItem.create({ ...item, purchaseId: invoice.id, gstAmount, amount }, { transaction: t });

      // Update or create batch
      const [batch] = await Batch.findOrCreate({
        where: { medicineId: item.medicineId, batchNo: item.batchNo, expiryDate: item.expiryDate },
        defaults: { qty: item.qty + (item.freeQty || 0), mrp: item.mrp, purchaseRate: item.rate, saleRate: item.mrp, supplierId: invoiceData.supplierId },
        transaction: t,
      });
      if (!batch.isNewRecord) {
        await batch.increment('qty', { by: item.qty + (item.freeQty || 0), transaction: t });
      }
    }

    const oldGrandTotal = invoice.grandTotal;
    await invoice.update({ ...invoiceData, grandTotal, updatedBy: req.user?.id }, { transaction: t });

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'UPDATE', 'Purchase', `Updated purchase bill ${invoice.invoiceNo}: grandTotal changed from ₹${oldGrandTotal} to ₹${grandTotal.toFixed(2)}`);

    await t.commit();
    return success(res, invoice, 'Purchase updated successfully');
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const record = await PurchaseInvoice.findOne({
      where: { id: req.params.id, isDeleted: false },
      include: [{ model: PurchaseItem, as: 'items' }],
      transaction: t,
    });
    if (!record || record.status === 'cancelled') {
      await t.rollback();
      return notFound(res);
    }

    await record.update({ isDeleted: true, status: 'cancelled', updatedBy: req.user?.id }, { transaction: t });

    for (const item of record.items) {
      const batch = await Batch.findOne({
        where: { medicineId: item.medicineId, batchNo: item.batchNo },
        transaction: t,
      });
      if (batch) {
        await batch.decrement('qty', { by: item.qty + (item.freeQty || 0), transaction: t });
      }
    }

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'CANCEL', 'Purchase', `Cancelled purchase bill ${record.invoiceNo}`);

    await t.commit();
    return success(res, null, 'Purchase cancelled successfully and stock deducted');
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { getAll, getById, create, update, remove };
