'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserMetadata = sequelize.define('UserMetadata', {
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
    type: DataTypes.STRING(50),
    defaultValue: 'string',
    allowNull: false,
  },
  visibility: {
    type: DataTypes.ENUM('private', 'internal', 'public'),
    defaultValue: 'private',
    allowNull: false,
  },
}, {
  tableName: 'plat_user_metadata',
  timestamps: true,
});

module.exports = UserMetadata;
