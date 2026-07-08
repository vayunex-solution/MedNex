'use strict';

const logger = require('../shared/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMsg = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`;

    logger.info(logMsg, {
      requestId: req.id,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
    });

    // Ship log copy to NPC Platform Centralized Logs if enabled
    if (process.env.NPC_ENABLED === 'true' && process.env.NPC_CLIENT_ID) {
      const npcApiUrl = process.env.NPC_API_URL || 'https://api.sdk.vayunexsolution.com/api/v1';
      const apiKey = process.env.NPC_CLIENT_ID;

      // Async fetch call to prevent blocking MedNex request execution loop
      fetch(`${npcApiUrl}/platform/telemetry/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          environment: process.env.NODE_ENV || 'production',
          level: res.statusCode >= 400 ? (res.statusCode >= 500 ? 'error' : 'warn') : 'info',
          message: logMsg,
          meta: JSON.stringify({
            requestId: req.id,
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user ? req.user.id : null,
          }),
        }),
      }).catch(() => {
        // Silent catch to prevent telemetry faults from leaking into client flows
      });
    }
  });
  next();
};

module.exports = requestLogger;
