'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Outbox = sequelize.define('Outbox', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  eventName: { type: DataTypes.STRING(100), allowNull: false },
  payload: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'processed', 'failed'),
    defaultValue: 'pending',
    allowNull: false,
  },
  error: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'plat_outbox' });

module.exports = Outbox;
