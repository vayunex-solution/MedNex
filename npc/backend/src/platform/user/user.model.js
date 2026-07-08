'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const User = sequelize.define('User', {
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
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'employee',
  },
  userType: {
    type: DataTypes.ENUM('super_admin', 'developer', 'tenant_owner', 'business_owner', 'branch_manager', 'employee', 'service_account', 'system', 'bot', 'customer'),
    defaultValue: 'employee',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'email_pending', 'phone_pending', 'mfa_pending', 'active', 'locked', 'suspended', 'archived', 'deleted'),
    defaultValue: 'active',
    allowNull: false,
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  emailVerificationExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  phoneVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  phoneVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  phoneVerificationExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  passwordResetRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  isMfaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  mfaSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  mfaBackupCodes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  failedAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLoginIp: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
  },
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  activatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  suspendedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

const UserProfile = require('./userProfile.model');
const UserPreference = require('./userPreference.model');
const UserNotificationPreference = require('./userNotificationPreference.model');
const UserMetadata = require('./userMetadata.model');
const UserDevice = require('./userDevice.model');
const UserMembership = require('../identity/userMembership.model');

User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile' });
UserProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserPreference, { foreignKey: 'userId', as: 'preferences' });
UserPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserNotificationPreference, { foreignKey: 'userId', as: 'notificationPreferences' });
UserNotificationPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserMetadata, { foreignKey: 'userId', as: 'metadata' });
UserMetadata.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserDevice, { foreignKey: 'userId', as: 'devices' });
UserDevice.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserMembership, { foreignKey: 'userId', as: 'memberships' });
UserMembership.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = User;
