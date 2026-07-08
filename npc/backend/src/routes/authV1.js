'use strict';

const express = require('express');
const router = express.Router();
const authCtrl = require('../platform/identity/authController');
const jwksCtrl = require('../platform/identity/jwksController');
const { authenticate } = require('../middleware/auth');

// Public authentication routes
router.post('/login', authCtrl.login);
router.post('/select-workspace', authCtrl.selectWorkspace);
router.post('/refresh', authCtrl.refresh);
router.post('/password-reset/request', authCtrl.requestPasswordReset);
router.post('/password-reset/reset', authCtrl.resetPassword);
router.get('/jwks', jwksCtrl.getJwks);
router.post('/introspect', jwksCtrl.introspectToken);


// Protected session routes
router.post('/logout', authenticate, authCtrl.logout);
router.post('/logout-all', authenticate, authCtrl.logoutAll);
router.get('/sessions', authenticate, authCtrl.getSessions);
router.delete('/sessions/:uuid', authenticate, authCtrl.terminateSession);

// Protected API Keys routes
router.post('/api-keys', authenticate, authCtrl.createApiKey);
router.get('/api-keys', authenticate, authCtrl.listApiKeys);
router.delete('/api-keys/:uuid', authenticate, authCtrl.revokeApiKey);

module.exports = router;
