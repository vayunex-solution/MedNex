'use strict';

require('dotenv').config();
const sequelize = require('../../config/database');
const logger = require('../../config/logger');
const { workerRegistry } = require('./DatabaseQueueProvider');

// ─── Import & Initialize Workers to Register them in workerRegistry ──────────
const emailService = require('../../helpers/emailService');

// 1. Email worker
workerRegistry.set('send-email', async (payload) => {
  const { tenantId, to, subject, html } = payload;
  await emailService.sendEmail({ tenantId, to, subject, html });
});

// 2. Campaign email worker
workerRegistry.set('send-campaign-email', async (payload) => {
  const { tenantId, to, subject, html, logId } = payload;
  try {
    await emailService.sendEmail({ tenantId, to, subject, html });
    // Update campaign log status to 'delivered'
    await sequelize.query(
      'UPDATE plat_email_campaign_logs SET status = "delivered", sentAt = NOW() WHERE id = ?',
      { replacements: [logId] }
    );
  } catch (err) {
    await sequelize.query(
      'UPDATE plat_email_campaign_logs SET status = "failed", lastError = ? WHERE id = ?',
      { replacements: [err.message, logId] }
    );
    throw err;
  }
});

// 3. Webhook dispatch worker
const crypto = require('crypto');
const axios = require('axios');
workerRegistry.set('webhook-dispatch', async (payload) => {
  const { url, secretKey, event, data, logId } = payload;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(JSON.stringify(data))
    .digest('hex');

  const start = Date.now();
  try {
    const res = await axios.post(url, { event, data }, {
      headers: {
        'Content-Type': 'application/json',
        'X-MedNex-Signature': signature,
      },
      timeout: 10000,
    });
    const latency = Date.now() - start;
    // Log success
    await sequelize.query(
      `UPDATE plat_outbox_jobs 
       SET status = 'completed', finishedAt = NOW() 
       WHERE id = ?`,
      { replacements: [logId] }
    );
    logger.info(`Webhook successfully sent to ${url}`);
  } catch (err) {
    const latency = Date.now() - start;
    logger.error(`Webhook dispatch failed to ${url}: ${err.message}`);
    throw err;
  }
});

/**
 * Main queue runner function
 */
const run = async () => {
  logger.info('Queue runner: starting outbox processing tick...');
  await sequelize.authenticate();

  const lockId = `runner-${process.pid}-${Date.now()}`;

  // Lock pending jobs
  const [lockResult] = await sequelize.query(
    `UPDATE plat_outbox_jobs 
     SET status = 'processing', lockedAt = NOW(), lockedBy = ? 
     WHERE status = 'pending' AND nextRunAt <= NOW()`,
    { replacements: [lockId] }
  );

  if (lockResult.affectedRows === 0) {
    logger.info('Queue runner: No pending jobs found.');
    return;
  }

  // Fetch locked jobs
  const [jobs] = await sequelize.query(
    'SELECT * FROM plat_outbox_jobs WHERE status = "processing" AND lockedBy = ?',
    { replacements: [lockId] }
  );

  logger.info(`Queue runner: locked ${jobs.length} jobs to process.`);

  for (const job of jobs) {
    const workerFn = workerRegistry.get(job.jobType);
    if (!workerFn) {
      const err = `No worker registered for job type [${job.jobType}]`;
      logger.error(err);
      await sequelize.query(
        'UPDATE plat_outbox_jobs SET status = "failed", lockedAt = NULL, lockedBy = NULL, lastError = ? WHERE id = ?',
        { replacements: [err, job.id] }
      );
      continue;
    }

    let payloadObj = {};
    try {
      payloadObj = JSON.parse(job.payload);
    } catch (_) {
      payloadObj = job.payload;
    }

    try {
      await workerFn(payloadObj);
      // Mark as completed
      await sequelize.query(
        'UPDATE plat_outbox_jobs SET status = "completed", lockedAt = NULL, lockedBy = NULL, finishedAt = NOW(), attempts = attempts + 1 WHERE id = ?',
        { replacements: [job.id] }
      );
    } catch (err) {
      const nextAttempt = job.attempts + 1;
      const backoffDelay = Math.pow(2, nextAttempt) * 10000; // exponential backoff in ms (10s, 20s, 40s...)
      const nextRunAt = new Date(Date.now() + backoffDelay);

      if (nextAttempt >= job.maxAttempts) {
        // Mark failed
        await sequelize.query(
          'UPDATE plat_outbox_jobs SET status = "failed", lockedAt = NULL, lockedBy = NULL, lastError = ?, attempts = ? WHERE id = ?',
          { replacements: [err.message, nextAttempt, job.id] }
        );
      } else {
        // Reset to pending with backoff delay
        await sequelize.query(
          'UPDATE plat_outbox_jobs SET status = "pending", lockedAt = NULL, lockedBy = NULL, nextRunAt = ?, lastError = ?, attempts = ? WHERE id = ?',
          { replacements: [nextRunAt, err.message, nextAttempt, job.id] }
        );
      }
    }
  }

  logger.info('Queue runner: outbox processing tick completed.');
};

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Queue runner fatal crash:', err);
      process.exit(1);
    });
}

module.exports = { run };
