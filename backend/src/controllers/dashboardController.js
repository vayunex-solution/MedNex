'use strict';

const { sequelize, SaleInvoice, PurchaseInvoice, Batch, Medicine, Customer, Supplier } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { success } = require('../helpers/response');

const getStats = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [
    todaySales, todayPurchase, monthSales,
    totalCustomers, totalSuppliers,
    lowStock, expiredBatches, nearExpiryBatches,
  ] = await Promise.all([
    SaleInvoice.sum('grandTotal', { where: { invoiceDate: today, isDeleted: false, status: 'completed' } }),
    PurchaseInvoice.sum('grandTotal', { where: { invoiceDate: today, isDeleted: false, status: 'completed' } }),
    SaleInvoice.sum('grandTotal', { where: { invoiceDate: { [Op.gte]: startOfMonth }, isDeleted: false, status: 'completed' } }),
    Customer.count({ where: { isDeleted: false } }),
    Supplier.count({ where: { isDeleted: false } }),
    sequelize.query(`
      SELECT COUNT(*) as cnt FROM medicines m
      LEFT JOIN (SELECT medicineId, SUM(qty) as totalQty FROM batches WHERE isDeleted=0 GROUP BY medicineId) b ON m.id = b.medicineId
      WHERE m.isDeleted = 0 AND m.isActive = 1 AND (b.totalQty IS NULL OR b.totalQty <= m.reorderLevel)
    `, { type: sequelize.QueryTypes.SELECT }),
    Batch.count({ where: { isDeleted: false, expiryDate: { [Op.lt]: today } } }),
    Batch.count({ where: { isDeleted: false, expiryDate: { [Op.between]: [today, new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]] } } }),
  ]);

  // Stock value
  const stockValueResult = await sequelize.query(
    `SELECT SUM(b.qty * b.purchaseRate) as value FROM batches b WHERE b.isDeleted = 0 AND b.qty > 0`,
    { type: sequelize.QueryTypes.SELECT }
  );

  return success(res, {
    todaySales: todaySales || 0,
    todayPurchase: todayPurchase || 0,
    todayProfit: (todaySales || 0) - (todayPurchase || 0),
    monthSales: monthSales || 0,
    stockValue: stockValueResult[0]?.value || 0,
    totalCustomers,
    totalSuppliers,
    lowStock: lowStock[0]?.cnt || 0,
    expiredBatches,
    nearExpiryBatches,
  });
};

const getMonthlySalesChart = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const data = await sequelize.query(`
    SELECT MONTH(invoiceDate) as month, SUM(grandTotal) as total
    FROM sale_invoices
    WHERE YEAR(invoiceDate) = :year AND isDeleted = 0 AND status = 'completed'
    GROUP BY MONTH(invoiceDate)
    ORDER BY month
  `, { replacements: { year }, type: sequelize.QueryTypes.SELECT });
  return success(res, data);
};

const getMonthlyPurchaseChart = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const data = await sequelize.query(`
    SELECT MONTH(invoiceDate) as month, SUM(grandTotal) as total
    FROM purchase_invoices
    WHERE YEAR(invoiceDate) = :year AND isDeleted = 0 AND status = 'completed'
    GROUP BY MONTH(invoiceDate)
    ORDER BY month
  `, { replacements: { year }, type: sequelize.QueryTypes.SELECT });
  return success(res, data);
};

const getRecentSales = async (req, res) => {
  const rows = await SaleInvoice.findAll({
    where: { isDeleted: false, status: 'completed' },
    include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: 10,
    attributes: ['id', 'invoiceNo', 'invoiceDate', 'grandTotal', 'paymentMode', 'createdAt'],
  });
  return success(res, rows);
};

module.exports = { getStats, getMonthlySalesChart, getMonthlyPurchaseChart, getRecentSales };
