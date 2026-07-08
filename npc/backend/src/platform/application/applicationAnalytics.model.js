'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationAnalytics = sequelize.define('ApplicationAnalytics', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  date: { type: DataTypes.STRING(10), allowNull: false },
  requestsCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  errorsCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  activeUsersCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  storageBytes: { type: DataTypes.BIGINT, defaultValue: 0, allowNull: false },
  billingUnits: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00, allowNull: false }, // APP-212
}, { 
  tableName: 'plat_application_analytics',
  timestamps: true,
});

module.exports = ApplicationAnalytics;
