'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApiKey = require('./apiKey.model');

class ApiKeyRepository extends BaseRepository {
  constructor() {
    super(ApiKey);
  }
}

const apiKeyRepository = new ApiKeyRepository();
module.exports = apiKeyRepository;
