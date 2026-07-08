'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const platformRoutes = require('./platform');

// Super Admin Platform Core Management - V2 (Can add v2 specific routes later)
router.use('/platform', authenticate, authorize('super_admin'), platformRoutes);

module.exports = router;
