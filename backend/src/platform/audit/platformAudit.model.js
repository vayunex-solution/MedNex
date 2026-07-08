'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const PlatformAudit = sequelize.define('PlatformAudit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  action: { type: DataTypes.STRING(100), allowNull: false },
  module: { type: DataTypes.STRING(100), allowNull: false },
  details: { type: DataTypes.TEXT },
  ipAddress: { type: DataTypes.STRING(50) },
  recordHash: { type: DataTypes.CHAR(64), allowNull: true },
  previousHash: { type: DataTypes.CHAR(64), allowNull: true },
  correlationId: { type: DataTypes.CHAR(36), allowNull: true },
  beforeValue: { type: DataTypes.TEXT, allowNull: true },
  afterValue: { type: DataTypes.TEXT, allowNull: true },
  userAgent: { type: DataTypes.STRING(255), allowNull: true },
  operationReason: { type: DataTypes.TEXT, allowNull: true },
}, { 
  tableName: 'plat_platform_audits',
  updatedAt: false,
});

module.exports = PlatformAudit;
