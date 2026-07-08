'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Tenant = sequelize.define('Tenant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(100), unique: true, allowNull: true },
  email: { type: DataTypes.STRING(191), unique: true, allowNull: true },
  domain: { type: DataTypes.STRING(100), unique: true },
  subdomain: { type: DataTypes.STRING(100), unique: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { 
    type: DataTypes.ENUM('provisioning', 'active', 'suspended', 'archived'), 
    defaultValue: 'active', 
    allowNull: false 
  },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'plat_tenants' });

module.exports = Tenant;
