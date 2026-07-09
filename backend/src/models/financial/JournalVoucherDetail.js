'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const JournalVoucherDetail = sequelize.define('JournalVoucherDetail', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  journalId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'journal_vouchers', key: 'id' } },
  type: { type: DataTypes.ENUM('Dr', 'Cr'), allowNull: false },
  partyType: { type: DataTypes.ENUM('Customer', 'Supplier', 'General'), allowNull: false },
  customerId: { type: DataTypes.INTEGER, references: { model: 'customers', key: 'id' } },
  supplierId: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
  accountName: { type: DataTypes.STRING(200) },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
}, { tableName: 'journal_voucher_details' });

module.exports = JournalVoucherDetail;
