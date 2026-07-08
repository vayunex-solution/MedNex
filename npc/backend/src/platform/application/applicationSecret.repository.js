'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationSecret = require('./applicationSecret.model');

class ApplicationSecretRepository extends BaseRepository {
  constructor() {
    super(ApplicationSecret);
  }
}

module.exports = new ApplicationSecretRepository();
