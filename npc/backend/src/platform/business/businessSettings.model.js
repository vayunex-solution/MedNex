'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BusinessSettings = sequelize.define('BusinessSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'plat_businesses', key: 'id' },
  },
  key: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: true },
  datatype: {
    type: DataTypes.ENUM('string', 'boolean', 'integer', 'float', 'json'),
    defaultValue: 'string',
    allowNull: false,
  },
  category: { type: DataTypes.STRING(50), defaultValue: 'general', allowNull: false },
}, { tableName: 'plat_business_settings' });

module.exports = BusinessSettings;
