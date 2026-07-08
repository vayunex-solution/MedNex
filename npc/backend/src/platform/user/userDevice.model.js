'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserDevice = sequelize.define('UserDevice', {
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  deviceFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  deviceName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  deviceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  browser: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  browserVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  os: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  osVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  ip: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  trustedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isTrusted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'plat_user_devices',
  timestamps: true,
});

module.exports = UserDevice;
