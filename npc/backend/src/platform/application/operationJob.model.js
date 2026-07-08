'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const OperationJob = sequelize.define('OperationJob', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  operationType: { 
    type: DataTypes.ENUM('provision', 'deprovision', 'sync', 'suspend', 'resume', 'backup', 'restore', 'rotate', 'upgrade', 'migrate'),
    allowNull: false 
  },
  status: { 
    type: DataTypes.ENUM('pending', 'queued', 'running', 'waiting_for_remote', 'retrying', 'completed', 'failed', 'dead_letter'),
    defaultValue: 'pending',
    allowNull: false 
  },
  retryCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  maxRetries: { type: DataTypes.INTEGER, defaultValue: 5, allowNull: false },
  payload: { type: DataTypes.TEXT, allowNull: false },
  lastError: { type: DataTypes.TEXT },
  nextAttemptAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
}, { 
  tableName: 'plat_operation_jobs',
  timestamps: true,
});

module.exports = OperationJob;
