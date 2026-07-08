'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const Subscription = require('./subscription.model');

class SubscriptionRepository extends BaseRepository {
  constructor() {
    super(Subscription);
  }
}

const subscriptionRepository = new SubscriptionRepository();
module.exports = subscriptionRepository;
