'use strict';

const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../helpers/response');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return unauthorized(res, 'Access token required');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nex_jwt_secret_default_key_9988');
    
    // Check if it is a V1 Token (contains sessionId)
    if (decoded.sessionId) {
      const userSessionRepository = require('../platform/identity/userSession.repository');
      const identityService = require('../platform/identity/identity.service');
      
      const session = await userSessionRepository.findOne({ uuid: decoded.sessionId });
      if (!session) return unauthorized(res, 'Active session not found');

      const isActive = await identityService.verifySessionActive(session);
      if (!isActive) return unauthorized(res, 'Session expired due to inactivity');

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId,
        businessId: decoded.businessId,
        branchId: decoded.branchId,
        sessionId: decoded.sessionId,
        deviceId: decoded.deviceId,
      };

      const RequestContext = require('../shared/core/context');
      RequestContext.userId = decoded.id;
      RequestContext.tenantId = decoded.tenantId;
      RequestContext.branchId = decoded.branchId;
      RequestContext.businessId = decoded.businessId;
      RequestContext.permissions = [decoded.role];
      RequestContext.features = ['billing', 'inventory'];

      return next();
    }

    // Legacy Token fallback
    const user = await User.findOne({ where: { id: decoded.id, isDeleted: false, isActive: true } });
    if (!user) return unauthorized(res, 'User not found or inactive');

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    
    // Set RequestContext values dynamically for downstream service layers
    const RequestContext = require('../shared/core/context');
    RequestContext.userId = user.id;
    RequestContext.permissions = [user.role]; // In legacy, user.role acts as standard permission
    RequestContext.features = ['billing', 'inventory']; // Default feature flags for legacy compatibility
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token expired');
    return unauthorized(res, 'Invalid token');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) return forbidden(res, 'Insufficient permissions');
  next();
};

module.exports = { authenticate, authorize };
