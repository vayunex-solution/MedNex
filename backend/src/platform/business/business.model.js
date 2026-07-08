'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Business = sequelize.define('Business', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  legalName: { type: DataTypes.STRING(200), allowNull: true },
  displayName: { type: DataTypes.STRING(200), allowNull: true },
  businessCode: { type: DataTypes.STRING(50), allowNull: true },
  slug: { type: DataTypes.STRING(100), unique: true, allowNull: true },
  email: { type: DataTypes.STRING(191), unique: true, allowNull: true },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  industry: { type: DataTypes.STRING(100), allowNull: true },
  businessType: { type: DataTypes.STRING(100), allowNull: true },
  currency: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'INR' },
  timezone: { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'Asia/Kolkata' },
  locale: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'en-US' },
  language: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'en' },
  website: { type: DataTypes.STRING(191), allowNull: true },
  taxNumber: { type: DataTypes.STRING(100), allowNull: true },
  registrationNumber: { type: DataTypes.STRING(100), allowNull: true },
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
}, { tableName: 'plat_businesses', version: true });

module.exports = Business;
