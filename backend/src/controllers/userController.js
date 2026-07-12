'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const sequelize = require('../config/database');
const UserMembership = require('../platform/identity/userMembership.model');
const { success, created, paginated, notFound, badRequest, forbidden } = require('../helpers/response');
const { buildWhere, getPagination } = require('../helpers/queryHelper');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = buildWhere(req.query, ['name', 'email', 'phone'], { isDeleted: false });

  // Tenant Isolation: Non-super_admins only see users belonging to their tenant
  if (req.user && req.user.role !== 'super_admin') {
    const tenantId = req.user.tenantId || -1;
    const memberships = await UserMembership.findAll({
      where: { tenantId, status: 'active' },
      attributes: ['userId']
    });
    const userIds = memberships.map(m => m.userId);
    where.id = { [Op.in]: userIds };
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password', 'refreshToken'] },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });
  return paginated(res, rows, count, page, limit);
};

const getById = async (req, res) => {
  const where = { id: req.params.id, isDeleted: false };

  // Tenant Isolation Check
  if (req.user && req.user.role !== 'super_admin') {
    const tenantId = req.user.tenantId || -1;
    const membership = await UserMembership.findOne({
      where: { userId: req.params.id, tenantId, status: 'active' }
    });
    if (!membership) return forbidden(res, 'You do not have permission to access this user');
  }

  const record = await User.findOne({
    where,
    attributes: { exclude: ['password', 'refreshToken'] }
  });
  if (!record) return notFound(res);
  return success(res, record);
};

const create = async (req, res) => {
  const data = { ...req.body, createdBy: req.user?.id };
  if (!data.password) return badRequest(res, 'Password is required');
  
  data.password = await bcrypt.hash(data.password, 12);
  data.uuid = crypto.randomUUID();
  data.isActive = true;
  data.status = 'active';

  const t = await sequelize.transaction();
  try {
    const record = await User.create(data, { transaction: t });

    // Link user to the tenant
    if (req.user && req.user.tenantId) {
      await UserMembership.create({
        uuid: crypto.randomUUID(),
        userId: record.id,
        tenantId: req.user.tenantId,
        businessId: req.user.businessId || 1,
        branchId: req.user.branchId || 1,
        roleId: data.role === 'admin' ? 2 : 4, // 2: admin, 4: employee/pharmacist
        status: 'active',
      }, { transaction: t });
    }

    await t.commit();

    const json = record.toJSON();
    delete json.password;
    delete json.refreshToken;
    return created(res, json);
  } catch (err) {
    await t.rollback();
    return badRequest(res, err.message);
  }
};

const update = async (req, res) => {
  const record = await User.findOne({ where: { id: req.params.id, isDeleted: false } });
  if (!record) return notFound(res);

  // Tenant Isolation Check
  if (req.user && req.user.role !== 'super_admin') {
    const tenantId = req.user.tenantId || -1;
    const membership = await UserMembership.findOne({
      where: { userId: record.id, tenantId, status: 'active' }
    });
    if (!membership) return forbidden(res, 'You do not have permission to modify this user');
  }

  const data = { ...req.body, updatedBy: req.user?.id };
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  } else {
    delete data.password;
  }

  // Use raw SQL for status updates to avoid Sequelize ORM column mismatch
  if (data.status) {
    await sequelize.query(
      'UPDATE users SET status = ?, updatedAt = NOW() WHERE id = ?',
      { replacements: [data.status, record.id] }
    );
    // Also sync membership status for suspension
    if (data.status === 'suspended' && req.user?.tenantId) {
      await UserMembership.update(
        { status: 'suspended' },
        { where: { userId: record.id, tenantId: req.user.tenantId } }
      );
    } else if (data.status === 'active' && req.user?.tenantId) {
      await UserMembership.update(
        { status: 'active' },
        { where: { userId: record.id, tenantId: req.user.tenantId } }
      );
    }
    return success(res, { id: record.id, status: data.status }, 'Updated successfully');
  }

  // For non-status updates, use ORM but remove problematic fields
  delete data.status;
  delete data.isActive;
  await record.update(data);
  const json = record.toJSON();
  delete json.password;
  delete json.refreshToken;
  return success(res, json, 'Updated successfully');
};

const remove = async (req, res) => {
  const record = await User.findOne({ where: { id: req.params.id, isDeleted: false } });
  if (!record) return notFound(res);

  // Tenant Isolation Check
  if (req.user && req.user.role !== 'super_admin') {
    const tenantId = req.user.tenantId || -1;
    const membership = await UserMembership.findOne({
      where: { userId: record.id, tenantId, status: 'active' }
    });
    if (!membership) return forbidden(res, 'You do not have permission to delete this user');
  }

  const t = await sequelize.transaction();
  try {
    await record.update({ isDeleted: true, updatedBy: req.user?.id }, { transaction: t });

    if (req.user && req.user.tenantId) {
      await UserMembership.update(
        { status: 'suspended' },
        { where: { userId: record.id, tenantId: req.user.tenantId }, transaction: t }
      );
    }

    await t.commit();
    return success(res, null, 'Deleted successfully');
  } catch (err) {
    await t.rollback();
    return badRequest(res, err.message);
  }
};

const listAll = async (req, res) => {
  const where = { isDeleted: false };

  // Tenant Isolation: Non-super_admins only see users belonging to their tenant
  if (req.user && req.user.role !== 'super_admin' && req.user.tenantId) {
    const memberships = await UserMembership.findAll({
      where: { tenantId: req.user.tenantId, status: 'active' },
      attributes: ['userId']
    });
    const userIds = memberships.map(m => m.userId);
    where.id = { [Op.in]: userIds };
  }

  const rows = await User.findAll({
    where,
    attributes: { exclude: ['password', 'refreshToken'] },
    order: [['name', 'ASC']]
  });
  return success(res, rows);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  listAll,
};
