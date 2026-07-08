'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationLog = sequelize.define('ApplicationLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  level: { type: DataTypes.STRING(50), defaultValue: 'info', allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  meta: { type: DataTypes.TEXT },
}, { 
  tableName: 'plat_application_logs',
  updatedAt: false,
  timestamps: true,
});

module.exports = ApplicationLog;
