'use strict';

const rbacService = require('../platform/rbac/rbac.service');
const { ForbiddenError } = require('../shared/errors/AppError');

/**
   * Middleware to check if a user has a specific permission
   */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User context not authenticated');
      }
      
      const hasAccess = await rbacService.checkPermission(req.user.role, requiredPermission);
      if (!hasAccess) {
        throw new ForbiddenError(`Permission denied: requires '${requiredPermission}'`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { checkPermission };
