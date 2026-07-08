'use strict';

const BaseService = require('../../shared/core/base.service');
const featureRepository = require('./feature.repository');

class FeatureService extends BaseService {
  constructor() {
    super(featureRepository);
  }

  async isFeatureEnabled(tenantId, featureKey) {
    const feature = await this.repository.findOne({ tenantId, featureKey });
    return feature ? feature.isEnabled : false;
  }
}

const featureService = new FeatureService();
module.exports = featureService;
