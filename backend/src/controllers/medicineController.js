'use strict';

const { Medicine, MedicineCompany, MedicineCategory, HsnCode, GstSlab, Rack, Unit } = require('../models');
const { createCrudController } = require('./crudController');
const { success, created, notFound } = require('../helpers/response');
const { buildWhere, getPagination } = require('../helpers/queryHelper');
const path = require('path');

const include = [
  { model: MedicineCompany, as: 'company', attributes: ['id', 'name'] },
  { model: MedicineCategory, as: 'category', attributes: ['id', 'name'] },
  { model: HsnCode, as: 'hsn', attributes: ['id', 'hsnCode'] },
  { model: GstSlab, as: 'gstSlab', attributes: ['id', 'slab', 'cgst', 'sgst'] },
  { model: Rack, as: 'rack', attributes: ['id', 'name'] },
  { model: Unit, as: 'unit', attributes: ['id', 'name', 'shortName'] },
];

const base = createCrudController(Medicine, {
  searchFields: ['name', 'genericName', 'barcode'],
  include,
});

const create = async (req, res) => {
  const data = { ...req.body, createdBy: req.user?.id };
  if (req.file) data.image = `/uploads/${req.file.filename}`;
  const record = await Medicine.create(data);
  return created(res, record);
};

const update = async (req, res) => {
  const record = await Medicine.findOne({ where: { id: req.params.id, isDeleted: false } });
  if (!record) return notFound(res);
  const data = { ...req.body, updatedBy: req.user?.id };
  if (req.file) data.image = `/uploads/${req.file.filename}`;
  await record.update(data);
  return success(res, record, 'Updated successfully');
};

module.exports = {
  getAll: base.getAll,
  getById: base.getById,
  create,
  update,
  remove: base.remove,
  listAll: base.listAll,
};
