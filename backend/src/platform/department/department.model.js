'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  branchId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'plat_departments' });

module.exports = Department;
