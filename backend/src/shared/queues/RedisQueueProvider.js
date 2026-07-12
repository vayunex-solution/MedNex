'use strict';

const logger = require('../../config/logger');

class RedisQueueProvider {
  constructor() {
    // Lazy load BullMQ so it doesn't crash on standard cPanel where redis/bullmq isn't installed
    const { Queue, Worker } = require('bullmq');
    this.Queue = Queue;
    this.Worker = Worker;
    this.connection = { url: process.env.REDIS_URL };
    this.queues = new Map();
    this.workers = new Map();
  }

  getQueue(jobType) {
    if (!this.queues.has(jobType)) {
      const q = new this.Queue(jobType, { connection: this.connection });
      this.queues.set(jobType, q);
    }
    return this.queues.get(jobType);
  }

  async enqueue(jobType, payload, options = {}) {
    const q = this.getQueue(jobType);
    const opts = {};
    if (options.delay) opts.delay = options.delay;
    if (options.priority) opts.priority = options.priority;
    if (options.maxAttempts) {
      opts.attempts = options.maxAttempts;
      opts.backoff = { type: 'exponential', delay: 5000 };
    }
    const job = await q.add('default', payload, opts);
    return job.id;
  }

  async process(jobType, workerFn) {
    if (this.workers.has(jobType)) return;
    const worker = new this.Worker(jobType, async (job) => {
      return workerFn(job.data);
    }, { connection: this.connection });
    this.workers.set(jobType, worker);
    logger.info(`RedisQueueProvider: Registered BullMQ worker for [${jobType}]`);
  }

  async retry(jobId) {
    // BullMQ handles retries via job.retry() inside worker or via GUI dashboard
    logger.info(`RedisQueueProvider: BullMQ job [${jobId}] retry is handled automatically or via dashboard`);
  }

  async schedule(jobType, payload, nextRunAt, options = {}) {
    const delay = new Date(nextRunAt).getTime() - Date.now();
    return this.enqueue(jobType, payload, { ...options, delay: delay > 0 ? delay : 0 });
  }

  async cancel(jobId) {
    logger.info(`RedisQueueProvider: BullMQ job [${jobId}] cancellation requested`);
  }
}

module.exports = RedisQueueProvider;
