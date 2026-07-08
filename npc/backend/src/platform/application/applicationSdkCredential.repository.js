'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const ApplicationSdkCredential = require('./applicationSdkCredential.model');

class ApplicationSdkCredentialRepository extends BaseRepository {
  constructor() {
    super(ApplicationSdkCredential);
  }
}

module.exports = new ApplicationSdkCredentialRepository();
