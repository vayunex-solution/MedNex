'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserPreference = sequelize.define('UserPreference', {
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
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  datatype: {
    type: DataTypes.ENUM('string', 'boolean', 'integer', 'float', 'json'),
    defaultValue: 'string',
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'general',
    allowNull: false,
  },
  scope: {
    type: DataTypes.ENUM('user', 'business', 'branch', 'tenant'),
    defaultValue: 'user',
    allowNull: false,
  },
}, {
  tableName: 'plat_user_preferences',
  timestamps: true,
});

module.exports = UserPreference;
