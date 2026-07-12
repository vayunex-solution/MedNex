'use strict';

const sequelize = require('../config/database');
const { success, badRequest } = require('../helpers/response');

const createOffer = async (req, res) => {
  const { name, description, type, value, minBillAmount = 0, holderType = 'General', startDate, endDate } = req.body;
  if (!name || !type || !value || !startDate || !endDate) {
    return badRequest(res, 'Missing required offer fields');
  }

  const tenantId = req.user.tenantId || 1;

  await sequelize.query(
    `INSERT INTO plat_offers (tenantId, name, description, type, value, minBillAmount, holderType, startDate, endDate, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    { replacements: [tenantId, name, description, type, value, minBillAmount, holderType, startDate, endDate] }
  );

  return success(res, null, 'Promotion offer created successfully');
};

const listOffers = async (req, res) => {
  const tenantId = req.user.tenantId || 1;
  const [offers] = await sequelize.query(
    'SELECT * FROM plat_offers WHERE tenantId = ? ORDER BY createdAt DESC',
    { replacements: [tenantId] }
  );
  return success(res, offers);
};

const toggleOfferStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  await sequelize.query(
    'UPDATE plat_offers SET isActive = ? WHERE id = ? AND tenantId = ?',
    { replacements: [isActive ? 1 : 0, id, req.user.tenantId || 1] }
  );
  return success(res, null, 'Promotion status updated');
};

const deleteOffer = async (req, res) => {
  const { id } = req.params;
  await sequelize.query(
    'DELETE FROM plat_offers WHERE id = ? AND tenantId = ?',
    { replacements: [id, req.user.tenantId || 1] }
  );
  return success(res, null, 'Promotion deleted');
};

module.exports = { createOffer, listOffers, toggleOfferStatus, deleteOffer };
