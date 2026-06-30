'use strict';

const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { createCrudController } = require('./crudController');
const { success, created, notFound, badRequest } = require('../helpers/response');
const { buildWhere, getPagination } = require('../helpers/queryHelper');

const base = createCrudController(User, {
  searchFields: ['name', 'email', 'phone'],
  attributes: { exclude: ['password', 'refreshToken'] },
  beforeCreate: async (data) => {
    if (!data.password) throw new Error('Password is required');
    data.password = await bcrypt.hash(data.password, 12);
  },
  beforeUpdate: async (data) => {
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
    else delete data.password;
  },
});

module.exports = {
  getAll: base.getAll,
  getById: base.getById,
  create: base.create,
  update: base.update,
  remove: base.remove,
  listAll: base.listAll,
};
