'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationApiKey = sequelize.define('ApplicationApiKey', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  key: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  secret: { type: DataTypes.STRING(255) },
  name: { type: DataTypes.STRING(150), allowNull: false },
  scopes: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('active', 'revoked', 'expired'), defaultValue: 'active', allowNull: false },
  expiresAt: { type: DataTypes.DATE },
  lastUsedAt: { type: DataTypes.DATE },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_api_keys',
  timestamps: true,
});

module.exports = ApplicationApiKey;
