'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserSession = sequelize.define('UserSession', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  userId: { type: DataTypes.STRING(191), allowNull: false },
  deviceFingerprint: { type: DataTypes.STRING(255) },
  ipAddress: { type: DataTypes.STRING(50) },
  userAgent: { type: DataTypes.STRING(255) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.ENUM('active', 'expired', 'terminated'), defaultValue: 'active', allowNull: false },
  lastActiveAt: { type: DataTypes.DATE },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'plat_user_sessions' });

module.exports = UserSession;
