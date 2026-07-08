'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BranchMetadata = sequelize.define('BranchMetadata', {
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
}, { tableName: 'plat_branch_metadata' });

module.exports = BranchMetadata;
