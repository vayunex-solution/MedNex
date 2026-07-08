'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const RefreshToken = require('./refreshToken.model');

class RefreshTokenRepository extends BaseRepository {
  constructor() {
    super(RefreshToken);
  }
}

const refreshTokenRepository = new RefreshTokenRepository();
module.exports = refreshTokenRepository;
