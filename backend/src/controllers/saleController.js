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

    let subtotal = 0, cgstAmount = 0, sgstAmount = 0, taxAmount = 0;

    const processedItems = items.map((item) => {
      const taxable = (item.rate * item.qty) * (1 - (item.discount || 0) / 100);
      const cgst = taxable * ((item.cgst || 0) / 100);
      const sgst = taxable * ((item.sgst || 0) / 100);
      const gstAmount = cgst + sgst;
      const amount = taxable + gstAmount;
      subtotal += taxable;
      cgstAmount += cgst;
      sgstAmount += sgst;
      taxAmount += gstAmount;
      return { ...item, gstAmount, amount };
    });

    const grandTotal = subtotal + taxAmount + (invoiceData.roundOff || 0);

    const invoice = await SaleInvoice.create({
      ...invoiceData, invoiceNo, subtotal, cgstAmount, sgstAmount, taxAmount, grandTotal, createdBy: req.user?.id,
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
  const record = await SaleInvoice.findOne({ where: { id: req.params.id, isDeleted: false } });
  if (!record) return notFound(res);
  await record.update({ status: 'cancelled', updatedBy: req.user?.id });
  return success(res, null, 'Invoice cancelled');
};

module.exports = { getAll, getById, create, cancel };
