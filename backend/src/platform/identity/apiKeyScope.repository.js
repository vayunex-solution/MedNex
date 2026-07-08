'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApiKeyScope = require('./apiKeyScope.model');

class ApiKeyScopeRepository extends BaseRepository {
  constructor() {
    super(ApiKeyScope);
  }
}

const apiKeyScopeRepository = new ApiKeyScopeRepository();
module.exports = apiKeyScopeRepository;
