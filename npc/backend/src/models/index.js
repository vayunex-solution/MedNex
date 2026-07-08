'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('super_admin','admin','pharmacist','cashier'), defaultValue: 'cashier' },
  phone: { type: DataTypes.STRING(20) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  refreshToken: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'users' });

module.exports = {
  User,
};
