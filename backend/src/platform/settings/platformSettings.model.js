'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const PlatformSettings = sequelize.define('PlatformSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  value: { type: DataTypes.TEXT },
  description: { type: DataTypes.TEXT },
}, { tableName: 'plat_platform_settings' });

module.exports = PlatformSettings;
