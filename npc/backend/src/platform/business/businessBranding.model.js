'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BusinessBranding = sequelize.define('BusinessBranding', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  logo: { type: DataTypes.STRING(255), allowNull: true },
  darkLogo: { type: DataTypes.STRING(255), allowNull: true },
  favicon: { type: DataTypes.STRING(255), allowNull: true },
  primaryColor: { type: DataTypes.STRING(20), defaultValue: '#0052CC' },
  secondaryColor: { type: DataTypes.STRING(20), defaultValue: '#0065FF' },
  theme: { type: DataTypes.STRING(20), defaultValue: 'light' },
  emailHeaderLogo: { type: DataTypes.STRING(255), allowNull: true },
  emailFooterLogo: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'plat_business_branding' });

module.exports = BusinessBranding;
