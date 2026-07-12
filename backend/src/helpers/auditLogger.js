'use strict';

const { AuditLog } = require('../models');

/**
 * Utility to write logs into the audit_logs table.
 * @param {object} req - Express Request object
 * @param {string} action - Action performed (e.g. 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} module - The feature area (e.g. 'Sales', 'Purchase', 'Finance')
 * @param {string} details - Detailed text description of what changed
 */
const logAudit = async (req, action, module, details) => {
  try {
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      action,
      module,
      details,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1',
    });
  } catch (e) {
    console.error('Audit Log writing failed:', e.message);
  }
};

module.exports = { logAudit };
