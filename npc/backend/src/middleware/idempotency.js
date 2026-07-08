'use strict';

const IdempotencyKey = require('../shared/core/idempotency.model');
const logger = require('../config/logger');

const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) {
    return next();
  }

  try {
    const existing = await IdempotencyKey.findOne({ where: { key } });
    if (existing) {
      if (existing.status === 'processing') {
        return res.status(409).json({
          success: false,
          message: 'Concurrent duplicate request currently in progress. Please retry shortly.',
        });
      } else if (existing.status === 'completed') {
        const body = JSON.parse(existing.responseBody);
        return res.status(existing.responseStatus).json(body);
      }
    }

    // Insert key with processing status
    await IdempotencyKey.create({ key, status: 'processing' });

    // Intercept standard response functions
    const originalJson = res.json;
    res.json = function (body) {
      const responseStatus = res.statusCode;
      
      // Update key asynchronously
      if (responseStatus >= 200 && responseStatus < 300) {
        IdempotencyKey.update({
          status: 'completed',
          responseStatus,
          responseBody: JSON.stringify(body),
        }, { where: { key } }).catch(err => logger.error('[Idempotency] Failed to save key response:', err));
      } else {
        // If error response (e.g. 400, 500), delete key to allow client retry
        IdempotencyKey.destroy({ where: { key } }).catch(err => logger.error('[Idempotency] Failed to delete key:', err));
      }

      return originalJson.call(this, body);
    };

    next();
  } catch (err) {
    logger.error('[Idempotency] Middleware execution error:', err);
    next(err);
  }
};

module.exports = idempotencyMiddleware;
