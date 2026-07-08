'use strict';

const BaseService = require('../../shared/core/base.service');
const limitRepository = require('./limit.repository');

class LimitService extends BaseService {
  constructor() {
    super(limitRepository);
  }

  async getLimitValue(tenantId, limitKey, defaultVal = 0) {
    const limit = await this.repository.findOne({ tenantId, limitKey });
    return limit ? limit.limitValue : defaultVal;
  }

  async checkLimitQuota(tenantId, limitKey, currentValue) {
    const maxVal = await this.getLimitValue(tenantId, limitKey, -1);
    if (maxVal === -1) {
      return true; // No limit configured
    }
    return currentValue < maxVal;
  }
}

const limitService = new LimitService();
module.exports = limitService;
