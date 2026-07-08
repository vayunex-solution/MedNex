'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id:        { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
  uuid:      { type: DataTypes.UUID,         defaultValue: DataTypes.UUIDV4 },
  name:      { type: DataTypes.STRING(150),  allowNull: false },
  email:     { type: DataTypes.STRING(150),  allowNull: false, unique: true },
  password:  { type: DataTypes.STRING(255),  allowNull: false },
  role:      { type: DataTypes.ENUM('super_admin', 'admin', 'pharmacist', 'cashier'), defaultValue: 'cashier' },
  userType:  { type: DataTypes.STRING(50) },
  status:    { type: DataTypes.STRING(50),   defaultValue: 'active' },
  isActive:  { type: DataTypes.BOOLEAN,      defaultValue: true },
  isDeleted: { type: DataTypes.BOOLEAN,      defaultValue: false },
  isMfaEnabled:     { type: DataTypes.BOOLEAN, defaultValue: false },
  failedAttempts:   { type: DataTypes.INTEGER, defaultValue: 0 },
  lastLoginAt:      { type: DataTypes.DATE },
  lastLoginIp:      { type: DataTypes.STRING(45) },
  passwordChangedAt:{ type: DataTypes.DATE },
  deletedAt:        { type: DataTypes.DATE },
}, { tableName: 'users', paranoid: false });

module.exports = {
  User,
};
