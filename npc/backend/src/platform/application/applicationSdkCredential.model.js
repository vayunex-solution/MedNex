'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationSdkCredential = sequelize.define('ApplicationSdkCredential', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  clientId: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  clientSecret: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'active', allowNull: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_sdk_credentials',
  timestamps: true,
});

module.exports = ApplicationSdkCredential;
