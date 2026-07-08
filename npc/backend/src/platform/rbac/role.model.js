'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Role = sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
}, { tableName: 'plat_roles' });

module.exports = Role;
