'use strict';

const { sequelize, SaleInvoice, SaleItem, PurchaseInvoice, PurchaseItem, Medicine, Customer, Supplier } = require('../models');
const { Op } = require('sequelize');
const { success } = require('../helpers/response');

const getSalesReport = async (req, res) => {
  const { from, to } = req.query;
  const where = { isDeleted: false, status: 'completed' };
  if (from) where.invoiceDate = { ...where.invoiceDate, [Op.gte]: from };
  if (to) where.invoiceDate = { ...where.invoiceDate, [Op.lte]: to };
  const data = await SaleInvoice.findAll({ where, include: [{ model: Customer, as: 'customer', attributes: ['name'] }], order: [['invoiceDate', 'ASC']] });
  return success(res, data);
};

const getPurchaseReport = async (req, res) => {
  const { from, to } = req.query;
  const where = { isDeleted: false, status: 'completed' };
  if (from) where.invoiceDate = { ...where.invoiceDate, [Op.gte]: from };
  if (to) where.invoiceDate = { ...where.invoiceDate, [Op.lte]: to };
  const data = await PurchaseInvoice.findAll({ where, include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }], order: [['invoiceDate', 'ASC']] });
  return success(res, data);
};

const getGstReport = async (req, res) => {
  const { from, to } = req.query;
  const data = await sequelize.query(`
    SELECT si.hsnCode, si.cgst as cgstRate, si.sgst as sgstRate,
           SUM(si.qty * si.rate * (1 - si.discount/100)) as taxable,
           SUM(si.gstAmount * si.cgst / (si.cgst + si.sgst)) as cgstAmt,
           SUM(si.gstAmount * si.sgst / (si.cgst + si.sgst)) as sgstAmt,
           SUM(si.gstAmount) as totalGst
    FROM sale_items si
    JOIN sale_invoices s ON si.saleId = s.id
    WHERE s.isDeleted = 0 AND s.status = 'completed'
    ${from ? 'AND s.invoiceDate >= :from' : ''}
    ${to ? 'AND s.invoiceDate <= :to' : ''}
    GROUP BY si.hsnCode, si.cgst, si.sgst
  `, { replacements: { from, to }, type: sequelize.QueryTypes.SELECT });
  return success(res, data);
};

const getProfitReport = async (req, res) => {
  const { from, to } = req.query;
  const data = await sequelize.query(`
    SELECT 
      DATE(s.invoiceDate) as date,
      SUM(s.grandTotal) as sales,
      COALESCE((SELECT SUM(p.grandTotal) FROM purchase_invoices p WHERE p.isDeleted=0 AND DATE(p.invoiceDate) = DATE(s.invoiceDate)), 0) as purchases
    FROM sale_invoices s
    WHERE s.isDeleted = 0 AND s.status = 'completed'
    ${from ? 'AND s.invoiceDate >= :from' : ''}
    ${to ? 'AND s.invoiceDate <= :to' : ''}
    GROUP BY DATE(s.invoiceDate)
    ORDER BY date
  `, { replacements: { from, to }, type: sequelize.QueryTypes.SELECT });
  return success(res, data);
};

const getCustomerLedger = async (req, res) => {
  const { customerId, from, to } = req.query;
  const where = { isDeleted: false };
  if (customerId) where.customerId = customerId;
  if (from) where.invoiceDate = { ...where.invoiceDate, [Op.gte]: from };
  if (to) where.invoiceDate = { ...where.invoiceDate, [Op.lte]: to };
  const data = await SaleInvoice.findAll({ where, include: [{ model: Customer, as: 'customer', attributes: ['name', 'phone'] }], order: [['invoiceDate', 'ASC']] });
  return success(res, data);
};

const getSupplierLedger = async (req, res) => {
  const { supplierId, from, to } = req.query;
  const where = { isDeleted: false };
  if (supplierId) where.supplierId = supplierId;
  if (from) where.invoiceDate = { ...where.invoiceDate, [Op.gte]: from };
  if (to) where.invoiceDate = { ...where.invoiceDate, [Op.lte]: to };
  const data = await PurchaseInvoice.findAll({ where, include: [{ model: Supplier, as: 'supplier', attributes: ['name', 'phone'] }], order: [['invoiceDate', 'ASC']] });
  return success(res, data);
};

module.exports = { getSalesReport, getPurchaseReport, getGstReport, getProfitReport, getCustomerLedger, getSupplierLedger };
