'use strict';

const logger = require('../config/logger');
const { error } = require('../helpers/response');

const errorHandler = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path, method: req.method });

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return error(res, 'Validation error', 422, errors);
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return error(res, 'Related record not found', 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  return error(res, message, statusCode);
};

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = { errorHandler, AppError };
