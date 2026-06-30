'use strict';

const { Batch, Medicine, MedicineCompany, MedicineCategory, StockAdjustment, sequelize } = require('../models');
const { Op } = require('sequelize');
const { success, created, notFound } = require('../helpers/response');
const { buildWhere, getPagination } = require('../helpers/queryHelper');

const getCurrentStock = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const data = await sequelize.query(`
    SELECT m.id, m.name, m.genericName, m.barcode, m.reorderLevel, m.minStock,
           mc.name as categoryName, comp.name as companyName,
           COALESCE(SUM(b.qty), 0) as currentStock,
           m.mrp, m.saleRate
    FROM medicines m
    LEFT JOIN medicine_categories mc ON m.categoryId = mc.id
    LEFT JOIN medicine_companies comp ON m.companyId = comp.id
    LEFT JOIN batches b ON m.id = b.medicineId AND b.isDeleted = 0 AND b.qty > 0
    WHERE m.isDeleted = 0 AND m.isActive = 1
    ${req.query.search ? `AND (m.name LIKE :search OR m.genericName LIKE :search OR m.barcode LIKE :search)` : ''}
    GROUP BY m.id
    ORDER BY m.name
    LIMIT :limit OFFSET :offset
  `, {
    replacements: { limit, offset, search: req.query.search ? `%${req.query.search}%` : undefined },
    type: sequelize.QueryTypes.SELECT,
  });
  return success(res, data);
};

const getBatchWiseStock = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const rows = await Batch.findAll({
    where: { isDeleted: false, qty: { [Op.gt]: 0 } },
    include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name', 'genericName'] }],
    order: [['expiryDate', 'ASC']],
    limit, offset,
  });
  return success(res, rows);
};

const getExpiryStock = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const rows = await Batch.findAll({
    where: { isDeleted: false, expiryDate: { [Op.lt]: today }, qty: { [Op.gt]: 0 } },
    include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name'] }],
    order: [['expiryDate', 'ASC']],
  });
  return success(res, rows);
};

const getNearExpiry = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const days = parseInt(req.query.days || '90');
  const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
  const rows = await Batch.findAll({
    where: { isDeleted: false, expiryDate: { [Op.between]: [today, future] }, qty: { [Op.gt]: 0 } },
    include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name'] }],
    order: [['expiryDate', 'ASC']],
  });
  return success(res, rows);
};

const createAdjustment = async (req, res) => {
  const adj = await StockAdjustment.create({ ...req.body, createdBy: req.user?.id, date: req.body.date || new Date() });
  if (req.body.batchId) {
    const batch = await Batch.findByPk(req.body.batchId);
    if (batch) {
      if (['increase'].includes(req.body.adjustmentType)) await batch.increment('qty', { by: req.body.qty });
      else await batch.decrement('qty', { by: req.body.qty });
    }
  }
  return created(res, adj);
};

module.exports = { getCurrentStock, getBatchWiseStock, getExpiryStock, getNearExpiry, createAdjustment };
