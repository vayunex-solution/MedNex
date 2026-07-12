'use strict';

const sequelize = require('../../config/database');
const logger = require('../../config/logger');

// Global registry of worker functions: jobType -> workerFn
const workerRegistry = new Map();

class DatabaseQueueProvider {
  constructor() {
    this.registry = workerRegistry;
  }

  /**
   * Enqueues a job into plat_outbox_jobs
   */
  async enqueue(jobType, payload, options = {}) {
    const nextRunAt = options.delay ? new Date(Date.now() + options.delay) : new Date();
    const priority = options.priority || 0;
    const maxAttempts = options.maxAttempts || 5;

    const [result] = await sequelize.query(
      `INSERT INTO plat_outbox_jobs (jobType, payload, priority, status, maxAttempts, nextRunAt, createdAt, updatedAt)
       VALUES (?, ?, ?, 'pending', ?, ?, NOW(), NOW())`,
      {
        replacements: [
          jobType,
          typeof payload === 'object' ? JSON.stringify(payload) : payload,
          priority,
          maxAttempts,
          nextRunAt,
        ]
      }
    );
    return result;
  }

  /**
   * Registers a worker function for a specific jobType
   */
  async process(jobType, workerFn) {
    this.registry.set(jobType, workerFn);
    logger.info(`DatabaseQueueProvider: Registered worker for jobType [${jobType}]`);
  }

  /**
   * Resets a job for retry
   */
  async retry(jobId) {
    await sequelize.query(
      `UPDATE plat_outbox_jobs 
       SET status = 'pending', attempts = 0, nextRunAt = NOW(), lockedAt = NULL, lockedBy = NULL 
       WHERE id = ?`,
      { replacements: [jobId] }
    );
    logger.info(`DatabaseQueueProvider: Reset job [${jobId}] for retry`);
  }

  /**
   * Schedules a delayed job
   */
  async schedule(jobType, payload, nextRunAt, options = {}) {
    return this.enqueue(jobType, payload, { ...options, delay: new Date(nextRunAt).getTime() - Date.now() });
  }

  /**
   * Cancels a pending job
   */
  async cancel(jobId) {
    await sequelize.query(
      `UPDATE plat_outbox_jobs SET status = 'cancelled' WHERE id = ? AND status = 'pending'`,
      { replacements: [jobId] }
    );
    logger.info(`DatabaseQueueProvider: Cancelled job [${jobId}]`);
  }
}

module.exports = DatabaseQueueProvider;
module.exports.workerRegistry = workerRegistry;
