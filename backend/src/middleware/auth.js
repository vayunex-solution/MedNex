'use strict';

const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../helpers/response');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return unauthorized(res, 'Access token required');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'nex_jwt_secret_default_key_9988');
    } catch (localErr) {
      try {
        const introspectResponse = await fetch('https://api.sdk.vayunexsolution.com/api/v1/auth/introspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(5000)
        });
        if (introspectResponse.ok) {
          const introspectResult = await introspectResponse.json();
          if (introspectResult.active) {
            req.user = {
              id: introspectResult.user.id,
              email: introspectResult.user.email,
              role: introspectResult.user.role,
              tenantId: introspectResult.tenantId,
              businessId: introspectResult.businessId,
              branchId: introspectResult.branchId,
            };
            
            const RequestContext = require('../shared/core/context');
            RequestContext.userId = introspectResult.user.id;
            RequestContext.tenantId = introspectResult.tenantId;
            RequestContext.branchId = introspectResult.branchId;
            RequestContext.businessId = introspectResult.businessId;
            RequestContext.permissions = [introspectResult.user.role];
            RequestContext.features = ['billing', 'inventory'];

            return next();
          }
        }
      } catch (npcErr) {
        // Fallback failed
      }
      throw localErr;
    }
    
    // Check if it is a V1 Token (contains sessionId)
    if (decoded.sessionId) {
      const userSessionRepository = require('../platform/identity/userSession.repository');
      const identityService = require('../platform/identity/identity.service');
      const tenantRepository = require('../platform/tenant/tenant.repository');
      
      const session = await userSessionRepository.findOne({ uuid: decoded.sessionId });
      if (!session) return unauthorized(res, 'Active session not found');

      const isActive = await identityService.verifySessionActive(session);
      if (!isActive) return unauthorized(res, 'Session expired due to inactivity');

      // Verify user is active
      const user = await User.findOne({ where: { id: decoded.id, isDeleted: false, isActive: true } });
      if (!user) return unauthorized(res, 'User account is suspended or inactive');

      // Verify tenant is active
      if (decoded.role !== 'super_admin' && decoded.tenantId) {
        const tenant = await tenantRepository.findOne({ id: decoded.tenantId });
        if (!tenant || !tenant.isActive || tenant.status !== 'active') {
          return unauthorized(res, 'Tenant account is suspended or inactive');
        }
      }

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

    // Enforce tenant suspension checks for legacy tokens
    if (user.role !== 'super_admin') {
      const [membership] = await User.sequelize.query(
        `SELECT m.id, t.isActive, t.status 
         FROM plat_user_memberships m
         JOIN plat_tenants t ON m.tenantId = t.id
         WHERE m.userId = :userId AND m.status = 'active' LIMIT 1`,
        {
          replacements: { userId: user.id },
          type: User.sequelize.QueryTypes.SELECT
        }
      );
      if (!membership || !membership.isActive || membership.status !== 'active') {
        return unauthorized(res, 'Tenant account is suspended or inactive');
      }
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    
    // Set RequestContext values dynamically for downstream service layers
    const RequestContext = require('../shared/core/context');
    const userMembershipRepository = require('../platform/identity/userMembership.repository');
    const userMembership = await userMembershipRepository.findOne({ userId: user.id, status: 'active' });
    
    RequestContext.userId = user.id;
    RequestContext.tenantId = userMembership ? userMembership.tenantId : null;
    RequestContext.branchId = userMembership ? userMembership.branchId : null;
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
