'use strict';

const RequestContext = require('../shared/core/context');
const tenantResolver = require('../platform/tenant/tenantResolver');

const contextMiddleware = async (req, res, next) => {
  try {
    const tenantId = await tenantResolver.resolveTenant(req);
    const branchId = req.headers['x-branch-id'] || req.query.branchId || null;
    const businessId = req.headers['x-business-id'] || req.query.businessId || null;

    const store = {
      tenantId: tenantId ? parseInt(tenantId) : null,
      branchId: branchId ? parseInt(branchId) : null,
      businessId: businessId ? parseInt(businessId) : null,
      userId: req.user ? req.user.id : null,
      permissions: req.user ? req.user.permissions || [] : [],
      features: req.user ? req.user.features || [] : [],
      correlationId: req.correlationId || null,
    };

    RequestContext.run(store, () => {
      next();
    });
  } catch (err) {
    next(err);
  }
};

module.exports = contextMiddleware;
