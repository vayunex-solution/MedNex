'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationRateLimit = sequelize.define('ApplicationRateLimit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  limit: { type: DataTypes.INTEGER, defaultValue: 1000, allowNull: false },
  burstLimit: { type: DataTypes.INTEGER, defaultValue: 60, allowNull: false },
  period: { type: DataTypes.STRING(50), defaultValue: 'day', allowNull: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_rate_limits',
  timestamps: true,
});

module.exports = ApplicationRateLimit;
