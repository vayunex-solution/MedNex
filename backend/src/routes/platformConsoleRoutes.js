'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Controllers
const developerCtrl = require('../controllers/developerController');
const marketingCtrl = require('../controllers/marketingController');
const offerCtrl = require('../controllers/offerController');
const settingsCtrl = require('../controllers/tenantSettingsController');

// All platform console endpoints require authentication
router.use(authenticate);

// ─── Developer Tools (API Keys & Webhooks) ─────────────────────────────────────
router.get('/developer/docs', developerCtrl.getApiDocs);
router.post('/developer/keys', developerCtrl.generateKey);
router.get('/developer/keys', developerCtrl.listKeys);
router.delete('/developer/keys/:id', developerCtrl.revokeKey);
router.post('/developer/webhooks', developerCtrl.createWebhook);
router.get('/developer/webhooks', developerCtrl.listWebhooks);
router.delete('/developer/webhooks/:id', developerCtrl.deleteWebhook);
router.get('/developer/webhooks/logs', developerCtrl.getWebhookLogs);

// ─── Email Marketing Campaigns ────────────────────────────────────────────────
router.post('/marketing/campaigns', marketingCtrl.createCampaign);
router.get('/marketing/campaigns', marketingCtrl.listCampaigns);
router.get('/marketing/segments', marketingCtrl.getSegmentsCount);
router.post('/marketing/campaigns/:id/send', marketingCtrl.triggerCampaign);

// ─── Offers & Promotion Rules ─────────────────────────────────────────────────
router.post('/offers', offerCtrl.createOffer);
router.get('/offers', offerCtrl.listOffers);
router.put('/offers/:id/status', offerCtrl.toggleOfferStatus);
router.delete('/offers/:id', offerCtrl.deleteOffer);

// ─── Modular Tenant Settings ──────────────────────────────────────────────────
router.get('/tenant/settings', settingsCtrl.getSettings);
router.put('/tenant/settings', settingsCtrl.updateSettings);
router.post('/tenant/settings/test-smtp', settingsCtrl.testSmtpSettings);

module.exports = router;
