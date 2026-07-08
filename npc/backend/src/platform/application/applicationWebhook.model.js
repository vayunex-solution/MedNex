'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationWebhook = sequelize.define('ApplicationWebhook', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  environment: { type: DataTypes.STRING(50), defaultValue: 'production', allowNull: false },
  url: { type: DataTypes.STRING(255), allowNull: false },
  secret: { type: DataTypes.STRING(255), allowNull: false },
  signingKey: { type: DataTypes.STRING(255) },
  events: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(50), defaultValue: 'active', allowNull: false },
  retryPolicy: { type: DataTypes.TEXT },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_webhooks',
  timestamps: true,
});

module.exports = ApplicationWebhook;
