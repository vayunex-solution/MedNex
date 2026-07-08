'use strict';

const subscriptionRepository = require('../../platform/subscription/subscription.repository');
const licenseRepository = require('../../platform/license/license.model'); // Use direct model to check if repo exists or load dynamically
const { ForbiddenError } = require('../errors/AppError');

class FeaturePolicyEngine {
  /**
   * Compose and evaluate policy checks for a Tenant's capabilities
   */
  async evaluate(tenantId, requiredFeature = null, requiredLimitKey = null, currentCount = 0) {
    // 1. Fetch Subscription
    const subscription = await subscriptionRepository.findOne({ tenantId });
    if (!subscription || subscription.status !== 'active') {
      throw new ForbiddenError('Tenant has no active subscription plans', 'SUBSCRIPTION_REQUIRED');
    }

    // 2. Fetch License details (generic check)
    const License = require('../../platform/license/license.model');
    const license = await License.findOne({ where: { tenantId } });
    if (license && new Date(license.expiresAt) < new Date()) {
      throw new ForbiddenError('Platform license has expired', 'LICENSE_EXPIRED');
    }

    // 3. Enforce Limit checks
    if (requiredLimitKey && license) {
      let maxLimit = 1;
      if (requiredLimitKey === 'max-businesses') {
        maxLimit = license.licenseType === 'Premium' ? 5 : 1;
      } else if (requiredLimitKey === 'max-branches') {
        maxLimit = license.maxBranches || 1;
      } else if (requiredLimitKey === 'max-users') {
        maxLimit = license.maxUsers || 5;
      }

      if (currentCount >= maxLimit) {
        throw new ForbiddenError(
          `Resource limit exceeded. Limit: ${maxLimit}, Current: ${currentCount}`,
          'LIMIT_EXCEEDED'
        );
      }
    }

    // 4. Feature Flag check
    if (requiredFeature) {
      const Feature = require('../../platform/feature/feature.model');
      const feature = await Feature.findOne({ where: { tenantId, featureKey: requiredFeature } });
      if (!feature || !feature.isEnabled) {
        throw new ForbiddenError(`Feature ${requiredFeature} is not enabled for this tenant`, 'FEATURE_DISABLED');
      }
    }

    return true;
  }
}

const featurePolicyEngine = new FeaturePolicyEngine();
module.exports = featurePolicyEngine;
