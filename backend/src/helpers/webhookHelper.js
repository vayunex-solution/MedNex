'use strict';

const sequelize = require('../config/database');
const queueManager = require('../shared/queues/QueueManager');
const logger = require('../config/logger');

/**
 * Triggers outgoing webhook events asynchronously via QueueManager
 */
const triggerWebhook = async (tenantId, event, data) => {
  try {
    // Find active webhooks for this tenant
    const [hooks] = await sequelize.query(
      'SELECT id, url, secretKey, events FROM plat_webhooks WHERE tenantId = ? AND isActive = 1',
      { replacements: [tenantId] }
    );

    for (const hook of hooks) {
      let eventsList = [];
      try {
        eventsList = JSON.parse(hook.events);
      } catch (_) {
        eventsList = [];
      }

      // Check if subscribed to the specific event or wildcard '*'
      if (eventsList.includes(event) || eventsList.includes('*')) {
        const payload = {
          tenantId,
          url: hook.url,
          secretKey: hook.secretKey,
          event,
          data,
        };

        // Enqueue the job for worker dispatch
        await queueManager.enqueue('webhook-dispatch', payload, {
          maxAttempts: 5,
        });

        logger.info(`Webhook event [${event}] queued for delivery to ${hook.url}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to trigger webhook event [${event}]: ${err.message}`);
  }
};

module.exports = { triggerWebhook };
