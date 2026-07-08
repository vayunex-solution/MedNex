'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const LoginRateLimit = sequelize.define('LoginRateLimit', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  attemptKey: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  attemptsCount: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false },
  lockExpiry: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'plat_login_rate_limits' });

module.exports = LoginRateLimit;
