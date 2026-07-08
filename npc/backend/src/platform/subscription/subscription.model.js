'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  planId: { type: DataTypes.STRING(50), allowNull: false },
  status: { type: DataTypes.STRING(30), defaultValue: 'active' },
  currentPeriodStart: { type: DataTypes.DATE },
  currentPeriodEnd: { type: DataTypes.DATE },
}, { tableName: 'plat_subscriptions' });

module.exports = Subscription;
