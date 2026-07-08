'use strict';

const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const created = (res, data = null, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const paginated = (res, data, count, page, limit, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  });
};

const error = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({ success: false, message, errors });
};

const notFound = (res, message = 'Resource not found') => error(res, message, 404);
const badRequest = (res, message = 'Bad request', errors = null) => error(res, message, 400, errors);
const unauthorized = (res, message = 'Unauthorized') => error(res, message, 401);
const forbidden = (res, message = 'Forbidden') => error(res, message, 403);

module.exports = { success, created, paginated, error, notFound, badRequest, unauthorized, forbidden };
