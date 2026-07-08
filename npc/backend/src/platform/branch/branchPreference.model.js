'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BranchPreference = sequelize.define('BranchPreference', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'plat_branches', key: 'id' },
  },
  key: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: true },
  datatype: {
    type: DataTypes.ENUM('string', 'boolean', 'integer', 'float', 'json'),
    defaultValue: 'string',
    allowNull: false,
  },
  category: { type: DataTypes.STRING(50), defaultValue: 'general', allowNull: false },
}, { tableName: 'plat_branch_preferences' });

module.exports = BranchPreference;
