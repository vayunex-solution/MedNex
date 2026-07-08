'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.STRING(191), allowNull: false },
  sessionId: { type: DataTypes.BIGINT, allowNull: true },
  token: { type: DataTypes.TEXT, allowNull: false }, // Will hold SHA-256 token hash
  parentHash: { type: DataTypes.STRING(255), allowNull: true },
  familyRootHash: { type: DataTypes.STRING(255), allowNull: true },
  isRevoked: { type: DataTypes.BOOLEAN, defaultValue: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'plat_refresh_tokens' });

module.exports = RefreshToken;
