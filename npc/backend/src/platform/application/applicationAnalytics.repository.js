'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationAnalytics = require('./applicationAnalytics.model');

class ApplicationAnalyticsRepository extends BaseRepository {
  constructor() {
    super(ApplicationAnalytics);
  }
}

module.exports = new ApplicationAnalyticsRepository();
