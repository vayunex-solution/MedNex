'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationDomain = require('./applicationDomain.model');

class ApplicationDomainRepository extends BaseRepository {
  constructor() {
    super(ApplicationDomain);
  }
}

module.exports = new ApplicationDomainRepository();
