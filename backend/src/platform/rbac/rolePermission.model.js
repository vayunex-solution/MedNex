'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const RolePermission = sequelize.define('RolePermission', {
  roleId: { type: DataTypes.INTEGER, primaryKey: true },
  permissionId: { type: DataTypes.INTEGER, primaryKey: true },
}, { 
  tableName: 'plat_role_permissions',
  timestamps: false,
});

module.exports = RolePermission;
