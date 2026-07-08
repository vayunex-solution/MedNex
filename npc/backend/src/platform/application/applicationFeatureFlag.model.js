'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationFeatureFlag = sequelize.define('ApplicationFeatureFlag', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  key: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.STRING(255), defaultValue: 'false', allowNull: false },
  description: { type: DataTypes.TEXT },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_feature_flags',
  timestamps: true,
});

module.exports = ApplicationFeatureFlag;
