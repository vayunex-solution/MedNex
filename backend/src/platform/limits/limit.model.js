'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Limit = sequelize.define('Limit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  limitKey: { type: DataTypes.STRING(100), allowNull: false },
  limitValue: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { 
  tableName: 'plat_limits',
  indexes: [
    { unique: true, fields: ['tenantId', 'limitKey'] }
  ]
});

module.exports = Limit;
