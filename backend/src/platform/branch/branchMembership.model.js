'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BranchMembership = sequelize.define('BranchMembership', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'plat_branches', key: 'id' },
  },
  userId: { type: DataTypes.STRING(191), allowNull: false },
  role: {
    type: DataTypes.ENUM('manager', 'staff'),
    defaultValue: 'staff',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
    allowNull: false,
  },
}, { tableName: 'plat_branch_memberships' });

module.exports = BranchMembership;
