'use strict';

const crypto = require('crypto');
const platformAuditRepository = require('./platformAudit.repository');
const tenantAuditRepository = require('./tenantAudit.repository');
const eventBus = require('../../shared/events');
const logger = require('../../shared/logger');
const { getProvider } = require('../../shared/core/LockProvider');

class AuditService {
  constructor() {
    eventBus.subscribe('audit:platform', (payload) => this._handlePlatformAudit(payload));
    eventBus.subscribe('audit:tenant', (payload) => this._handleTenantAudit(payload));
  }

  _computeHMAC(payload, previousHash) {
    const secret = process.env.AUDIT_LOG_SECRET || 'platform-audit-secret-key';
    const data = JSON.stringify({
      userId: payload.userId,
      tenantId: payload.tenantId,
      action: payload.action,
      module: payload.module,
      details: payload.details,
      ipAddress: payload.ipAddress,
      correlationId: payload.correlationId,
      beforeValue: payload.beforeValue,
      afterValue: payload.afterValue,
      userAgent: payload.userAgent,
      operationReason: payload.operationReason,
      previousHash
    });
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  async _handlePlatformAudit(payload) {
    const lockProvider = getProvider();
    const lockKey = 'lock:audit:platform';
    
    // Acquire distributed lock to prevent concurrent hashing race conditions
    await lockProvider.acquire(lockKey, 3000);

    try {
      // Find the last record to get previousHash
      const lastAudit = await platformAuditRepository.model.findOne({
        order: [['id', 'DESC']],
        logging: false
      });

      const previousHash = lastAudit ? lastAudit.recordHash : '0000000000000000000000000000000000000000000000000000000000000000';
      const recordHash = this._computeHMAC(payload, previousHash);

      await platformAuditRepository.create({
        userId: payload.userId,
        action: payload.action,
        module: payload.module,
        details: payload.details,
        ipAddress: payload.ipAddress,
        correlationId: payload.correlationId,
        beforeValue: payload.beforeValue,
        afterValue: payload.afterValue,
        userAgent: payload.userAgent,
        operationReason: payload.operationReason,
        previousHash,
        recordHash
      });
    } catch (err) {
      logger.error('[AuditService] Failed to record platform audit log:', err);
    } finally {
      await lockProvider.release(lockKey);
    }
  }

  async _handleTenantAudit(payload) {
    const lockProvider = getProvider();
    const lockKey = `lock:audit:tenant:${payload.tenantId}`;
    
    await lockProvider.acquire(lockKey, 3000);

    try {
      const lastAudit = await tenantAuditRepository.model.findOne({
        where: { tenantId: payload.tenantId },
        order: [['id', 'DESC']],
        logging: false
      });

      const previousHash = lastAudit ? lastAudit.recordHash : '0000000000000000000000000000000000000000000000000000000000000000';
      const recordHash = this._computeHMAC(payload, previousHash);

      await tenantAuditRepository.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        action: payload.action,
        module: payload.module,
        details: payload.details,
        ipAddress: payload.ipAddress,
        correlationId: payload.correlationId,
        beforeValue: payload.beforeValue,
        afterValue: payload.afterValue,
        userAgent: payload.userAgent,
        operationReason: payload.operationReason,
        previousHash,
        recordHash
      });
    } catch (err) {
      logger.error('[AuditService] Failed to record tenant audit log:', err);
    } finally {
      await lockProvider.release(lockKey);
    }
  }

  logPlatformAction(userId, action, module, details = null, ipAddress = null, extra = {}) {
    eventBus.publish('audit:platform', {
      userId,
      action,
      module,
      details,
      ipAddress,
      correlationId: extra.correlationId || null,
      beforeValue: extra.beforeValue ? JSON.stringify(extra.beforeValue) : null,
      afterValue: extra.afterValue ? JSON.stringify(extra.afterValue) : null,
      userAgent: extra.userAgent || null,
      operationReason: extra.operationReason || null
    });
  }

  logTenantAction(tenantId, userId, action, module, details = null, ipAddress = null, extra = {}) {
    eventBus.publish('audit:tenant', {
      tenantId,
      userId,
      action,
      module,
      details,
      ipAddress,
      correlationId: extra.correlationId || null,
      beforeValue: extra.beforeValue ? JSON.stringify(extra.beforeValue) : null,
      afterValue: extra.afterValue ? JSON.stringify(extra.afterValue) : null,
      userAgent: extra.userAgent || null,
      operationReason: extra.operationReason || null
    });
  }

  // Validate the integrity of the audit chain
  async verifyChain() {
    try {
      const audits = await platformAuditRepository.model.findAll({ order: [['id', 'ASC']] });
      let currentExpectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
      
      for (const entry of audits) {
        if (entry.previousHash !== currentExpectedPrev) {
          return { isValid: false, brokenAtId: entry.id, reason: 'Chaining mismatch' };
        }
        
        const computed = this._computeHMAC(entry, entry.previousHash);
        if (entry.recordHash !== computed) {
          return { isValid: false, brokenAtId: entry.id, reason: 'Hash signature mismatch' };
        }
        
        currentExpectedPrev = entry.recordHash;
      }
      return { isValid: true };
    } catch (err) {
      logger.error('[AuditService] Chain verification failed:', err);
      return { isValid: false, error: err.message };
    }
  }
}

const auditService = new AuditService();
module.exports = auditService;
