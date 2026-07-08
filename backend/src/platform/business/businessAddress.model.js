'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BusinessAddress = sequelize.define('BusinessAddress', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'plat_businesses', key: 'id' },
  },
  addressLine1: { type: DataTypes.STRING(255), allowNull: true },
  addressLine2: { type: DataTypes.STRING(255), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  state: { type: DataTypes.STRING(100), allowNull: true },
  country: { type: DataTypes.STRING(100), allowNull: true },
  postalCode: { type: DataTypes.STRING(20), allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  addressType: {
    type: DataTypes.ENUM('head_office', 'registered', 'billing', 'shipping', 'branch'),
    defaultValue: 'registered',
    allowNull: false,
  },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
}, { tableName: 'plat_business_addresses' });

module.exports = BusinessAddress;
