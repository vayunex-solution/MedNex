'use strict';

const { sequelize, SaleInvoice, SaleItem, PurchaseInvoice, PurchaseItem, Medicine, Customer, Supplier, CashBankEntry, JournalVoucher, JournalVoucherDetail } = require('../models');
const { Op } = require('sequelize');
const { success } = require('../helpers/response');

const getSalesReport = async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from) where.invoiceDate = { ...where.invoiceDate, [Op.gte]: from };
  if (to) where.invoiceDate = { ...where.invoiceDate, [Op.lte]: to };
  const data = await SaleInvoice.findAll({ where, include: [{ model: Customer, as: 'customer', attributes: ['name'] }], order: [['invoiceDate', 'ASC']] });
  return success(res, data);
};

const getPurchaseReport = async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from) where.invoiceDate = { ...where.invoiceDate, [Op.gte]: from };
  if (to) where.invoiceDate = { ...where.invoiceDate, [Op.lte]: to };
  const data = await PurchaseInvoice.findAll({ where, include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }], order: [['invoiceDate', 'ASC']] });
  return success(res, data);
};

const getGstReport = async (req, res) => {
  const { from, to } = req.query;
  const data = await sequelize.query(`
    SELECT si.hsnCode, si.cgst as cgstRate, si.sgst as sgstRate,
           SUM(si.qty * si.rate * (1 - si.discount/100)) as taxable,
           SUM(si.gstAmount * si.cgst / (si.cgst + si.sgst)) as cgstAmt,
           SUM(si.gstAmount * si.sgst / (si.cgst + si.sgst)) as sgstAmt,
           SUM(si.gstAmount) as totalGst
    FROM sale_items si
    JOIN sale_invoices s ON si.saleId = s.id
    WHERE s.isDeleted = 0 AND s.status = 'completed'
    ${from ? 'AND s.invoiceDate >= :from' : ''}
    ${to ? 'AND s.invoiceDate <= :to' : ''}
    GROUP BY si.hsnCode, si.cgst, si.sgst
  `, { replacements: { from, to }, type: sequelize.QueryTypes.SELECT });
  return success(res, data);
};

const getProfitReport = async (req, res) => {
  const { from, to } = req.query;
  const data = await sequelize.query(`
    SELECT 
      DATE(s.invoiceDate) as date,
      SUM(s.grandTotal) as sales,
      COALESCE((SELECT SUM(p.grandTotal) FROM purchase_invoices p WHERE p.isDeleted=0 AND DATE(p.invoiceDate) = DATE(s.invoiceDate)), 0) as purchases
    FROM sale_invoices s
    WHERE s.isDeleted = 0 AND s.status = 'completed'
    ${from ? 'AND s.invoiceDate >= :from' : ''}
    ${to ? 'AND s.invoiceDate <= :to' : ''}
    GROUP BY DATE(s.invoiceDate)
    ORDER BY date
  `, { replacements: { from, to }, type: sequelize.QueryTypes.SELECT });
  return success(res, data);
};

const getCustomerLedger = async (req, res) => {
  const { customerId, from, to } = req.query;
  if (!customerId) return success(res, []);
  const customer = await Customer.findByPk(customerId);
  if (!customer) return success(res, []);

  let runningBalance = Number(customer.openingBalance) || 0;

  if (from) {
    const priorInvoices = await SaleInvoice.findAll({ where: { customerId, isDeleted: false, status: 'completed', invoiceDate: { [Op.lt]: from } } });
    priorInvoices.forEach(inv => { runningBalance += Number(inv.grandTotal || 0); runningBalance -= Number(inv.paidAmount || 0); });

    const priorCB = await CashBankEntry.findAll({ where: { customerId, isDeleted: false, date: { [Op.lt]: from } } });
    priorCB.forEach(cb => { if (cb.entryType === 'Receipt') runningBalance -= Number(cb.amount); else runningBalance += Number(cb.amount); });

    const priorJV = await JournalVoucherDetail.findAll({
      where: { customerId }, include: [{ model: JournalVoucher, as: 'journal', where: { isDeleted: false, date: { [Op.lt]: from } } }]
    });
    priorJV.forEach(jv => { if (jv.type === 'Dr') runningBalance += Number(jv.amount); else runningBalance -= Number(jv.amount); });
  }

  const transactions = [];
  transactions.push({
    date: from || '', voucherNo: 'Opening', type: 'Opening Balance',
    debit: runningBalance > 0 ? runningBalance : 0, credit: runningBalance < 0 ? Math.abs(runningBalance) : 0,
    balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Dr' : 'Cr'
  });

  const rawTx = [];
  const whereInvs = { customerId, isDeleted: false, status: 'completed' };
  if (from) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.gte]: from };
  if (to) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.lte]: to };
  const invoices = await SaleInvoice.findAll({ where: whereInvs });
  invoices.forEach(inv => {
    if (Number(inv.grandTotal || 0) > 0) rawTx.push({ date: inv.invoiceDate, voucherNo: inv.invoiceNo, type: 'Sale Invoice', debit: Number(inv.grandTotal), credit: 0 });
    if (Number(inv.paidAmount || 0) > 0) rawTx.push({ date: inv.invoiceDate, voucherNo: 'RCPT-' + inv.invoiceNo, type: 'Sale Receipt', debit: 0, credit: Number(inv.paidAmount) });
  });

  const whereCB = { customerId, isDeleted: false };
  if (from) whereCB.date = { ...whereCB.date, [Op.gte]: from };
  if (to) whereCB.date = { ...whereCB.date, [Op.lte]: to };
  const cbs = await CashBankEntry.findAll({ where: whereCB });
  cbs.forEach(cb => {
    rawTx.push({ date: cb.date, voucherNo: cb.voucherNo, type: cb.mode + ' ' + cb.entryType, debit: cb.entryType === 'Payment' ? Number(cb.amount) : 0, credit: cb.entryType === 'Receipt' ? Number(cb.amount) : 0 });
  });

  const whereJV = {};
  if (from) whereJV.date = { ...whereJV.date, [Op.gte]: from };
  if (to) whereJV.date = { ...whereJV.date, [Op.lte]: to };
  const jvs = await JournalVoucherDetail.findAll({
    where: { customerId }, include: [{ model: JournalVoucher, as: 'journal', where: { isDeleted: false, ...whereJV } }]
  });
  jvs.forEach(jv => {
    rawTx.push({ date: jv.journal.date, voucherNo: jv.journal.voucherNo, type: 'Journal', debit: jv.type === 'Dr' ? Number(jv.amount) : 0, credit: jv.type === 'Cr' ? Number(jv.amount) : 0 });
  });

  rawTx.sort((a, b) => new Date(a.date) - new Date(b.date));

  rawTx.forEach(tx => {
    runningBalance += tx.debit;
    runningBalance -= tx.credit;
    transactions.push({ ...tx, balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Dr' : 'Cr' });
  });

  return success(res, transactions);
};

const getSupplierLedger = async (req, res) => {
  const { supplierId, from, to } = req.query;
  if (!supplierId) return success(res, []);
  const supplier = await Supplier.findByPk(supplierId);
  if (!supplier) return success(res, []);

  let runningBalance = Number(supplier.openingBalance) || 0;

  if (from) {
    const priorInvoices = await PurchaseInvoice.findAll({ where: { supplierId, isDeleted: false, status: 'completed', invoiceDate: { [Op.lt]: from } } });
    priorInvoices.forEach(inv => { runningBalance += Number(inv.grandTotal || 0); runningBalance -= Number(inv.paidAmount || 0); });

    const priorCB = await CashBankEntry.findAll({ where: { supplierId, isDeleted: false, date: { [Op.lt]: from } } });
    priorCB.forEach(cb => { if (cb.entryType === 'Payment') runningBalance -= Number(cb.amount); else runningBalance += Number(cb.amount); });

    const priorJV = await JournalVoucherDetail.findAll({
      where: { supplierId }, include: [{ model: JournalVoucher, as: 'journal', where: { isDeleted: false, date: { [Op.lt]: from } } }]
    });
    priorJV.forEach(jv => { if (jv.type === 'Cr') runningBalance += Number(jv.amount); else runningBalance -= Number(jv.amount); });
  }

  const transactions = [];
  transactions.push({
    date: from || '', voucherNo: 'Opening', type: 'Opening Balance',
    debit: runningBalance < 0 ? Math.abs(runningBalance) : 0, credit: runningBalance > 0 ? runningBalance : 0,
    balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Cr' : 'Dr'
  });

  const rawTx = [];
  const whereInvs = { supplierId, isDeleted: false, status: 'completed' };
  if (from) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.gte]: from };
  if (to) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.lte]: to };
  const invoices = await PurchaseInvoice.findAll({ where: whereInvs });
  invoices.forEach(inv => {
    if (Number(inv.grandTotal || 0) > 0) rawTx.push({ date: inv.invoiceDate, voucherNo: inv.invoiceNo, type: 'Purchase Invoice', debit: 0, credit: Number(inv.grandTotal) });
    if (Number(inv.paidAmount || 0) > 0) rawTx.push({ date: inv.invoiceDate, voucherNo: 'PMT-' + inv.invoiceNo, type: 'Purchase Payment', debit: Number(inv.paidAmount), credit: 0 });
  });

  const whereCB = { supplierId, isDeleted: false };
  if (from) whereCB.date = { ...whereCB.date, [Op.gte]: from };
  if (to) whereCB.date = { ...whereCB.date, [Op.lte]: to };
  const cbs = await CashBankEntry.findAll({ where: whereCB });
  cbs.forEach(cb => {
    rawTx.push({ date: cb.date, voucherNo: cb.voucherNo, type: cb.mode + ' ' + cb.entryType, debit: cb.entryType === 'Payment' ? Number(cb.amount) : 0, credit: cb.entryType === 'Receipt' ? Number(cb.amount) : 0 });
  });

  const whereJV = {};
  if (from) whereJV.date = { ...whereJV.date, [Op.gte]: from };
  if (to) whereJV.date = { ...whereJV.date, [Op.lte]: to };
  const jvs = await JournalVoucherDetail.findAll({
    where: { supplierId }, include: [{ model: JournalVoucher, as: 'journal', where: { isDeleted: false, ...whereJV } }]
  });
  jvs.forEach(jv => {
    rawTx.push({ date: jv.journal.date, voucherNo: jv.journal.voucherNo, type: 'Journal', debit: jv.type === 'Dr' ? Number(jv.amount) : 0, credit: jv.type === 'Cr' ? Number(jv.amount) : 0 });
  });

  rawTx.sort((a, b) => new Date(a.date) - new Date(b.date));

  rawTx.forEach(tx => {
    runningBalance -= tx.debit;
    runningBalance += tx.credit;
    transactions.push({ ...tx, balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Cr' : 'Dr' });
  });

  return success(res, transactions);
};

const getItemLedger = async (req, res) => {
  const { medicineId, from, to } = req.query;
  
  let medFilter = '';
  const replacements = {};
  if (from) replacements.from = from;
  if (to) replacements.to = to;
  
  if (medicineId) {
    medFilter = 'AND m.id = :medicineId';
    replacements.medicineId = medicineId;
  }

  let openingBalances = [];
  if (from) {
    const openingQuery = `
      SELECT medicineId, SUM(inwardQty) - SUM(outwardQty) as openingQty
      FROM (
        SELECT pit.medicineId, (pit.qty + IFNULL(pit.freeQty, 0)) as inwardQty, 0 as outwardQty
        FROM purchase_items pit
        JOIN purchase_invoices pi ON pit.purchaseId = pi.id
        WHERE pi.isDeleted = 0 AND pi.status = 'completed' AND pi.invoiceDate < :from

        UNION ALL

        SELECT sit.medicineId, 0 as inwardQty, (sit.qty + IFNULL(sit.free, 0)) as outwardQty
        FROM sale_items sit
        JOIN sale_invoices si ON sit.saleId = si.id
        WHERE si.isDeleted = 0 AND si.status = 'completed' AND si.invoiceDate < :from

        UNION ALL

        SELECT sa.medicineId, 
          IF(sa.adjustmentType = 'increase', sa.qty, 0) as inwardQty,
          IF(sa.adjustmentType IN ('decrease', 'damage', 'transfer'), sa.qty, 0) as outwardQty
        FROM stock_adjustments sa
        WHERE sa.isDeleted = 0 AND sa.date < :from
      ) as all_tx
      GROUP BY medicineId
    `;
    openingBalances = await sequelize.query(openingQuery, { replacements, type: sequelize.QueryTypes.SELECT });
  }

  const openingMap = openingBalances.reduce((acc, row) => {
    acc[row.medicineId] = Number(row.openingQty) || 0;
    return acc;
  }, {});

  let dateFilterPurch = '';
  let dateFilterSale = '';
  let dateFilterAdj = '';
  if (from) {
    dateFilterPurch += ' AND pi.invoiceDate >= :from';
    dateFilterSale += ' AND si.invoiceDate >= :from';
    dateFilterAdj += ' AND sa.date >= :from';
  }
  if (to) {
    dateFilterPurch += ' AND pi.invoiceDate <= :to';
    dateFilterSale += ' AND si.invoiceDate <= :to';
    dateFilterAdj += ' AND sa.date <= :to';
  }

  const txQuery = `
    SELECT * FROM (
      SELECT 
        'Purchase' as type,
        pi.invoiceDate as date,
        pi.invoiceNo as voucherNo,
        s.name as partyName,
        m.id as medicineId,
        m.name as medicineName,
        m.barcode as itemCode,
        u.name as unit,
        (pit.qty + IFNULL(pit.freeQty, 0)) as inwardQty,
        0 as outwardQty,
        pit.rate as rate
      FROM purchase_items pit
      JOIN purchase_invoices pi ON pit.purchaseId = pi.id
      JOIN medicines m ON pit.medicineId = m.id
      LEFT JOIN units u ON m.unitId = u.id
      LEFT JOIN suppliers s ON pi.supplierId = s.id
      WHERE pi.isDeleted = 0 AND pi.status = 'completed' ${dateFilterPurch} ${medFilter}

      UNION ALL

      SELECT 
        'Sale' as type,
        si.invoiceDate as date,
        si.invoiceNo as voucherNo,
        c.name as partyName,
        m.id as medicineId,
        m.name as medicineName,
        m.barcode as itemCode,
        u.name as unit,
        0 as inwardQty,
        (sit.qty + IFNULL(sit.free, 0)) as outwardQty,
        sit.rate as rate
      FROM sale_items sit
      JOIN sale_invoices si ON sit.saleId = si.id
      JOIN medicines m ON sit.medicineId = m.id
      LEFT JOIN units u ON m.unitId = u.id
      LEFT JOIN customers c ON si.customerId = c.id
      WHERE si.isDeleted = 0 AND si.status = 'completed' ${dateFilterSale} ${medFilter}

      UNION ALL

      SELECT 
        'Stock Adjustment' as type,
        sa.date as date,
        CAST(sa.id AS CHAR) as voucherNo,
        NULL as partyName,
        m.id as medicineId,
        m.name as medicineName,
        m.barcode as itemCode,
        u.name as unit,
        IF(sa.adjustmentType = 'increase', sa.qty, 0) as inwardQty,
        IF(sa.adjustmentType IN ('decrease', 'damage', 'transfer'), sa.qty, 0) as outwardQty,
        0 as rate
      FROM stock_adjustments sa
      JOIN medicines m ON sa.medicineId = m.id
      LEFT JOIN units u ON m.unitId = u.id
      WHERE sa.isDeleted = 0 ${dateFilterAdj} ${medFilter}
    ) as combined_tx
    ORDER BY date ASC
  `;

  const transactions = await sequelize.query(txQuery, { replacements, type: sequelize.QueryTypes.SELECT });

  const currentBalances = { ...openingMap };
  const processedTx = transactions.map(tx => {
    const medId = tx.medicineId;
    if (currentBalances[medId] === undefined) currentBalances[medId] = 0;
    
    const opening = currentBalances[medId];
    const inward = Number(tx.inwardQty) || 0;
    const outward = Number(tx.outwardQty) || 0;
    const closing = opening + inward - outward;
    
    currentBalances[medId] = closing;
    
    return {
      ...tx,
      openingQty: opening,
      inwardQty: inward,
      outwardQty: outward,
      closingQty: closing
    };
  });

  return success(res, processedTx);
};

const getCashBook = async (req, res) => {
  const { from, to } = req.query;
  const transactions = [];

  const whereInvs = { isDeleted: false, status: 'completed', paymentMode: 'Cash' };
  if (from) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.gte]: from };
  if (to) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.lte]: to };

  const saleInvs = await SaleInvoice.findAll({ where: whereInvs, include: [{ model: Customer, as: 'customer', attributes: ['name'] }] });
  saleInvs.forEach(inv => {
    if (Number(inv.paidAmount || 0) > 0) {
      transactions.push({ date: inv.invoiceDate, voucherNo: 'RCPT-' + inv.invoiceNo, particulars: `To ${(inv.customer && inv.customer.name) ? inv.customer.name : 'Walk-in Customer'} (Sale)`, debit: Number(inv.paidAmount), credit: 0 });
    }
  });

  const purchInvs = await PurchaseInvoice.findAll({ where: whereInvs, include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }] });
  purchInvs.forEach(inv => {
    if (Number(inv.paidAmount || 0) > 0) {
      transactions.push({ date: inv.invoiceDate, voucherNo: 'PMT-' + inv.invoiceNo, particulars: `By ${(inv.supplier && inv.supplier.name) ? inv.supplier.name : 'Walk-in Supplier'} (Purchase)`, debit: 0, credit: Number(inv.paidAmount) });
    }
  });

  const whereCB = { isDeleted: false, mode: 'Cash' };
  if (from) whereCB.date = { ...whereCB.date, [Op.gte]: from };
  if (to) whereCB.date = { ...whereCB.date, [Op.lte]: to };
  const cbs = await CashBankEntry.findAll({
    where: whereCB,
    include: [{ model: Customer, as: 'customer', attributes: ['name'] }, { model: Supplier, as: 'supplier', attributes: ['name'] }]
  });
  cbs.forEach(cb => {
    let partyName = cb.accountName || 'General';
    if (cb.partyType === 'Customer' && cb.customer) partyName = cb.customer.name;
    if (cb.partyType === 'Supplier' && cb.supplier) partyName = cb.supplier.name;
    transactions.push({ date: cb.date, voucherNo: cb.voucherNo, particulars: `${cb.entryType === 'Receipt' ? 'To' : 'By'} ${partyName}`, debit: cb.entryType === 'Receipt' ? Number(cb.amount) : 0, credit: cb.entryType === 'Payment' ? Number(cb.amount) : 0 });
  });

  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  // Note: For a complete cash book, we'd calculate opening balance from transactions before 'from'.
  // Simplifying here for current period only.
  const finalTx = transactions.map(tx => {
    runningBalance += tx.debit;
    runningBalance -= tx.credit;
    return { ...tx, balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Dr' : 'Cr' };
  });

  return success(res, finalTx);
};

const getBankBook = async (req, res) => {
  const { from, to } = req.query;
  const transactions = [];

  const whereInvs = { isDeleted: false, status: 'completed', paymentMode: { [Op.notIn]: ['Cash', 'Credit', ''] } };
  if (from) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.gte]: from };
  if (to) whereInvs.invoiceDate = { ...whereInvs.invoiceDate, [Op.lte]: to };

  const saleInvs = await SaleInvoice.findAll({ where: whereInvs, include: [{ model: Customer, as: 'customer', attributes: ['name'] }] });
  saleInvs.forEach(inv => {
    if (Number(inv.paidAmount || 0) > 0) {
      transactions.push({ date: inv.invoiceDate, voucherNo: 'RCPT-' + inv.invoiceNo, particulars: `To ${(inv.customer && inv.customer.name) ? inv.customer.name : 'Walk-in Customer'} (Sale via ${inv.paymentMode})`, debit: Number(inv.paidAmount), credit: 0 });
    }
  });

  const purchInvs = await PurchaseInvoice.findAll({ where: whereInvs, include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }] });
  purchInvs.forEach(inv => {
    if (Number(inv.paidAmount || 0) > 0) {
      transactions.push({ date: inv.invoiceDate, voucherNo: 'PMT-' + inv.invoiceNo, particulars: `By ${(inv.supplier && inv.supplier.name) ? inv.supplier.name : 'Walk-in Supplier'} (Purchase via ${inv.paymentMode})`, debit: 0, credit: Number(inv.paidAmount) });
    }
  });

  const whereCB = { isDeleted: false, mode: 'Bank' };
  if (from) whereCB.date = { ...whereCB.date, [Op.gte]: from };
  if (to) whereCB.date = { ...whereCB.date, [Op.lte]: to };
  const cbs = await CashBankEntry.findAll({
    where: whereCB,
    include: [{ model: Customer, as: 'customer', attributes: ['name'] }, { model: Supplier, as: 'supplier', attributes: ['name'] }]
  });
  cbs.forEach(cb => {
    let partyName = cb.accountName || 'General';
    if (cb.partyType === 'Customer' && cb.customer) partyName = cb.customer.name;
    if (cb.partyType === 'Supplier' && cb.supplier) partyName = cb.supplier.name;
    transactions.push({ date: cb.date, voucherNo: cb.voucherNo, particulars: `${cb.entryType === 'Receipt' ? 'To' : 'By'} ${partyName} (Bank: ${cb.bankName || ''})`, debit: cb.entryType === 'Receipt' ? Number(cb.amount) : 0, credit: cb.entryType === 'Payment' ? Number(cb.amount) : 0 });
  });

  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  const finalTx = transactions.map(tx => {
    runningBalance += tx.debit;
    runningBalance -= tx.credit;
    return { ...tx, balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Dr' : 'Cr' };
  });

  return success(res, finalTx);
};

const getJournalBook = async (req, res) => {
  const { from, to } = req.query;
  const whereJV = { isDeleted: false };
  if (from) whereJV.date = { ...whereJV.date, [Op.gte]: from };
  if (to) whereJV.date = { ...whereJV.date, [Op.lte]: to };

  const jvs = await JournalVoucher.findAll({
    where: whereJV,
    include: [{
      model: JournalVoucherDetail, as: 'details',
      include: [{ model: Customer, as: 'customer', attributes: ['name'] }, { model: Supplier, as: 'supplier', attributes: ['name'] }]
    }],
    order: [['date', 'ASC']]
  });

  const transactions = [];
  jvs.forEach(jv => {
    jv.details.forEach(d => {
      let partyName = d.accountName || 'General';
      if (d.partyType === 'Customer' && d.customer) partyName = d.customer.name;
      if (d.partyType === 'Supplier' && d.supplier) partyName = d.supplier.name;
      transactions.push({
        date: jv.date,
        voucherNo: jv.voucherNo,
        particulars: partyName,
        debit: d.type === 'Dr' ? Number(d.amount) : 0,
        credit: d.type === 'Cr' ? Number(d.amount) : 0,
        notes: jv.notes
      });
    });
  });

  return success(res, transactions);
};

module.exports = { getSalesReport, getPurchaseReport, getGstReport, getProfitReport, getCustomerLedger, getSupplierLedger, getItemLedger, getCashBook, getBankBook, getJournalBook };
