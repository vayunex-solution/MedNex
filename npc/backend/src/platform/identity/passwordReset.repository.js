'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const PasswordReset = require('./passwordReset.model');

class PasswordResetRepository extends BaseRepository {
  constructor() {
    super(PasswordReset);
  }
}

const passwordResetRepository = new PasswordResetRepository();
module.exports = passwordResetRepository;
