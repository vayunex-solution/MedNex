'use strict';

const crypto = require('crypto');
const sequelize = require('../config/database');
const RequestContext = require('../shared/core/context');

// Simple in-memory rate limiter for cPanel (fallback)
const ipRateLimits = new Map();

const authorizeApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, message: 'API Key required. Provide x-api-key header.' });
  }

  // Hash key to find match
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const [keys] = await sequelize.query(
    `SELECT * FROM plat_api_keys 
     WHERE keyHash = ? AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > NOW()) 
     LIMIT 1`,
    { replacements: [hash] }
  );

  const keyRecord = keys[0];
  if (!keyRecord) {
    return res.status(401).json({ success: false, message: 'Invalid or expired API Key' });
  }

  // Rate Limiting Check
  const now = Date.now();
  const clientKey = `apikey:${keyRecord.id}`;
  const requestTimestamps = ipRateLimits.get(clientKey) || [];
  const activeRequests = requestTimestamps.filter(t => now - t < 60000);
  
  if (activeRequests.length >= keyRecord.rateLimit) {
    return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
  }
  
  activeRequests.push(now);
  ipRateLimits.set(clientKey, activeRequests);

  // Update lastUsedAt
  sequelize.query(
    'UPDATE plat_api_keys SET lastUsedAt = NOW() WHERE id = ?',
    { replacements: [keyRecord.id] }
  ).catch(() => {});

  // Setup request context
  let parsedScopes = [];
  try {
    parsedScopes = JSON.parse(keyRecord.scopes);
  } catch (_) {
    parsedScopes = [];
  }

  req.user = {
    id: keyRecord.createdBy,
    tenantId: keyRecord.tenantId,
    role: 'api_client',
    scopes: parsedScopes,
  };

  RequestContext.userId = keyRecord.createdBy;
  RequestContext.tenantId = keyRecord.tenantId;
  RequestContext.branchId = null;
  RequestContext.permissions = ['api_client'];

  next();
};

const checkScope = (requiredScope) => (req, res, next) => {
  if (!req.user || !req.user.scopes || (!req.user.scopes.includes(requiredScope) && !req.user.scopes.includes('*'))) {
    return res.status(403).json({ success: false, message: `Forbidden: Missing required scope [${requiredScope}]` });
  }
  next();
};

module.exports = { authorizeApiKey, checkScope };
