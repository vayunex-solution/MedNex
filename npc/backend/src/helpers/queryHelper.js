'use strict';

const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');

/**
 * Build Sequelize WHERE clause for soft-delete + search
 */
const buildWhere = (query, searchFields = [], extraWhere = {}) => {
  const { Op } = require('sequelize');
  const where = { isDeleted: false, ...extraWhere };
  if (query.search && searchFields.length > 0) {
    where[Op.or] = searchFields.map((f) => ({ [f]: { [Op.like]: `%${query.search}%` } }));
  }
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  return where;
};

/**
 * Get pagination options from query
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, parseInt(query.limit || '20'));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

module.exports = { buildWhere, getPagination };
