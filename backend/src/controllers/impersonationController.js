'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');
const { success, badRequest, unauthorized } = require('../helpers/response');

const impersonate = async (req, res) => {
  // Strict check: only super_admin can invoke impersonation
  if (req.user.role !== 'super_admin') {
    return unauthorized(res, 'Only Super Admin can invoke impersonation sessions');
  }

  const { tenantId, reason } = req.body;
  if (!tenantId || !reason) {
    return badRequest(res, 'tenantId and reason are required');
  }

  const sessionId = uuidv4();
  const originalAdminId = req.user.id;

  // Resolve target tenant name
  const [tenants] = await sequelize.query(
    'SELECT name FROM plat_tenants WHERE id = ? LIMIT 1',
    { replacements: [tenantId] }
  );
  if (tenants.length === 0) {
    return badRequest(res, 'Target tenant not found');
  }
  const tenantName = tenants[0].name;

  // Generate short-lived JWT (15 minutes)
  const token = jwt.sign(
    {
      id: originalAdminId,
      email: req.user.email,
      role: 'admin',
      impersonatedTenantId: parseInt(tenantId),
      originalAdminId,
      sessionId,
    },
    process.env.JWT_SECRET || 'nex_jwt_secret_default_key_9988',
    { expiresIn: '15m' }
  );

  // Log impersonation to plat_impersonation_logs
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  await sequelize.query(
    `INSERT INTO plat_impersonation_logs (sessionId, adminId, tenantId, reason, ipAddress, userAgent, startedAt, status)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), 'active')`,
    { replacements: [sessionId, originalAdminId, tenantId, reason, ipAddress, userAgent] }
  );

  return success(res, {
    token,
    tenantName,
    tenantId,
  }, 'Impersonation session established');
};

const exitImpersonation = async (req, res) => {
  const sessionId = req.user.impersonationSessionId;
  if (!sessionId) {
    return badRequest(res, 'No active impersonation session found');
  }

  // Update logs
  const [logRows] = await sequelize.query(
    'SELECT startedAt FROM plat_impersonation_logs WHERE sessionId = ? LIMIT 1',
    { replacements: [sessionId] }
  );

  let duration = 0;
  if (logRows.length > 0) {
    duration = Math.floor((Date.now() - new Date(logRows[0].startedAt).getTime()) / 1000);
  }

  await sequelize.query(
    `UPDATE plat_impersonation_logs 
     SET status = 'ended', endedAt = NOW(), duration = ? 
     WHERE sessionId = ?`,
    { replacements: [duration, sessionId] }
  );

  // Generate fresh normal Super Admin token
  const normalToken = jwt.sign(
    {
      id: req.user.id,
      email: req.user.email,
      role: 'super_admin'
    },
    process.env.JWT_SECRET || 'nex_jwt_secret_default_key_9988',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return success(res, { token: normalToken }, 'Impersonation session exited successfully');
};

const getStatus = async (req, res) => {
  if (req.user.isImpersonated) {
    const [tenants] = await sequelize.query(
      'SELECT name FROM plat_tenants WHERE id = ? LIMIT 1',
      { replacements: [req.user.tenantId] }
    );
    return success(res, {
      isImpersonating: true,
      tenantName: tenants[0]?.name || 'Unknown',
      tenantId: req.user.tenantId,
    });
  }
  return success(res, { isImpersonating: false });
};

module.exports = { impersonate, exitImpersonation, getStatus };
