'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BranchContact = sequelize.define('BranchContact', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  branchId: { type: DataTypes.INTEGER, allowNull: false },
  email: { type: DataTypes.STRING(191), allowNull: true },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  alternatePhone: { type: DataTypes.STRING(30), allowNull: true },
  website: { type: DataTypes.STRING(191), allowNull: true },
}, { tableName: 'plat_branch_contacts' });

module.exports = BranchContact;
