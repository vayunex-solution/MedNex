'use strict';

const sequelize = require('../../config/database');
const { ForbiddenError } = require('../errors/AppError');

class FeaturePolicyEngine {
  /**
   * Resolves capabilities using strict precedence:
   * Tenant Overrides -> Subscription Plan Features -> Core System Features
   */
  async evaluate(tenantId, requiredFeature = null, requiredLimitKey = null, currentCount = 0) {
    if (!tenantId) return true; // Bypass for platform wide/Super Admin operations

    // 1. Verify Tenant Status
    const [tenants] = await sequelize.query(
      'SELECT status, isActive FROM plat_tenants WHERE id = ? LIMIT 1',
      { replacements: [tenantId] }
    );
    const tenant = tenants[0];
    if (tenant && (!tenant.isActive || tenant.status !== 'active')) {
      throw new ForbiddenError('Tenant account is suspended or inactive', 'TENANT_INACTIVE');
    }

    // 2. Resource Limits Check
    if (requiredLimitKey) {
      let maxLimit = 5; // Safe default
      const [settings] = await sequelize.query(
        'SELECT value FROM plat_tenant_settings WHERE tenantId = ? AND `key` = ? LIMIT 1',
        { replacements: [tenantId, `limit.${requiredLimitKey}`] }
      );
      if (settings.length > 0) {
        maxLimit = parseInt(settings[0].value) || 5;
      } else {
        // Plan-based defaults
        const [subs] = await sequelize.query(
          'SELECT planId FROM plat_subscriptions WHERE tenantId = ? AND status = "active" LIMIT 1',
          { replacements: [tenantId] }
        );
        const plan = subs[0]?.planId || 'Starter';
        if (requiredLimitKey === 'max-users') {
          maxLimit = plan === 'Enterprise' ? 100 : (plan === 'Professional' ? 15 : 5);
        } else if (requiredLimitKey === 'max-branches') {
          maxLimit = plan === 'Enterprise' ? 10 : (plan === 'Professional' ? 3 : 1);
        }
      }

      if (currentCount >= maxLimit) {
        throw new ForbiddenError(
          `Resource limit exceeded for ${requiredLimitKey}. Allowed: ${maxLimit}, Current: ${currentCount}`,
          'LIMIT_EXCEEDED'
        );
      }
    }

    // 3. Feature Flag Resolution
    if (requiredFeature) {
      // Priority 1: Tenant Overrides (Custom inclusion/exclusion)
      const [overrides] = await sequelize.query(
        'SELECT isEnabled FROM plat_tenant_feature_overrides WHERE tenantId = ? AND featureKey = ? LIMIT 1',
        { replacements: [tenantId, requiredFeature] }
      );
      if (overrides.length > 0) {
        if (!overrides[0].isEnabled) {
          throw new ForbiddenError(`Feature ${requiredFeature} is disabled for your tenant account`, 'FEATURE_DISABLED');
        }
        return true;
      }

      // Priority 2: Subscription Plan Features
      const [subs] = await sequelize.query(
        'SELECT planId FROM plat_subscriptions WHERE tenantId = ? AND status = "active" LIMIT 1',
        { replacements: [tenantId] }
      );
      if (subs.length > 0) {
        const planId = subs[0].planId;
        const [planFeats] = await sequelize.query(
          'SELECT 1 FROM plat_plan_features WHERE planId = ? AND featureKey = ? LIMIT 1',
          { replacements: [planId, requiredFeature] }
        );
        if (planFeats.length > 0) {
          return true;
        }
      }

      // Priority 3: Core System Features (Default active)
      const coreFeatures = ['pos-billing', 'inventory-tracking'];
      if (coreFeatures.includes(requiredFeature)) {
        return true;
      }

      throw new ForbiddenError(`Feature ${requiredFeature} is not supported on your current subscription plan`, 'FEATURE_DISABLED');
    }

    return true;
  }
}

const featurePolicyEngine = new FeaturePolicyEngine();
module.exports = featurePolicyEngine;
