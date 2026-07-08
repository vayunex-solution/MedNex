'use strict';

const BaseRepository = require('../../shared/core/base.repository');
const License = require('./license.model');

class LicenseRepository extends BaseRepository {
  constructor() {
    super(License);
  }
}

const licenseRepository = new LicenseRepository();
module.exports = licenseRepository;
