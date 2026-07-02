'use strict';

/**
 * Generic CRUD controller factory.
 * Usage: const ctrl = createCrudController(Model, options)
 */
const { success, created, paginated, notFound, badRequest } = require('../helpers/response');
const { buildWhere, getPagination } = require('../helpers/queryHelper');
const { Op } = require('sequelize');

const createCrudController = (Model, options = {}) => {
  const {
    searchFields = ['name'],
    include = [],
    attributes,
    beforeCreate,
    beforeUpdate,
    afterCreate,
    afterUpdate,
  } = options;

  const getAll = async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = buildWhere(req.query, searchFields, options.extraWhere || {});
    const { count, rows } = await Model.findAndCountAll({
      where,
      include,
      attributes,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    return paginated(res, rows, count, page, limit);
  };

  const getById = async (req, res) => {
    const record = await Model.findOne({ where: { id: req.params.id, isDeleted: false }, include, attributes });
    if (!record) return notFound(res);
    return success(res, record);
  };

  const create = async (req, res) => {
    const data = { ...req.body, createdBy: req.user?.id };
    if (beforeCreate) await beforeCreate(data, req);
    const record = await Model.create(data);
    if (afterCreate) await afterCreate(record, req);
    return created(res, record);
  };

  const update = async (req, res) => {
    const record = await Model.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!record) return notFound(res);
    const data = { ...req.body, updatedBy: req.user?.id };
    if (beforeUpdate) await beforeUpdate(data, req, record);
    await record.update(data);
    if (afterUpdate) await afterUpdate(record, req);
    return success(res, record, 'Updated successfully');
  };

  const remove = async (req, res) => {
    const record = await Model.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!record) return notFound(res);
    await record.update({ isDeleted: true, updatedBy: req.user?.id });
    return success(res, null, 'Deleted successfully');
  };

  const listAll = async (req, res) => {
    let orderField = 'id';
    if (Model.rawAttributes.name) orderField = 'name';
    else if (Model.rawAttributes.hsnCode) orderField = 'hsnCode';
    else if (Model.rawAttributes.slab) orderField = 'slab';
    
    const rows = await Model.findAll({ where: { isDeleted: false, isActive: true }, include, attributes, order: [[orderField, 'ASC']] });
    return success(res, rows);
  };

  return { getAll, getById, create, update, remove, listAll };
};

module.exports = { createCrudController };
