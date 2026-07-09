'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const JournalVoucher = sequelize.define('JournalVoucher', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  voucherNo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'journal_vouchers' });

module.exports = JournalVoucher;
