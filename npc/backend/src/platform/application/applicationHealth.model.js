'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationHealth = sequelize.define('ApplicationHealth', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'online', allowNull: false },
  responseTime: { type: DataTypes.INTEGER },
  heartbeatAt: { type: DataTypes.DATE },
  uptimeScore: { type: DataTypes.FLOAT, defaultValue: 100.0, allowNull: false },
  healthScore: { type: DataTypes.FLOAT, defaultValue: 100.0, allowNull: false }, // APP-214
  lastError: { type: DataTypes.TEXT },
}, { 
  tableName: 'plat_application_health',
  timestamps: true,
});

module.exports = ApplicationHealth;
