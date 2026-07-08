'use strict';

const EventEmitter = require('events');
const logger = require('../logger');

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase listener limits if many modules register hooks
    this.setMaxListeners(50);
  }

  publish(event, payload) {
    logger.debug(`[EventBus] Publishing event: ${event}`, { payload });
    // Execute listeners asynchronously using setImmediate to avoid blocking the caller
    setImmediate(() => {
      try {
        this.emit(event, payload);
      } catch (err) {
        logger.error(`[EventBus] Error executing listener for event ${event}:`, err);
      }
    });
  }

  subscribe(event, handler) {
    logger.debug(`[EventBus] New subscription registered for: ${event}`);
    this.on(event, handler);
  }
}

const eventBus = new EventBus();
module.exports = eventBus;
