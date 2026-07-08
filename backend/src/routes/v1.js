'use strict';

const express = require('express');
const router = express.Router();
const healthCtrl = require('../platform/health/healthController');
const tenantCtrl = require('../platform/tenant/tenantController');
const authV1Routes = require('./authV1');

// Platform Diagnostics
router.get('/platform/health', healthCtrl.checkHealth);

// Tenant Provisioning
router.post('/platform/tenants/signup', tenantCtrl.signup);

// Auth Engine V1
router.use('/auth', authV1Routes);

// Super Admin Platform Core Management
const { authenticate, authorize } = require('../middleware/auth');
const platformRoutes = require('./platform');
router.use('/platform', authenticate, authorize('super_admin'), platformRoutes);

module.exports = router;
