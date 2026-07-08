'use strict';

const operationJobRepository = require('./operationJob.repository');
const applicationRepository = require('./application.repository');
const ApplicationConnector = require('./applicationConnector');
const logger = require('../../shared/logger');
const { Op } = require('sequelize');

class OperationJobEngine {
  constructor() {
    this.isProcessing = false;
    this.timerId = null;
  }

  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const sequelize = require('../../config/database');

    try {
      await sequelize.transaction(async (t) => {
        const now = new Date();
        const jobs = await operationJobRepository.model.findAll({
          where: {
            status: {
              [Op.in]: ['pending', 'queued', 'retrying']
            },
            [Op.or]: [
              { nextAttemptAt: null },
              { nextAttemptAt: { [Op.lte]: now } }
            ]
          },
          order: [['createdAt', 'ASC']],
          limit: 10,
          lock: t.LOCK.UPDATE,
          transaction: t
        });

        for (const job of jobs) {
          // Instantly lock and set state to queued/running within transaction
          await job.update({ status: 'running' }, { transaction: t });
          // Spawn execution asynchronously to keep transactions short
          setImmediate(() => this._executeJob(job));
        }
      });
    } catch (err) {
      logger.error('[OperationJobEngine] Error polling jobs in transaction:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  async _executeJob(job) {
    logger.info(`[OperationJobEngine] Executing job ${job.uuid} (${job.operationType})`);

    try {
      const app = await applicationRepository.findOne({ id: job.applicationId });
      if (!app) {
        throw new Error(`Application ID ${job.applicationId} not found in registry`);
      }

      // Load SDK credentials and decrypt client secret
      const applicationSdkCredentialRepository = require('./applicationSdkCredential.repository');
      const sdkCreds = await applicationSdkCredentialRepository.findOne({ applicationId: app.id });
      if (sdkCreds) {
        app.clientId = sdkCreds.clientId;
        const platformApplicationService = require('./platformApplication.service');
        app.clientSecret = platformApplicationService.decryptSecret(sdkCreds.clientSecret);
      }

      // Parse payload
      const payload = JSON.parse(job.payload);

      // Instantiate connector and trigger dispatch
      const connector = new ApplicationConnector(app);
      let result;

      switch (job.operationType) {
        case 'provision':
          result = await connector.provision(payload);
          break;
        case 'deprovision':
          result = await connector.deprovision(payload);
          break;
        case 'suspend':
          result = await connector.suspend(payload);
          break;
        case 'resume':
          result = await connector.resume(payload);
          break;
        case 'sync':
          result = await connector.sync(payload);
          break;
        case 'rotate':
          result = await connector.rotateSecrets(payload);
          break;
        default:
          throw new Error(`Unsupported operation type: ${job.operationType}`);
      }

      if (result.ok) {
        logger.info(`[OperationJobEngine] Job ${job.uuid} completed successfully`);
        await job.update({
          status: 'completed',
          completedAt: new Date(),
          lastError: null
        });
      } else {
        const errorMsg = result.error || `HTTP Status ${result.status}: ${JSON.stringify(result.data)}`;
        throw new Error(errorMsg);
      }
    } catch (err) {
      logger.error(`[OperationJobEngine] Job ${job.uuid} failed:`, err.message);

      const nextRetryCount = job.retryCount + 1;
      const maxRetries = job.maxRetries || 5;

      if (nextRetryCount >= maxRetries) {
        await job.update({
          status: 'failed',
          retryCount: nextRetryCount,
          lastError: err.message,
          completedAt: new Date()
        });
      } else {
        // Exponential backoff: 2^retryCount * 2 seconds
        const backoffMs = Math.pow(2, nextRetryCount) * 2000;
        const nextAttemptAt = new Date(Date.now() + backoffMs);

        await job.update({
          status: 'retrying',
          retryCount: nextRetryCount,
          lastError: err.message,
          nextAttemptAt
        });
      }
    }
  }

  start(intervalMs = 5000) {
    if (this.timerId) return;
    this.timerId = setInterval(() => this.processJobs(), intervalMs);
    logger.info(`[OperationJobEngine] Background worker started with interval ${intervalMs}ms`);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      logger.info('[OperationJobEngine] Background worker stopped');
    }
  }
}

module.exports = new OperationJobEngine();
