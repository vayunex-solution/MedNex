'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserMembership = sequelize.define('UserMembership', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  userId: { type: DataTypes.STRING(191), allowNull: false },
  tenantId: { type: DataTypes.BIGINT, allowNull: false },
  businessId: { type: DataTypes.BIGINT, allowNull: false },
  branchId: { type: DataTypes.BIGINT, allowNull: false },
  roleId: { type: DataTypes.BIGINT, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'pending', 'suspended'), defaultValue: 'active', allowNull: false },
}, { tableName: 'plat_user_memberships' });

module.exports = UserMembership;
