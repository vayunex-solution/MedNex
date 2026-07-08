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

// Telemetry Log Ingestion Route for SaaS Apps
const appCtrl = require('../platform/application/platformApplicationController');
const verifyApiKey = async (req, res, next) => {
  const apiKeyString = req.headers['x-api-key'] || req.headers['x-npc-api-key'];
  if (!apiKeyString) {
    return res.status(401).json({ success: false, message: 'API Key is required in X-API-Key header' });
  }

  try {
    const applicationApiKeyRepository = require('../platform/application/applicationApiKey.repository');
    const applicationRepository = require('../platform/application/application.repository');

    const apiKey = await applicationApiKeyRepository.findOne({ key: apiKeyString, status: 'active' });
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Invalid API Key' });
    }

    const app = await applicationRepository.findOne({ id: apiKey.applicationId });
    if (!app) {
      return res.status(401).json({ success: false, message: 'Associated application not found' });
    }

    req.npcApp = app;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'API Key verification failed internally' });
  }
};

router.post('/platform/telemetry/ingest', verifyApiKey, appCtrl.ingestLogs);

// Super Admin Platform Core Management
const { authenticate, authorize } = require('../middleware/auth');
const platformRoutes = require('./platform');
router.use('/platform', authenticate, authorize('super_admin'), platformRoutes);

module.exports = router;
