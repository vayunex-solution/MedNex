'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationOauthClient = sequelize.define('ApplicationOauthClient', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  clientId: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  clientSecret: { type: DataTypes.STRING(255), allowNull: false },
  redirectUrls: { type: DataTypes.TEXT },
  scopes: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(50), defaultValue: 'active', allowNull: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_oauth_clients',
  timestamps: true,
});

module.exports = ApplicationOauthClient;
