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
