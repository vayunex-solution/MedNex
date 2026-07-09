'use strict';

const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/cash-bank', financeController.getCashBankEntries);
router.post('/cash-bank', financeController.createCashBankEntry);

router.get('/journal', financeController.getJournalVouchers);
router.post('/journal', financeController.createJournalVoucher);

module.exports = router;
