'use strict';

const logger = require('../config/logger');
const ApiResponse = require('../shared/response/ApiResponse');

const errorHandler = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path, method: req.method });

  let statusCode = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Internal server error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let errors = err.errors || null;

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    statusCode = 422;
    message = 'Validation error';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Related record not found';
    errorCode = 'FOREIGN_KEY_VIOLATION';
  } else if (err.name === 'SequelizeOptimisticLockError') {
    statusCode = 409;
    message = 'Concurrent overwrite conflict detected. The record has been modified by another process. Please reload and retry.';
    errorCode = 'CONCURRENT_OVERWRITE_CONFLICT';
  }

  return ApiResponse.error(res, message, statusCode, errorCode, errors);
};

class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

module.exports = { errorHandler, AppError };
