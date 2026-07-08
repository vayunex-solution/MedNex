'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BusinessMembership = sequelize.define('BusinessMembership', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'plat_businesses', key: 'id' },
  },
  userId: { type: DataTypes.STRING(191), allowNull: false },
  role: {
    type: DataTypes.ENUM('owner', 'manager', 'staff'),
    defaultValue: 'staff',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
    allowNull: false,
  },
}, { tableName: 'plat_business_memberships' });

module.exports = BusinessMembership;
