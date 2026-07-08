'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const PlatBackgroundJob = sequelize.define('PlatBackgroundJob', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true,
  },
  queue: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'default',
  },
  taskName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  payload: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'dead'),
    allowNull: false,
    defaultValue: 'pending',
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  runAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'plat_background_jobs',
  timestamps: true,
});

module.exports = PlatBackgroundJob;
