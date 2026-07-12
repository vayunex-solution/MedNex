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

  const { Customer, Supplier } = require('../models');
  const entry = await CashBankEntry.findOne({
    where: { id, isDeleted: false },
    include: [
      { model: Customer, as: 'customer', attributes: ['name'] },
      { model: Supplier, as: 'supplier', attributes: ['name'] }
    ]
  });
  if (!entry) return res.status(404).json({ success: false, message: 'Record not found' });

  const oldAmount = entry.amount;

  const cbChanges = [];
  cbChanges.push(`Voucher No: ${entry.voucherNo}`);
  if (entry.date !== date) cbChanges.push(`Date: ${entry.date} -> ${date}`);
  if (entry.mode !== mode) cbChanges.push(`Mode: ${entry.mode} -> ${mode}`);
  if (entry.entryType !== entryType) cbChanges.push(`Type: ${entry.entryType} -> ${entryType}`);
  if (Number(entry.amount) !== Number(amount)) cbChanges.push(`Amount: ₹${Number(entry.amount).toFixed(2)} -> ₹${Number(amount).toFixed(2)}`);
  
  if (entry.partyType !== partyType) {
    cbChanges.push(`Party Type: ${entry.partyType} -> ${partyType}`);
  }
  
  if (partyType === 'Customer' && Number(entry.customerId || 0) !== Number(customerId || 0)) {
    const oldName = entry.customer?.name || 'None';
    const newCust = customerId ? await Customer.findByPk(customerId) : null;
    cbChanges.push(`Customer: ${oldName} -> ${newCust?.name || 'None'}`);
  }
  if (partyType === 'Supplier' && Number(entry.supplierId || 0) !== Number(supplierId || 0)) {
    const oldName = entry.supplier?.name || 'None';
    const newSupp = supplierId ? await Supplier.findByPk(supplierId) : null;
    cbChanges.push(`Supplier: ${oldName} -> ${newSupp?.name || 'None'}`);
  }
  if (partyType === 'General' && entry.accountName !== accountName) {
    cbChanges.push(`Account Name: ${entry.accountName || 'None'} -> ${accountName || 'None'}`);
  }
  if (entry.notes !== notes) cbChanges.push(`Notes: ${entry.notes || 'None'} -> ${notes || 'None'}`);

  await entry.update({
    date, entryType, mode, partyType,
    customerId: partyType === 'Customer' ? customerId : null,
    supplierId: partyType === 'Supplier' ? supplierId : null,
    accountName: partyType === 'General' ? accountName : null,
    amount, bankName, chequeNo, transactionRef, notes,
    updatedBy: req.user?.id
  });

  const { logAudit } = require('../helpers/auditLogger');
  await logAudit(req, 'UPDATE', 'Finance', cbChanges.join('\n'));

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

    const { Customer, Supplier } = require('../models');
    const jv = await JournalVoucher.findOne({
      where: { id, isDeleted: false },
      include: [{
        model: JournalVoucherDetail, as: 'details',
        include: [
          { model: Customer, as: 'customer', attributes: ['name'] },
          { model: Supplier, as: 'supplier', attributes: ['name'] }
        ]
      }],
      transaction: t
    });
    if (!jv) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const oldAmount = jv.totalAmount;

    // Build Audit Log Details
    const jvChanges = [];
    jvChanges.push(`Journal Voucher: ${jv.voucherNo}`);
    jvChanges.push(`Date: ${jv.date} -> ${date}`);
    jvChanges.push(`Total Amount: ₹${Number(oldAmount).toFixed(2)} -> ₹${Number(totalDr).toFixed(2)}`);
    jvChanges.push(`Notes: ${jv.notes || 'None'} -> ${notes || 'None'}`);

    jvChanges.push('\n[Old Details]');
    for (const d of jv.details) {
      let name = d.accountName || 'General';
      if (d.partyType === 'Customer') name = d.customer?.name || 'Customer';
      if (d.partyType === 'Supplier') name = d.supplier?.name || 'Supplier';
      jvChanges.push(`- ${d.type}: ${name} | Amount: ₹${Number(d.amount).toFixed(2)}`);
    }

    jvChanges.push('\n[New Details]');
    for (const d of details) {
      let name = d.accountName || 'General';
      if (d.partyType === 'Customer') {
        const c = d.customerId ? await Customer.findByPk(d.customerId, { transaction: t }) : null;
        name = c?.name || 'Customer';
      } else if (d.partyType === 'Supplier') {
        const s = d.supplierId ? await Supplier.findByPk(d.supplierId, { transaction: t }) : null;
        name = s?.name || 'Supplier';
      }
      jvChanges.push(`+ ${d.type}: ${name} | Amount: ₹${Number(d.amount).toFixed(2)}`);
    }

    // Delete old details
    await JournalVoucherDetail.destroy({ where: { journalId: id }, transaction: t });

    // Update main voucher
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
    await logAudit(req, 'UPDATE', 'Finance', jvChanges.join('\n'));

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
