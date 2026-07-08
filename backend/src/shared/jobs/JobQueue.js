'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const platBackgroundJobsRepository = require('./platBackgroundJobs.repository');
const logger = require('../logger');

class JobQueue {
  constructor() {
    this.handlers = new Map();
    this.isProcessing = false;
    this.intervalId = null;
    this.metrics = {
      completedCount: 0,
      failedCount: 0,
      deadCount: 0,
      totalDurationMs: 0
    };
  }

  registerHandler(taskName, handler) {
    this.handlers.set(taskName, handler);
    logger.debug(`[JobQueue] Registered handler for task: ${taskName}`);
  }

  async enqueue(taskName, payload = {}, options = {}) {
    const runAt = options.delayMs ? new Date(Date.now() + options.delayMs) : new Date(Date.now() - 10000);
    const maxAttempts = options.maxAttempts || 3;
    const queue = options.queue || 'default';

    const job = await platBackgroundJobsRepository.create({
      uuid: crypto.randomUUID(),
      queue,
      taskName,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      maxAttempts,
      runAt,
      lockedUntil: null
    });

    logger.debug(`[JobQueue] Enqueued job ${job.uuid} for task ${taskName}`);
    // Instantly trigger poll to process without waiting for interval
    this.poll().catch(() => null);
    return job;
  }

  async start(intervalMs = 3000) {
    if (this.intervalId) return;
    await this.resumePending();
    this.intervalId = setInterval(() => this.poll(), intervalMs);
    logger.info(`[JobQueue] Background worker started. Polling interval: ${intervalMs}ms`);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async resumePending() {
    try {
      // Revert all interrupted 'running' jobs back to 'pending'
      const count = await platBackgroundJobsRepository.bulkUpdate(
        { status: 'running' },
        { status: 'pending', lockedUntil: null }
      );
      if (count > 0) {
        logger.info(`[JobQueue] Resumed ${count} stalled/running background jobs.`);
      }
    } catch (err) {
      logger.error('[JobQueue] Failed to resume stalled jobs:', err);
    }
  }

  async poll() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Fetch ready jobs
      const readyJobs = await platBackgroundJobsRepository.findMany({
        status: { [Op.in]: ['pending', 'failed'] },
        runAt: { [Op.lte]: now },
        [Op.or]: [
          { lockedUntil: null },
          { lockedUntil: { [Op.lt]: now } }
        ]
      });

      for (const job of readyJobs) {
        await this._processJob(job);
      }
    } catch (err) {
      logger.error('[JobQueue] Error during job queue polling:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  async _processJob(job) {
    // 1. Lock the job to prevent other workers from processing it
    const lockTtlMs = 60000; // 1 minute lock
    const lockedUntil = new Date(Date.now() + lockTtlMs);
    
    const [updatedCount] = await platBackgroundJobsRepository.bulkUpdate(
      { 
        id: job.id, 
        status: { [Op.in]: ['pending', 'failed'] } 
      },
      { 
        status: 'running', 
        lockedUntil, 
        attempts: job.attempts + 1 
      }
    );

    if (updatedCount === 0) return; // Already locked by another worker

    const startTime = Date.now();
    const handler = this.handlers.get(job.taskName);

    try {
      if (!handler) {
        throw new Error(`No registered handler found for task: ${job.taskName}`);
      }

      const payload = JSON.parse(job.payload || '{}');
      await handler(payload);

      // Mark as completed
      await platBackgroundJobsRepository.update(job.id, {
        status: 'completed',
        lockedUntil: null
      });

      this.metrics.completedCount++;
      this.metrics.totalDurationMs += (Date.now() - startTime);

      logger.debug(`[JobQueue] Job ${job.uuid} completed successfully.`);
    } catch (err) {
      logger.error(`[JobQueue] Job ${job.uuid} failed:`, err);
      const isDead = (job.attempts + 1) >= job.maxAttempts;

      await platBackgroundJobsRepository.update(job.id, {
        status: isDead ? 'dead' : 'failed',
        error: err.stack,
        lockedUntil: null,
        // Wait 10 seconds before retrying to prevent hot loops
        runAt: new Date(Date.now() + 10000)
      });

      if (isDead) {
        this.metrics.deadCount++;
      } else {
        this.metrics.failedCount++;
      }
    }
  }

  async getMetrics() {
    const states = ['pending', 'running', 'completed', 'failed', 'dead'];
    const counts = {};

    for (const status of states) {
      counts[status] = await platBackgroundJobsRepository.count({ status });
    }

    const totalProcessed = this.metrics.completedCount + this.metrics.failedCount + this.metrics.deadCount;
    const avgDuration = totalProcessed > 0 ? (this.metrics.totalDurationMs / totalProcessed) : 0;

    return {
      pending: counts.pending,
      running: counts.running,
      completed: counts.completed,
      failed: counts.failed,
      dead: counts.dead,
      avgExecutionDurationMs: Math.round(avgDuration)
    };
  }
}

const jobQueue = new JobQueue();
module.exports = jobQueue;
