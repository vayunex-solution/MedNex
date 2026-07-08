'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const LoginHistory = sequelize.define('LoginHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  emailUsed: { type: DataTypes.STRING(150), allowNull: false },
  ipAddress: { type: DataTypes.STRING(50) },
  userAgent: { type: DataTypes.STRING(255) },
  status: { type: DataTypes.ENUM('success', 'failed'), defaultValue: 'success' },
}, { 
  tableName: 'plat_login_histories',
  updatedAt: false, // only createdAt (attemptedAt)
});

module.exports = LoginHistory;
