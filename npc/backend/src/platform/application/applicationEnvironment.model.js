'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationEnvironment = sequelize.define('ApplicationEnvironment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  configs: { type: DataTypes.TEXT },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_environments',
  timestamps: true,
});

module.exports = ApplicationEnvironment;
