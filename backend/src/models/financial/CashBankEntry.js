'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const CashBankEntry = sequelize.define('CashBankEntry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  voucherNo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  entryType: { type: DataTypes.ENUM('Receipt', 'Payment'), allowNull: false },
  mode: { type: DataTypes.ENUM('Cash', 'Bank'), allowNull: false },
  partyType: { type: DataTypes.ENUM('Customer', 'Supplier', 'General'), allowNull: false },
  customerId: { type: DataTypes.INTEGER, references: { model: 'customers', key: 'id' } },
  supplierId: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
  accountName: { type: DataTypes.STRING(200) },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  bankName: { type: DataTypes.STRING(150) },
  chequeNo: { type: DataTypes.STRING(100) },
  transactionRef: { type: DataTypes.STRING(100) },
  notes: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  updatedBy: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'cash_bank_entries' });

module.exports = CashBankEntry;
