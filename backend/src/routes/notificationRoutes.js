'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// SSE stream — self-authenticates via ?token= query param (no middleware)
router.get('/stream', ctrl.stream);

// REST endpoints
router.get('/', authenticate, ctrl.getAll);
router.get('/unread-count', authenticate, ctrl.getUnreadCount);
router.put('/read-all', authenticate, ctrl.markAllRead);
router.delete('/clear-all', authenticate, ctrl.clearAll);
router.put('/:id/read', authenticate, ctrl.markRead);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
