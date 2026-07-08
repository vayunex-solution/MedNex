'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Application = sequelize.define('Application', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  displayName: { type: DataTypes.STRING(150) },
  slug: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  description: { type: DataTypes.TEXT },
  logo: { type: DataTypes.STRING(255) },
  icon: { type: DataTypes.STRING(50) },
  theme: { type: DataTypes.STRING(50) },
  category: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.ENUM('active', 'suspended', 'archived'), defaultValue: 'active', allowNull: false },
  ownerUserId: { type: DataTypes.INTEGER, allowNull: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: true },
  businessId: { type: DataTypes.INTEGER, allowNull: true },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  productionUrl: { type: DataTypes.STRING(255) },
  stagingUrl: { type: DataTypes.STRING(255) },
  developmentUrl: { type: DataTypes.STRING(255) },
  sdkVersion: { type: DataTypes.STRING(50), defaultValue: '1.0.0' },
  manifest: { type: DataTypes.TEXT }, // APP-201
  pluginConfig: { type: DataTypes.TEXT }, // APP-213
  marketplaceConfig: { type: DataTypes.TEXT }, // APP-211
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_applications',
  timestamps: true,
});

module.exports = Application;
