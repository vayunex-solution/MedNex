'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const TenantSettings = sequelize.define('TenantSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  key: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.TEXT },
}, { 
  tableName: 'plat_tenant_settings',
  indexes: [
    { unique: true, fields: ['tenantId', 'key'] }
  ]
});

module.exports = TenantSettings;
