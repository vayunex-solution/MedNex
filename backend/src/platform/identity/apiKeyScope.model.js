'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApiKeyScope = sequelize.define('ApiKeyScope', {
  apiKeyId: { type: DataTypes.BIGINT, primaryKey: true },
  permissionId: { type: DataTypes.BIGINT, primaryKey: true },
}, { 
  tableName: 'plat_api_key_scopes',
  timestamps: false,
});

module.exports = ApiKeyScope;
