'use strict';

class ApiResponse {
  static getMetadata(res) {
    const req = res.req;
    const reqId = req ? req.id : null;
    const correlationId = req ? req.correlationId : null;
    return {
      requestId: reqId,
      correlationId: correlationId,
      timestamp: new Date().toISOString(),
      apiVersion: '1.0.0',
      supportedVersions: ['v1'],
      deprecation: null,
    };
  }

  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta: this.getMetadata(res),
    });
  }

  static created(res, data = null, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static paginated(res, data, count, page, limit, message = 'Success') {
    const totalPages = Math.ceil(count / limit);
    const currentPage = Number(page);
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total: count,
        page: currentPage,
        limit: Number(limit),
        totalPages,
      },
      meta: {
        ...this.getMetadata(res),
        total: count,
        page: currentPage,
        limit: Number(limit),
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    });
  }

  static error(res, message = 'An error occurred', statusCode = 500, errorCode = 'INTERNAL_ERROR', errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      errors,
      meta: this.getMetadata(res),
    });
  }
}

module.exports = ApiResponse;
