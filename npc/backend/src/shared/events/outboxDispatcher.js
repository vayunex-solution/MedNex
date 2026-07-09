'use strict';

const outboxRepository = require('./outbox.repository');
const eventBus = require('./index');
const logger = require('../../config/logger');

class OutboxDispatcher {
  async dispatch() {
    throw new Error('Method not implemented');
  }
}

class PollingDispatcher extends OutboxDispatcher {
  constructor() {
    super();
    this.isProcessing = false;
  }

  async dispatch() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find pending outbox records
      const pendingEvents = await outboxRepository.findMany({ status: 'pending' });
      for (const event of pendingEvents) {
        try {
          const payload = JSON.parse(event.payload);
          // Attach outbox UUID as eventId for idempotent processing
          payload.eventId = event.uuid;
          
          // Publish onto the global in-memory EventBus
          eventBus.publish(event.eventName, payload);

          // Dispatch Webhooks for external integration (specifically User Password / Status Changes)
          if (['PasswordChanged', 'UserSuspended', 'UserActivated'].includes(event.eventName)) {
            try {
              // Dynamically import dependencies to avoid circular reference issues
              const ApplicationWebhook = require('../../platform/application/applicationWebhook.model');
              const Application = require('../../platform/application/application.model');
              const crypto = require('crypto');
              const fetch = require('node-fetch').default || global.fetch;

              // Find active webhook integrations (specifically targeting MedNex or other registered SaaS webhooks)
              const webhooks = await ApplicationWebhook.findAll({
                where: { status: 'active', isDeleted: false }
              });

              for (const wh of webhooks) {
                // Fetch associated application client secret
                const app = await Application.findOne({ where: { id: wh.applicationId, isDeleted: false } });
                if (!app) continue;

                // Map Outbox event to Webhook event payload
                const eventMap = {
                  'PasswordChanged': 'user.password_changed',
                  'UserSuspended': 'user.suspended',
                  'UserActivated': 'user.activated'
                };

                // Fetch user email by user UUID from payload
                const User = require('../../platform/user/user.model');
                const userObj = await User.findOne({ where: { uuid: payload.userUuid || payload.payload?.userUuid } });
                if (!userObj) continue;

                const webhookEvent = eventMap[event.eventName];
                const webhookPayload = {
                  event: webhookEvent,
                  timestamp: new Date().toISOString(),
                  data: {
                    email: userObj.email,
                    passwordHash: userObj.password,
                    status: userObj.status,
                    user: {
                      id: userObj.id,
                      uuid: userObj.uuid,
                      email: userObj.email,
                      role: userObj.role,
                      status: userObj.status
                    }
                  }
                };

                // Build request signature
                const bodyStr = JSON.stringify(webhookPayload);
                const expectedSig = crypto
                  .createHmac('sha256', app.clientSecret || 'default_sec_val')
                  .update(bodyStr)
                  .digest('hex');

                // Trigger Webhook Dispatch
                fetch(wh.url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-npc-signature': `sha256=${expectedSig}`,
                    'x-correlation-id': payload.correlationId || crypto.randomUUID()
                  },
                  body: bodyStr
                }).catch(err => {
                  logger.error(`[OutboxDispatcher] Webhook delivery failed for URL ${wh.url}:`, err.message);
                });
              }
            } catch (whErr) {
              logger.error('[OutboxDispatcher] Failed to dispatch webhook event:', whErr);
            }
          }

          // Mark as processed
          await outboxRepository.update(event.id, {
            status: 'processed',
          });
        } catch (err) {
          logger.error(`[OutboxDispatcher] Error processing outbox event ID ${event.id}:`, err);
          await outboxRepository.update(event.id, {
            status: 'failed',
            error: err.stack,
          });
        }
      }
    } catch (err) {
      logger.error('[OutboxDispatcher] Error querying pending outbox events:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  start(intervalMs = 5000) {
    setInterval(() => this.dispatch(), intervalMs);
    logger.info(`[OutboxDispatcher] Polling outbox dispatcher started with interval ${intervalMs}ms`);
  }
}

const pollingDispatcher = new PollingDispatcher();
module.exports = pollingDispatcher;
