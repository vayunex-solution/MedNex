'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const LoginRateLimit = require('./loginRateLimit.model');

class LoginRateLimitRepository extends BaseRepository {
  constructor() {
    super(LoginRateLimit);
  }
}

const loginRateLimitRepository = new LoginRateLimitRepository();
module.exports = loginRateLimitRepository;
