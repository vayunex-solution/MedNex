'use strict';

const BaseService = require('../../shared/core/base.service');
const licenseRepository = require('./license.repository');

class LicenseService extends BaseService {
  constructor() {
    super(licenseRepository);
  }
}

const licenseService = new LicenseService();
module.exports = licenseService;
