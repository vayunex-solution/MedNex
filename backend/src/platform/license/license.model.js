'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const License = sequelize.define('License', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  licenseKey: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  licenseType: { type: DataTypes.STRING(50), defaultValue: 'Standard' },
  maxUsers: { type: DataTypes.INTEGER, defaultValue: 5 },
  maxBranches: { type: DataTypes.INTEGER, defaultValue: 1 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  expiresAt: { type: DataTypes.DATE },
}, { tableName: 'plat_licenses' });

module.exports = License;
