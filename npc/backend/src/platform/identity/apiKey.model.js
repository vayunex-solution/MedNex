'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApiKey = sequelize.define('ApiKey', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.BIGINT, allowNull: false },
  prefix: { type: DataTypes.STRING(10), allowNull: false },
  keyHash: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  label: { type: DataTypes.STRING(100), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastUsedAt: { type: DataTypes.DATE },
  revokedAt: { type: DataTypes.DATE },
  revokedReason: { type: DataTypes.STRING(255) },
  expiresAt: { type: DataTypes.DATE },
}, { tableName: 'plat_api_keys' });

module.exports = ApiKey;
