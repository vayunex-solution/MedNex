'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationHealth = require('./applicationHealth.model');

class ApplicationHealthRepository extends BaseRepository {
  constructor() {
    super(ApplicationHealth);
  }
}

module.exports = new ApplicationHealthRepository();
