'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const PasswordReset = sequelize.define('PasswordReset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  tokenHash: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  isUsed: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'plat_password_resets' });

module.exports = PasswordReset;
