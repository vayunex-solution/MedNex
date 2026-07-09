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

// Federated Platform Operations
const verifyNpcRequest = require('../middleware/verifyNpcRequest');
const provisionCtrl = require('../platform/provision/provisionController');
router.post('/platform/provision', verifyNpcRequest, provisionCtrl.provision);
router.post('/platform/sync', verifyNpcRequest, provisionCtrl.sync);

// NPC User Lifecycle Webhook — NPC calls this to sync user status (suspend/activate)
const { handleNpcWebhook } = require('../controllers/npcWebhookController');
router.post('/npc/webhook', handleNpcWebhook);


// Auth Engine V1
router.use('/auth', authV1Routes);

// Super Admin Platform Core Management
const { authenticate, authorize } = require('../middleware/auth');
const platformRoutes = require('./platform');
router.use('/platform', authenticate, authorize('super_admin'), platformRoutes);

module.exports = router;
