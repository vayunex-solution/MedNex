'use strict';

const { SaleInvoice, SaleItem, Medicine, Customer, Doctor, Batch, Company, HsnCode, GstSlab, sequelize } = require('../models');
const { success, created, notFound } = require('../helpers/response');
const { buildWhere, getPagination } = require('../helpers/queryHelper');

const getAll = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = buildWhere(req.query, ['invoiceNo'], { isDeleted: false });
  const { count, rows } = await SaleInvoice.findAndCountAll({
    where,
    include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] }],
    limit, offset,
    order: [['invoiceDate', 'DESC']],
  });
  return res.status(200).json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } });
};

const getById = async (req, res) => {
  const record = await SaleInvoice.findOne({
    where: { id: req.params.id, isDeleted: false },
    include: [
      { model: Customer, as: 'customer' },
      { model: Doctor, as: 'doctor', attributes: ['id', 'name', 'qualification'] },
      { model: SaleItem, as: 'items', include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name', 'genericName'] }] },
    ],
  });
  if (!record) return notFound(res);
  return success(res, record);
};

const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, ...invoiceData } = req.body;
    const company = await Company.findOne();
    const invoiceNo = `${company?.invoicePrefix || 'INV'}-${String(company?.invoiceCounter || 1).padStart(6, '0')}`;
    if (company) await company.increment('invoiceCounter');

    let subtotal = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0, taxAmount = 0;
    const discountAmount = Number(invoiceData.discountAmount || 0);

    const processedItems = items.map((item) => {
      const taxable = (item.rate * item.qty) * (1 - (item.discount || 0) / 100);
      const cgst = taxable * ((item.cgst || 0) / 100);
      const sgst = taxable * ((item.sgst || 0) / 100);
      const igst = taxable * ((item.igst || 0) / 100);
      const gstAmount = cgst + sgst + igst;
      const amount = taxable + gstAmount;
      subtotal += taxable;
      cgstAmount += cgst;
      sgstAmount += sgst;
      igstAmount += igst;
      taxAmount += gstAmount;
      return { ...item, gstAmount, amount };
    });

    // Recalculate tax after overall discount (proportionally reduce)
    const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
    cgstAmount = cgstAmount * discountRatio;
    sgstAmount = sgstAmount * discountRatio;
    igstAmount = igstAmount * discountRatio;
    taxAmount = cgstAmount + sgstAmount + igstAmount;

    const grandTotal = (subtotal - discountAmount) + taxAmount + (invoiceData.roundOff || 0);

    const invoice = await SaleInvoice.create({
      ...invoiceData, invoiceNo, subtotal, discountAmount, cgstAmount, sgstAmount, igstAmount, taxAmount, grandTotal,
      paidAmount: invoiceData.paidAmount ?? grandTotal,
      chequeNo: invoiceData.chequeNo || null,
      bankName: invoiceData.bankName || null,
      transactionRef: invoiceData.transactionRef || null,
      createdBy: req.user?.id,
    }, { transaction: t });

    for (const item of processedItems) {
      await SaleItem.create({ ...item, saleId: invoice.id }, { transaction: t });
      // Deduct batch stock
      if (item.batchId) {
        const batch = await Batch.findByPk(item.batchId, { transaction: t });
        if (batch) await batch.decrement('qty', { by: item.qty + (item.free || 0), transaction: t });
      }
    }

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'CREATE', 'Sales', `Created sale bill ${invoiceNo} totaling ₹${grandTotal.toFixed(2)}`);

    await t.commit();
    const full = await SaleInvoice.findOne({
      where: { id: invoice.id },
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items', include: [{ model: Medicine, as: 'medicine' }] },
      ],
    });
    return created(res, full);
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

    const invoice = await SaleInvoice.findOne({
      where: { id, isDeleted: false },
      include: [
        { model: Customer, as: 'customer', attributes: ['name'] },
        { model: SaleItem, as: 'items', include: [{ model: Medicine, as: 'medicine', attributes: ['name'] }] }
      ],
      transaction: t,
    });
    if (!invoice) {
      await t.rollback();
      return notFound(res);
    }

    // 1. Restore old batch stocks
    for (const oldItem of invoice.items) {
      if (oldItem.batchId) {
        const batch = await Batch.findByPk(oldItem.batchId, { transaction: t });
        if (batch) {
          await batch.increment('qty', { by: oldItem.qty + (oldItem.free || 0), transaction: t });
        }
      }
    }

    // Delete old items
    await SaleItem.destroy({ where: { saleId: id }, transaction: t });

    // 2. Process new items and calculate totals
    let subtotal = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0, taxAmount = 0;
    const discountAmount = Number(invoiceData.discountAmount || 0);

    const processedItems = (items || []).map((item) => {
      const taxable = (item.rate * item.qty) * (1 - (item.discount || 0) / 100);
      const cgst = taxable * ((item.cgst || 0) / 100);
      const sgst = taxable * ((item.sgst || 0) / 100);
      const igst = taxable * ((item.igst || 0) / 100);
      const gstAmount = cgst + sgst + igst;
      const amount = taxable + gstAmount;
      subtotal += taxable;
      cgstAmount += cgst;
      sgstAmount += sgst;
      igstAmount += igst;
      taxAmount += gstAmount;
      return { ...item, gstAmount, amount };
    });

    const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
    cgstAmount = cgstAmount * discountRatio;
    sgstAmount = sgstAmount * discountRatio;
    igstAmount = igstAmount * discountRatio;
    taxAmount = cgstAmount + sgstAmount + igstAmount;

    const grandTotal = (subtotal - discountAmount) + taxAmount + (invoiceData.roundOff || 0);

    // Update invoice record
    const oldGrandTotal = invoice.grandTotal;
    await invoice.update({
      ...invoiceData, subtotal, discountAmount, cgstAmount, sgstAmount, igstAmount, taxAmount, grandTotal,
      paidAmount: invoiceData.paidAmount ?? grandTotal,
      updatedBy: req.user?.id,
    }, { transaction: t });

    // 3. Create new items and deduct stock
    for (const item of processedItems) {
      await SaleItem.create({ ...item, saleId: invoice.id }, { transaction: t });
      if (item.batchId) {
        const batch = await Batch.findByPk(item.batchId, { transaction: t });
        if (batch) {
          await batch.decrement('qty', { by: item.qty + (item.free || 0), transaction: t });
        }
      }
    }

    // Build Audit Log Details
    const auditDetails = [];
    auditDetails.push(`Invoice: ${invoice.invoiceNo}`);
    
    // Compare Customer name
    if (invoiceData.customerId && Number(invoiceData.customerId) !== Number(invoice.customerId)) {
      const oldCustName = invoice.customer?.name || 'Walk-in';
      const newCust = await Customer.findByPk(invoiceData.customerId, { transaction: t });
      auditDetails.push(`Customer: ${oldCustName} -> ${newCust?.name || 'Walk-in'}`);
    }

    auditDetails.push(`Date: ${invoice.invoiceDate} -> ${invoiceData.invoiceDate || invoice.invoiceDate}`);
    auditDetails.push(`Payment Mode: ${invoice.paymentMode} -> ${invoiceData.paymentMode || invoice.paymentMode}`);
    auditDetails.push(`Subtotal: ₹${Number(invoice.subtotal || 0).toFixed(2)} -> ₹${Number(subtotal || 0).toFixed(2)}`);
    auditDetails.push(`Discount: ₹${Number(invoice.discountAmount || 0).toFixed(2)} -> ₹${Number(discountAmount || 0).toFixed(2)}`);
    auditDetails.push(`Tax Amount: ₹${Number(invoice.taxAmount || 0).toFixed(2)} -> ₹${Number(taxAmount || 0).toFixed(2)}`);
    auditDetails.push(`Grand Total: ₹${Number(oldGrandTotal || 0).toFixed(2)} -> ₹${Number(grandTotal || 0).toFixed(2)}`);

    auditDetails.push('\n[Item Changes]');
    for (const oldItem of invoice.items) {
      const newItem = (items || []).find(it => it.medicineId === oldItem.medicineId && it.batchNo === oldItem.batchNo);
      if (!newItem) {
        auditDetails.push(`- Removed: ${oldItem.medicine?.name || 'Item'} (Batch: ${oldItem.batchNo}) | Qty: ${oldItem.qty}`);
      } else {
        const qtyDiff = Number(newItem.qty) - Number(oldItem.qty);
        const rateDiff = Number(newItem.rate) - Number(oldItem.rate);
        if (qtyDiff !== 0 || rateDiff !== 0) {
          auditDetails.push(`* Modified: ${oldItem.medicine?.name || 'Item'} (Batch: ${oldItem.batchNo}) | Qty: ${oldItem.qty} -> ${newItem.qty} | Rate: ₹${oldItem.rate} -> ₹${newItem.rate}`);
        }
      }
    }
    for (const newItem of (items || [])) {
      const oldItem = invoice.items.find(it => it.medicineId === newItem.medicineId && it.batchNo === newItem.batchNo);
      if (!oldItem) {
        auditDetails.push(`+ Added: ${newItem.medicineName || 'Item'} (Batch: ${newItem.batchNo}) | Qty: ${newItem.qty} | Rate: ₹${newItem.rate}`);
      }
    }

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'UPDATE', 'Sales', auditDetails.join('\n'));

    await t.commit();

    const full = await SaleInvoice.findOne({
      where: { id: invoice.id },
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items', include: [{ model: Medicine, as: 'medicine' }] },
      ],
    });
    return success(res, full, 'Invoice updated successfully');
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const cancel = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const record = await SaleInvoice.findOne({
      where: { id: req.params.id, isDeleted: false },
      include: [{ model: SaleItem, as: 'items' }],
      transaction: t,
    });
    if (!record || record.status === 'cancelled') {
      await t.rollback();
      return notFound(res);
    }

    await record.update({ status: 'cancelled', updatedBy: req.user?.id }, { transaction: t });

    for (const item of record.items) {
      if (item.batchId) {
        const batch = await Batch.findByPk(item.batchId, { transaction: t });
        if (batch) await batch.increment('qty', { by: item.qty + (item.free || 0), transaction: t });
      }
    }

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'CANCEL', 'Sales', `Cancelled sale bill ${record.invoiceNo}`);

    await t.commit();
    return success(res, null, 'Invoice cancelled and stock restored');
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { getAll, getById, create, update, cancel };
