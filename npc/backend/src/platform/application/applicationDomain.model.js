'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationDomain = sequelize.define('ApplicationDomain', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  domain: { type: DataTypes.STRING(255), allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending', allowNull: false },
  verificationToken: { type: DataTypes.STRING(255) },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_domains',
  timestamps: true,
});

module.exports = ApplicationDomain;
