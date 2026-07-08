'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UserNotificationPreference = sequelize.define('UserNotificationPreference', {
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
  channel: {
    type: DataTypes.ENUM('email', 'sms', 'push', 'whatsapp', 'webhook', 'in_app'),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'general',
    allowNull: false,
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'plat_user_notification_preferences',
  timestamps: true,
});

module.exports = UserNotificationPreference;
