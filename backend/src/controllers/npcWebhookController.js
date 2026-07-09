'use strict';

const { User } = require('../../models');
const crypto = require('crypto');

/**
 * NPC Webhook Handler
 * Receives events from NPC Control Plane and syncs user status in MedNex local DB.
 * Register this URL in NPC: https://api.mednex.vayunexsolution.com/api/v1/npc/webhook
 */
const handleNpcWebhook = async (req, res) => {
  try {
    // Verify NPC webhook signature (optional but recommended)
    const npcSecret = process.env.NPC_WEBHOOK_SECRET || process.env.NPC_CLIENT_SECRET;
    if (npcSecret) {
      const signature = req.headers['x-npc-signature'];
      if (signature) {
        const expectedSig = crypto
          .createHmac('sha256', npcSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');
        if (signature !== `sha256=${expectedSig}`) {
          return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
        }
      }
    }

    const { event, data } = req.body;
    if (!event || !data) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    // Handle user suspension / activation / deletion events
    if (['user.suspended', 'user.deactivated', 'user.deleted'].includes(event)) {
      const email = data.user?.email || data.email;
      if (email) {
        await User.sequelize.query(
          "UPDATE users SET status = 'suspended' WHERE email = ? AND isDeleted = 0",
          { replacements: [email] }
        );
      }
    }

    if (['user.activated', 'user.unsuspended'].includes(event)) {
      const email = data.user?.email || data.email;
      if (email) {
        await User.sequelize.query(
          "UPDATE users SET status = 'active' WHERE email = ? AND isDeleted = 0",
          { replacements: [email] }
        );
      }
    }

    // Handle password sync events from NPC
    if (event === 'user.password_changed') {
      const email = data.user?.email || data.email;
      const newPasswordHash = data.passwordHash || data.password || data.user?.password;
      if (email && newPasswordHash) {
        await User.sequelize.query(
          "UPDATE users SET password = ? WHERE email = ? AND isDeleted = 0",
          { replacements: [newPasswordHash, email] }
        );
      }
    }

    return res.json({ success: true, message: `Event ${event} processed` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

module.exports = { handleNpcWebhook };
