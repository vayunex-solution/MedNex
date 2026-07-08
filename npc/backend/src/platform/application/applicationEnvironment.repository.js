'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationEnvironment = require('./applicationEnvironment.model');

class ApplicationEnvironmentRepository extends BaseRepository {
  constructor() {
    super(ApplicationEnvironment);
  }
}

module.exports = new ApplicationEnvironmentRepository();
