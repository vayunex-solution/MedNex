'use strict';

const BaseService = require('../../shared/core/base.service');
const subscriptionRepository = require('./subscription.repository');

class SubscriptionService extends BaseService {
  constructor() {
    super(subscriptionRepository);
  }
}

const subscriptionService = new SubscriptionService();
module.exports = subscriptionService;
