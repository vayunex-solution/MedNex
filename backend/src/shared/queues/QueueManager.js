'use strict';

const logger = require('../../config/logger');
const DatabaseQueueProvider = require('./DatabaseQueueProvider');

let provider;

if (process.env.REDIS_URL) {
  try {
    const RedisQueueProvider = require('./RedisQueueProvider');
    provider = new RedisQueueProvider();
    logger.info('QueueManager: Initialized with Redis/BullMQ provider');
  } catch (err) {
    logger.warn(`QueueManager: Failed to initialize Redis provider (${err.message}). Falling back to Database queue.`);
    provider = new DatabaseQueueProvider();
  }
} else {
  provider = new DatabaseQueueProvider();
  logger.info('QueueManager: Initialized with Database queue provider');
}

class QueueManager {
  /**
   * Enqueues a job for background execution
   */
  async enqueue(jobType, payload, options = {}) {
    return provider.enqueue(jobType, payload, options);
  }

  /**
   * Registers a worker function for a specific jobType
   */
  async process(jobType, workerFn) {
    return provider.process(jobType, workerFn);
  }

  /**
   * Resets/Retries a job
   */
  async retry(jobId) {
    return provider.retry(jobId);
  }

  /**
   * Schedules a job for future run
   */
  async schedule(jobType, payload, nextRunAt, options = {}) {
    return provider.schedule(jobType, payload, nextRunAt, options);
  }

  /**
   * Cancels a pending job
   */
  async cancel(jobId) {
    return provider.cancel(jobId);
  }
}

const queueManager = new QueueManager();
module.exports = queueManager;
