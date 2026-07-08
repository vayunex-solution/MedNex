'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserProfile = sequelize.define('UserProfile', {
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
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  avatarFileId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  avatarUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  timezone: {
    type: DataTypes.STRING(100),
    defaultValue: 'UTC',
    allowNull: false,
  },
  locale: {
    type: DataTypes.STRING(20),
    defaultValue: 'en',
    allowNull: false,
  },
}, {
  tableName: 'plat_user_profiles',
  timestamps: true,
});

module.exports = UserProfile;
