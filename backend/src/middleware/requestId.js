'use strict';

const crypto = require('crypto');

const requestId = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  const correlationId = req.headers['x-correlation-id'] || req.headers['correlation-id'] || crypto.randomUUID();

  req.id = reqId;
  req.correlationId = correlationId;

  res.setHeader('x-request-id', reqId);
  res.setHeader('x-correlation-id', correlationId);

  next();
};

module.exports = requestId;
