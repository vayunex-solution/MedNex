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

    await t.commit();
    return success(res, null, 'Invoice cancelled and stock restored');
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { getAll, getById, create, cancel };
