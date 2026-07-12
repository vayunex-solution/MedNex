'use strict';

const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/cash-bank', financeController.getCashBankEntries);
router.post('/cash-bank', financeController.createCashBankEntry);
router.put('/cash-bank/:id', financeController.updateCashBankEntry);
router.get('/cash-bank/:id', financeController.getCashBankEntryById);

router.get('/journal', financeController.getJournalVouchers);
router.post('/journal', financeController.createJournalVoucher);
router.put('/journal/:id', financeController.updateJournalVoucher);
router.get('/journal/:id', financeController.getJournalVoucherById);

module.exports = router;
