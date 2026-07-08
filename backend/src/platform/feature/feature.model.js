'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Feature = sequelize.define('Feature', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  featureKey: { type: DataTypes.STRING(100), allowNull: false },
  isEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { 
  tableName: 'plat_features',
  indexes: [
    { unique: true, fields: ['tenantId', 'featureKey'] }
  ]
});

module.exports = Feature;
