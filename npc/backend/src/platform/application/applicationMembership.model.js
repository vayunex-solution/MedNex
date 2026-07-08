'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ApplicationMembership = sequelize.define('ApplicationMembership', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  applicationId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.STRING(50), defaultValue: 'member', allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'active', allowNull: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { 
  tableName: 'plat_application_memberships',
  timestamps: true,
});

module.exports = ApplicationMembership;
