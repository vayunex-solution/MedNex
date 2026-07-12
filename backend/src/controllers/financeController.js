'use strict';

const { CashBankEntry, JournalVoucher, JournalVoucherDetail, sequelize } = require('../models');
const { success, created, badRequest } = require('../helpers/response');

// ─── Cash & Bank Entries ────────────────────────────────────────────────────────

const getCashBankEntries = async (req, res) => {
  const data = await CashBankEntry.findAll({
    where: { isDeleted: false },
    order: [['date', 'DESC'], ['id', 'DESC']]
  });
  return success(res, data);
};

const createCashBankEntry = async (req, res) => {
  const { date, entryType, mode, partyType, customerId, supplierId, accountName, amount, bankName, chequeNo, transactionRef, notes } = req.body;
  if (!amount || amount <= 0) return badRequest(res, 'Amount must be greater than zero');
  
  const count = await CashBankEntry.count() + 1;
  const prefix = mode === 'Cash' ? (entryType === 'Receipt' ? 'CR' : 'CP') : (entryType === 'Receipt' ? 'BR' : 'BP');
  const voucherNo = `${prefix}-${String(count).padStart(6, '0')}`;

  const entry = await CashBankEntry.create({
    date, voucherNo, entryType, mode, partyType,
    customerId: partyType === 'Customer' ? customerId : null,
    supplierId: partyType === 'Supplier' ? supplierId : null,
    accountName: partyType === 'General' ? accountName : null,
    amount, bankName, chequeNo, transactionRef, notes,
    createdBy: req.user?.id
  });

  const { logAudit } = require('../helpers/auditLogger');
  await logAudit(req, 'CREATE', 'Finance', `Created Cash/Bank entry ${voucherNo} for ₹${amount}`);

  return created(res, entry);
};

const updateCashBankEntry = async (req, res) => {
  const { id } = req.params;
  const { date, entryType, mode, partyType, customerId, supplierId, accountName, amount, bankName, chequeNo, transactionRef, notes } = req.body;
  if (!amount || amount <= 0) return badRequest(res, 'Amount must be greater than zero');

  const entry = await CashBankEntry.findOne({ where: { id, isDeleted: false } });
  if (!entry) return res.status(404).json({ success: false, message: 'Record not found' });

  const oldAmount = entry.amount;
  await entry.update({
    date, entryType, mode, partyType,
    customerId: partyType === 'Customer' ? customerId : null,
    supplierId: partyType === 'Supplier' ? supplierId : null,
    accountName: partyType === 'General' ? accountName : null,
    amount, bankName, chequeNo, transactionRef, notes,
    updatedBy: req.user?.id
  });

  const { logAudit } = require('../helpers/auditLogger');
  await logAudit(req, 'UPDATE', 'Finance', `Updated Cash/Bank entry ${entry.voucherNo}: amount changed from ₹${oldAmount} to ₹${amount}`);

  return success(res, entry, 'Cash/Bank entry updated successfully');
};

// ─── Journal Vouchers ───────────────────────────────────────────────────────────

const getJournalVouchers = async (req, res) => {
  const data = await JournalVoucher.findAll({
    where: { isDeleted: false },
    include: [{ model: JournalVoucherDetail, as: 'details' }],
    order: [['date', 'DESC'], ['id', 'DESC']]
  });
  return success(res, data);
};

const createJournalVoucher = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { date, notes, details } = req.body;
    
    if (!details || details.length < 2) return badRequest(res, 'Journal must have at least two details');

    let totalDr = 0;
    let totalCr = 0;
    for (const d of details) {
      if (d.type === 'Dr') totalDr += Number(d.amount);
      if (d.type === 'Cr') totalCr += Number(d.amount);
    }
    if (Math.abs(totalDr - totalCr) > 0.01) return badRequest(res, 'Debit and Credit totals must be equal');

    const count = await JournalVoucher.count() + 1;
    const voucherNo = `JV-${String(count).padStart(6, '0')}`;

    const jv = await JournalVoucher.create({
      date, voucherNo, totalAmount: totalDr, notes, createdBy: req.user?.id
    }, { transaction: t });

    for (const d of details) {
      await JournalVoucherDetail.create({
        journalId: jv.id,
        type: d.type,
        partyType: d.partyType,
        customerId: d.partyType === 'Customer' ? d.customerId : null,
        supplierId: d.partyType === 'Supplier' ? d.supplierId : null,
        accountName: d.partyType === 'General' ? d.accountName : null,
        amount: d.amount
      }, { transaction: t });
    }

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'CREATE', 'Finance', `Created Journal Voucher ${voucherNo} for ₹${totalDr}`);

    await t.commit();
    return created(res, { ...jv.toJSON(), details });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const updateJournalVoucher = async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();
  try {
    const { date, notes, details } = req.body;
    
    if (!details || details.length < 2) return badRequest(res, 'Journal must have at least two details');

    let totalDr = 0;
    let totalCr = 0;
    for (const d of details) {
      if (d.type === 'Dr') totalDr += Number(d.amount);
      if (d.type === 'Cr') totalCr += Number(d.amount);
    }
    if (Math.abs(totalDr - totalCr) > 0.01) return badRequest(res, 'Debit and Credit totals must be equal');

    const jv = await JournalVoucher.findOne({
      where: { id, isDeleted: false },
      transaction: t
    });
    if (!jv) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Delete old details
    await JournalVoucherDetail.destroy({ where: { journalId: id }, transaction: t });

    // Update main voucher
    const oldAmount = jv.totalAmount;
    await jv.update({
      date, totalAmount: totalDr, notes, updatedBy: req.user?.id
    }, { transaction: t });

    // Insert new details
    for (const d of details) {
      await JournalVoucherDetail.create({
        journalId: jv.id,
        type: d.type,
        partyType: d.partyType,
        customerId: d.partyType === 'Customer' ? d.customerId : null,
        supplierId: d.partyType === 'Supplier' ? d.supplierId : null,
        accountName: d.partyType === 'General' ? d.accountName : null,
        amount: d.amount
      }, { transaction: t });
    }

    const { logAudit } = require('../helpers/auditLogger');
    await logAudit(req, 'UPDATE', 'Finance', `Updated Journal Voucher ${jv.voucherNo}: totalAmount changed from ₹${oldAmount} to ₹${totalDr}`);

    await t.commit();
    return success(res, { ...jv.toJSON(), details }, 'Journal Voucher updated successfully');
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const getCashBankEntryById = async (req, res) => {
  const entry = await CashBankEntry.findOne({ where: { id: req.params.id, isDeleted: false } });
  if (!entry) return res.status(404).json({ success: false, message: 'Record not found' });
  return success(res, entry);
};

const getJournalVoucherById = async (req, res) => {
  const jv = await JournalVoucher.findOne({
    where: { id: req.params.id, isDeleted: false },
    include: [{ model: JournalVoucherDetail, as: 'details' }]
  });
  if (!jv) return res.status(404).json({ success: false, message: 'Record not found' });
  return success(res, jv);
};

module.exports = {
  getCashBankEntries, createCashBankEntry, updateCashBankEntry, getCashBankEntryById,
  getJournalVouchers, createJournalVoucher, updateJournalVoucher, getJournalVoucherById
};
