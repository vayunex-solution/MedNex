'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationRateLimit = require('./applicationRateLimit.model');

class ApplicationRateLimitRepository extends BaseRepository {
  constructor() {
    super(ApplicationRateLimit);
  }
}

module.exports = new ApplicationRateLimitRepository();
