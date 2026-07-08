'use strict';

const logger = require('../shared/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`, {
      requestId: req.id,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
    });
  });
  next();
};

module.exports = requestLogger;
