'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Branch = sequelize.define('Branch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  branchCode: { type: DataTypes.STRING(50), allowNull: true },
  slug: { type: DataTypes.STRING(100), allowNull: true, unique: true },
  email: { type: DataTypes.STRING(191), allowNull: true, unique: true },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  status: {
    type: DataTypes.ENUM('provisioning', 'active', 'suspended', 'archived', 'deleted'),
    defaultValue: 'active',
    allowNull: false,
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  archivedAt: { type: DataTypes.DATE, allowNull: true },
  activatedAt: { type: DataTypes.DATE, allowNull: true },
  suspendedAt: { type: DataTypes.DATE, allowNull: true },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
  createdBy: { type: DataTypes.STRING(191), allowNull: true },
  updatedBy: { type: DataTypes.STRING(191), allowNull: true },
  version: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false },
}, { 
  tableName: 'plat_branches',
  timestamps: true,
});

module.exports = Branch;
