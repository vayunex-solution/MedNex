'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationApiKey = require('./applicationApiKey.model');

class ApplicationApiKeyRepository extends BaseRepository {
  constructor() {
    super(ApplicationApiKey);
  }
}

module.exports = new ApplicationApiKeyRepository();
