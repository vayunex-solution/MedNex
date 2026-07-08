'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const IdempotencyKey = sequelize.define('IdempotencyKey', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  status: {
    type: DataTypes.ENUM('processing', 'completed'),
    defaultValue: 'processing',
    allowNull: false,
  },
  responseStatus: { type: DataTypes.INTEGER, allowNull: true },
  responseBody: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'plat_idempotency_keys' });

module.exports = IdempotencyKey;
